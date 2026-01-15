export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* ================================
       UTILITIES
    ================================= */
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { "Content-Type": "application/json" }
      });

    const error = (code, message, status = 400) =>
      json({ status: "error", code, message }, status);

    /* ================================
       METHOD GUARD
    ================================= */
    if (request.method !== "POST") {
      return error("METHOD_NOT_ALLOWED", "Only POST requests are allowed.", 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return error("INVALID_JSON", "Body must be valid JSON");
    }

    /* ================================
       ROUTE: INIT CHARACTER
       POST /character/init
    ================================= */
    if (url.pathname === "/character/init") {
      const { character_id, identity } = body;

      if (!character_id || !identity) {
        return error(
          "INVALID_CHARACTER_PAYLOAD",
          "character_id dan identity wajib diisi"
        );
      }

      await env.CHARACTER_DB.put(character_id, JSON.stringify(identity));

      return json({
        status: "stored",
        character_id,
        note: "Core identity stored and locked in KV."
      });
    }

    /* ================================
       ROUTE: GENERATE SCENES (SMART NORMALIZER)
       POST /scene/generate
    ================================= */
    if (url.pathname === "/scene/generate") {
      const { character_id, scenes } = body;

      if (!character_id || !Array.isArray(scenes)) {
        return error(
          "INVALID_SCENE_PAYLOAD",
          "character_id dan scenes array wajib diisi"
        );
      }

      const identity = await env.CHARACTER_DB.get(character_id);
      if (!identity) {
        return error("CHARACTER_NOT_FOUND", "Character belum diinisialisasi", 404);
      }

      const normalizedScenes = [];

      for (const scene of scenes) {
        const { action, object, dialogue, duration } = scene;

        if (!action || !object) {
          return error(
            "INVALID_SCENE",
            "Setiap scene wajib memiliki action dan object"
          );
        }

        // Smart normalize (AMAN SAJA)
        normalizedScenes.push({
          character_id,
          action: action.trim(),
          object: object.trim(),
          dialogue: dialogue ?? null,
          duration: duration ?? 5,
          rules: {
            max_objects: 1,
            single_character: true,
            human_motion_only: true
          }
        });
      }

      return json({
        status: "accepted",
        mode: "smart_normalizer",
        scenes: normalizedScenes,
        note: "Scenes validated and normalized. Ready for generation engine."
      });
    }

    /* ================================
       FALLBACK
    ================================= */
    return error("NOT_FOUND", "Endpoint tidak ditemukan", 404);
  }
};