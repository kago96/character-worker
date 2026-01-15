// ==========================
// UTIL
// ==========================
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// ==========================
// CORE IDENTITY (STATIC FOR MVP)
// ==========================
const NARA_IDENTITY = {
  character_id: "NARA_001",
  immutable: {
    gender: "female",
    age_range: "23-25",
    face: {
      shape: "oval",
      skin_tone: "light",
      key_marker: "mole_on_right_nose"
    },
    body: {
      height: "average",
      posture: "relaxed"
    },
    voice: {
      tone: "warm",
      speed: "normal",
      pitch: "medium"
    },
    persona: {
      vibe: "calm_friendly",
      energy: "soft"
    }
  },
  mutable: {
    wardrobe: ["hijab", "top", "outer"],
    accessories: ["glasses", "watch"],
    allowed_objects: ["coffee", "book", "phone"],
    allowed_locations: ["cafe", "park", "indoor"]
  }
};

// ==========================
// WORKER
// ==========================
export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return jsonResponse({ error: "POST only" }, 405);
    }

    // Simpan identity ke KV
    await env.CHARACTER_DB.put(
      "CHARACTER:NARA_001",
      JSON.stringify(NARA_IDENTITY)
    );

    // Ambil ulang untuk verifikasi
    const stored = await env.CHARACTER_DB.get("CHARACTER:NARA_001", "json");

    return jsonResponse({
      status: "stored",
      character_id: "NARA_001",
      identity: stored,
      note: "Core identity stored and locked in KV."
    });
  }
};