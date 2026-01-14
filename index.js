export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }

    const body = await request.json();

    // MODE: CREATE CHARACTER (SEKALI)
    if (body.mode === "create_character") {
      const exists = await env.CHAR_DB.get(body.character_id);
      if (exists) {
        return new Response(
          JSON.stringify({ error: "Character already exists" }),
          { status: 409 }
        );
      }

      await env.CHAR_DB.put(
        body.character_id,
        JSON.stringify({
          visual: "locked",
          voice: "locked",
          motion: "locked"
        })
      );

      return new Response(
        JSON.stringify({ status: "character_created" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // MODE: GENERATE VIDEO
    const character = await env.CHAR_DB.get(body.character_id);
    if (!character) {
      return new Response(
        JSON.stringify({ error: "Unknown character_id" }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({
        status: "accepted",
        character_id: body.character_id,
        scene: body.scene,
        action: body.action,
        dialogue: body.dialogue || null,
        character_profile: JSON.parse(character),
        note: "Character loaded from KV. Ready for generation engine."
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};