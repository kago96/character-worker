export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // === SCENE CONTRACT ===
    const contract = {
      required: ["character_id", "scene", "action"],
      optional: ["dialogue"],
      locked_character: true
    };

    for (const field of contract.required) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ error: `Missing field: ${field}` }),
          { status: 400 }
        );
      }
    }

    // === CHARACTER LOCK (sementara hardcoded) ===
    if (body.character_id !== "NARA_001") {
      return new Response(
        JSON.stringify({ error: "Unknown character_id" }),
        { status: 403 }
      );
    }

    // === OUTPUT TERSTRUKTUR (ANTI RANDOM) ===
    return new Response(
      JSON.stringify({
        status: "accepted",
        character_id: body.character_id,
        scene: body.scene,
        action: body.action,
        dialogue: body.dialogue || null,
        note: "Scene contract enforced. Ready for generation engine."
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};