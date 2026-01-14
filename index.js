export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    return new Response(
      JSON.stringify({
        success: true,
        received: data
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};