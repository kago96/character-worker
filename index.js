export default {
  async fetch(request, env) {
    // ===== 1. METHOD CHECK =====
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }

    // ===== 2. PARSE BODY =====
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400 }
      );
    }

    const {
      character_id,
      action,
      object = null,
      dialogue = null,
      duration = 5
    } = body;

    // ===== 3. BASIC VALIDATION =====
    if (!character_id || !action) {
      return new Response(
        JSON.stringify({
          error: "character_id and action are required"
        }),
        { status: 400 }
      );
    }

    // ===== 4. SMART SPLIT LOGIC =====

    // Split actions by "lalu"
    const actions = action
      .split(" lalu ")
      .map(a => a.trim())
      .filter(Boolean);

    // Split objects by "dan"
    const objects = object
      ? object.split(" dan ").map(o => o.trim())
      : [];

    const scenes = [];

    for (let i = 0; i < actions.length; i++) {
      scenes.push({
        scene_id: `scene_${i + 1}`,
        character_id,
        action: actions[i],
        object: objects[i] || objects[0] || null,
        dialogue: i === actions.length - 1 ? dialogue : null,
        duration
      });
    }

    // ===== 5. RESPONSE =====
    return new Response(
      JSON.stringify({
        status: "accepted",
        mode: "smart_silent",
        scenes
      }, null, 2),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};