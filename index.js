export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400 }
      );
    }

    // VALIDASI WAJIB
    const required = ["character_id", "scene", "action", "dialogue"];
    for (const key of required) {
      if (!body[key]) {
        return new Response(
          JSON.stringify({ error: `Missing field: ${key}` }),
          { status: 400 }
        );
      }
    }

    // RESPONSE SEMENTARA (BELUM AI)
    return new Response(
      JSON.stringify({
        status: "ok",
        character_id: body.character_id,
        scene: body.scene,
        action: body.action,
        dialogue: body.dialogue,
        note: "Character locked. Ready for generation pipeline."
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};