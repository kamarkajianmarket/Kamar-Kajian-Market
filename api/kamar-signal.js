export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-kamar-signal-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const rawBody = await readRawBody(req);
    // EA v2.14: permintaan {"kind":"state"} (daftar signal yang sudah dikenal website) dilayani function terpisah,
    // sehingga alur ingest event tidak tersentuh.
    let targetFunction = "kamar-signal-ingest";
    if (/"kind"\s*:\s*"state"/.test(rawBody.toString("utf8").slice(0, 400))) {
      targetFunction = "kamar-signal-state";
    }
      console.log("[kamar-signal proxy] raw body preview:", rawBody.toString("utf8").slice(0, 800));    const response = await fetch(
      "https://moxcqojvtglssftskouj.supabase.co/functions/v1/" + targetFunction,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kamar-signal-key": req.headers["x-kamar-signal-key"] || "",
        },
        body: rawBody,
      }
    );

    const text = await response.text();
      console.log("[kamar-signal proxy] downstream status:", response.status, "body preview:", text.slice(0, 800));    res.setHeader("Content-Type", "application/json");

    return res.status(response.status).send(text);
  } catch (error) {
    console.error("[kamar-signal proxy] fetch to edge function failed:", error);
    return res.status(500).json({
      ok: false,
      message: "Kamar Signal proxy error",
      debug_error_name: error && error.name,
      debug_error_message: error && error.message,
      debug_error_cause: error && error.cause ? String(error.cause) : null,
    });
  }
}
