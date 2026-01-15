export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only POST allowed
    if (request.method !== "POST") {
      return jsonResponse(
        {
          status: "error",
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST requests are allowed."
        },
        405
      );
    }

    try {
      // =========================
      // /character/init
      // =========================
      if (url.pathname === "/character/init") {
        const body = await request.json();

        if (!body.character_id || !body.identity) {
          return errorResponse(
            "INVALID_CHARACTER_PAYLOAD",
            "character_id dan identity wajib diisi."
          );
        }

        const key = `character:${body.character_id}`;

        // Prevent overwrite
        const existing = await env.CHARACTER_DB.get(key);
        if (existing) {
          return errorResponse(
            "CHARACTER_ALREADY_EXISTS",
            "Character dengan ID ini sudah ada dan bersifat immutable."
          );
        }

        await env.CHARACTER_DB.put(key, JSON.stringify(body.identity));

        return jsonResponse({
          status: "stored",
          character_id: body.character_id,
          note: "Core identity stored and locked in KV."
        });
      }

      // =========================
      // /scene/validate
      // =========================
      if (url.pathname === "/scene/validate") {
        const body = await request.json();

        if (!body.character_id || !Array.isArray(body.scenes)) {
          return errorResponse(
            "INVALID_SCENE_PAYLOAD",
            "character_id dan scenes[] wajib diisi."
          );
        }

        // Load character identity
        const charKey = `character:${body.character_id}`;
        const character = await env.CHARACTER_DB.get(charKey);

        if (!character) {
          return errorResponse(
            "CHARACTER_NOT_FOUND",
            "Character belum diinisialisasi."
          );
        }

        const normalizedScenes = [];
        const warnings = [];

        for (let i = 0; i < body.scenes.length; i++) {
          const scene = body.scenes[i];

          // Duration normalization (3–5 sec)
          let duration = scene.duration ?? 4;
          if (duration < 3) duration = 3;
          if (duration > 5) duration = 5;

          // Object validation
          if (!scene.object) {
            return errorResponse(
              "OBJECT_MISSING",
              `Scene ${i + 1} tidak memiliki object aktif.`
            );
          }

          // Dialogue safety
          if (scene.dialogue && scene.dialogue.split(" ").length > 12) {
            warnings.push({
              scene: i + 1,
              code: "DIALOGUE_TOO_LONG",
              message:
                "Dialog terlalu panjang. Pertimbangkan untuk memendekkan atau memecah scene."
            });
          }

          normalizedScenes.push({
            scene_id: scene.scene_id || `scene_${i + 1}`,
            character_id: body.character_id,
            action: scene.action || "idle",
            object: scene.object,
            dialogue: scene.dialogue ?? null,
            duration,
            camera: scene.camera || "medium_static",
            rules: {
              max_objects: 1,
              single_character: true,
              human_motion_only: true
            }
          });
        }

        // Create video_id and store temporarily
        const video_id = `vid_${crypto.randomUUID()}`;
        const ttlSeconds = 60 * 60 * 24; // 24 hours

        await env.CHARACTER_DB.put(
          `video:${video_id}`,
          JSON.stringify({
            character_id: body.character_id,
            scenes: normalizedScenes
          }),
          { expirationTtl: ttlSeconds }
        );

        return jsonResponse({
          status: "accepted",
          video_id,
          scenes: normalizedScenes,
          warnings,
          note: "Scenes validated and stored temporarily. Ready for mock engine."
        });
      }

      // =========================
      // /engine/mock
      // =========================
      if (url.pathname === "/engine/mock") {
        const body = await request.json();

        if (!body.video_id) {
          return errorResponse(
            "VIDEO_ID_REQUIRED",
            "video_id wajib disertakan."
          );
        }

        const videoData = await env.CHARACTER_DB.get(
          `video:${body.video_id}`
        );

        if (!videoData) {
          return errorResponse(
            "VIDEO_NOT_FOUND",
            "Scene plan tidak ditemukan atau sudah kadaluarsa."
          );
        }

        const parsed = JSON.parse(videoData);
        const totalDuration = parsed.scenes.reduce(
          (sum, s) => sum + s.duration,
          0
        );

        return jsonResponse({
          status: "queued",
          video_id: body.video_id,
          character_id: parsed.character_id,
          estimated_duration: totalDuration,
          note: "Mock engine only. No video generated."
        });
      }

      // =========================
      // Unknown route
      // =========================
      return errorResponse(
        "NOT_FOUND",
        "Endpoint tidak ditemukan.",
        404
      );
    } catch (err) {
      return jsonResponse(
        {
          status: "error",
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan internal.",
          detail: err.message
        },
        500
      );
    }
  }
};

// =========================
// Helpers
// =========================
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function errorResponse(code, message, status = 400) {
  return jsonResponse(
    {
      status: "error",
      code,
      message
    },
    status
  );
}