export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response(
        "POST only. This endpoint is for AI video generation.",
        { status: 405 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        received: body,
        note: "Worker is running from GitHub source"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};
