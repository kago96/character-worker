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
       ROUTE: GENERATE SCENES
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

        normalizedScenes.push({
          action: action.trim(),
          object: object.trim(),
          dialogue: dialogue ?? null,
          duration: duration ?? 5
        });
      }

      return json({
        status: "accepted",
        scenes: normalizedScenes,
        note: "Scenes validated and normalized."
      });
    }

    /* ================================
       ROUTE: BUILD TIMELINE
       POST /timeline/build
    ================================= */
    if (url.pathname === "/timeline/build") {
      const { character_id, scenes } = body;

      if (!character_id || !Array.isArray(scenes)) {
        return error(
          "INVALID_TIMELINE_PAYLOAD",
          "character_id dan scenes array wajib diisi"
        );
      }

      const identity = await env.CHARACTER_DB.get(character_id);
      if (!identity) {
        return error("CHARACTER_NOT_FOUND", "Character belum diinisialisasi", 404);
      }

      let currentTime = 0;
      const timeline = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const duration =
          typeof scene.duration === "number" && scene.duration > 0
            ? scene.duration
            : 5;

        const start = currentTime;
        let end = start + duration;

        let voice = null;
        if (scene.dialogue) {
          const voiceStart = start + 0.3;
          const voiceEnd = Math.min(end - 0.2, voiceStart + 3);

          if (voiceEnd >= end) end = voiceEnd + 0.2;

          voice = {
            start: voiceStart,
            end: voiceEnd,
            lip_sync: true
          };
        }

        timeline.push({
          scene_index: i + 1,
          start,
          end,
          action: scene.action,
          object: scene.object,
          dialogue: scene.dialogue ?? null,
          voice
        });

        currentTime = end;
      }

      return json({
        status: "ready",
        character_id,
        total_duration: currentTime,
        timeline,
        note: "Timeline built. Safe for voice & video engines."
      });
    }

    /* ================================
       ROUTE: ENGINE PREPARE
       POST /engine/prepare
       (A: ONLY accepts built timeline)
    ================================= */
    if (url.pathname === "/engine/prepare") {
      const { character_id, timeline } = body;

      if (!character_id || !Array.isArray(timeline)) {
        return error(
          "INVALID_ENGINE_PAYLOAD",
          "character_id dan timeline array wajib diisi"
        );
      }

      const identity = await env.CHARACTER_DB.get(character_id);
      if (!identity) {
        return error("CHARACTER_NOT_FOUND", "Character belum diinisialisasi", 404);
      }

      const engineScenes = timeline.map((scene) => ({
        time: { start: scene.start, end: scene.end },
        character: character_id,
        motion: scene.action,
        object: scene.object,
        dialogue: scene.dialogue,
        voice: scene.voice,
        camera: {
          type: "static",
          shot: "medium"
        }
      }));

      return json({
        status: "engine_ready",
        engine: "video_voice_v1",
        character_id,
        scenes: engineScenes,
        note: "Final engine contract generated."
      });
    }

    /* ================================
       FALLBACK
    ================================= */
    return error("NOT_FOUND", "Endpoint tidak ditemukan", 404);
  }
};