export default {
  async fetch(request, env) {
    // ===============================
    // 1. METHOD CHECK
    // ===============================
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }

    // ===============================
    // 2. PARSE JSON BODY
    // ===============================
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
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

    // ===============================
    // 3. BASIC VALIDATION
    // ===============================
    if (!character_id || !action) {
      return new Response(
        JSON.stringify({
          error: "character_id and action are required"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ===============================
    // 4. SMART SPLIT (SCENE CONTRACT)
    // ===============================

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
    let currentObject = null;

    for (let i = 0; i < actions.length; i++) {
      const actionText = actions[i];

      // Detect object mentioned inside action text
      const detectedObject = objects.find(obj =>
        actionText.includes(obj)
      );

      if (detectedObject) {
        currentObject = detectedObject;
      }

      scenes.push({
        scene_id: `scene_${i + 1}`,
        character_id,
        action: actionText,
        object: currentObject,
        dialogue: i === actions.length - 1 ? dialogue : null,
        duration
      });
    }

    // ===============================
    // 5. IDENTITY INJECTOR (LOCKED)
    // ===============================

    // Temporary hardcoded identity (later moved to KV)
    const identity = {
      gender: "female",
      age_range: "mid 20s",
      ethnicity: "Indonesian",
      appearance: "oval face, small mole on nose, hijab earth tones",
      motion_style: "calm, natural, gentle gestures",
      voice: {
        tone: "warm",
        speed: "normal",
        pitch: "soft"
      }
    };

    const enrichedScenes = scenes.map(scene => ({
      ...scene,
      character: {
        id: character_id,
        identity
      }
    }));

    // ===============================
    // 6. FINAL RESPONSE
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
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};