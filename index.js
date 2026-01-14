export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const {
      character_id,
      action,
      object = null,
      dialogue = null,
      duration = 5
    } = body;

    if (!character_id || !action) {
      return new Response(
        JSON.stringify({ error: "character_id and action are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ===============================
    // SCENE CONTRACT (SMART SPLIT)
    // ===============================

    const actions = action.split(" lalu ").map(a => a.trim());
    const objects = object ? object.split(" dan ").map(o => o.trim()) : [];

    const scenes = [];
    let currentObject = null;

    for (let i = 0; i < actions.length; i++) {
      const text = actions[i];
      const detected = objects.find(obj => text.includes(obj));
      if (detected) currentObject = detected;

      scenes.push({
        scene_id: `scene_${i + 1}`,
        action: text,
        object: currentObject,
        dialogue: i === actions.length - 1 ? dialogue : null,
        duration
      });
    }

    // ===============================
    // IDENTITY INJECTOR (FROM KV)
    // ===============================

    const identityRaw = await env.CHARACTER_DB.get(character_id);

    if (!identityRaw) {
      return new Response(
        JSON.stringify({ error: "Character identity not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const identity = JSON.parse(identityRaw);

    const enrichedScenes = scenes.map(scene => ({
      ...scene,
      character: {
        id: character_id,
        identity
      }
    }));

    // ===============================
    // RESPONSE
    // ===============================

    return new Response(
      JSON.stringify(
        {
          status: "accepted",
          mode: "smart_silent",
          scenes: enrichedScenes
        },
        null,
        2
      ),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};