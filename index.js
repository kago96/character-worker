// ==========================
// 1. UTILITIES
// ==========================
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function parseJSON(request) {
  try {
    return request.json();
  } catch {
    return null;
  }
}

// ==========================
// 2. PROMPT BUILDER (ENGINE-AGNOSTIC)
// ==========================
function buildScenePrompt(scene) {
  return {
    character_id: scene.character_id,
    action: scene.action,
    object: scene.object,
    dialogue: scene.dialogue,
    duration: scene.duration,
    rules: {
      max_objects: 1,
      human_motion_only: true,
      single_character: true
    }
  };
}

// ==========================
// 3. WORKER ENTRY POINT
// ==========================
export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return jsonResponse({ error: "POST only" }, 405);
    }

    const body = await parseJSON(request);
    if (!body || !Array.isArray(body.scenes)) {
      return jsonResponse({ error: "Invalid scene format" }, 400);
    }

    const processedScenes = body.scenes.map(scene => buildScenePrompt(scene));

    return jsonResponse({
      status: "accepted",
      mode: body.mode || "smart",
      scenes: processedScenes,
      note: "Scenes validated and normalized. Ready for engine."
    });
  }
};