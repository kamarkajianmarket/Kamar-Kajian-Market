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
    const response = await fetch(
      "https://moxcqojvtglssftskouj.supabase.co/functions/v1/kamar-signal-ingest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kamar-signal-key": req.headers["x-kamar-signal-key"] || "",
        },
        body: JSON.stringify(req.body),
      }
    );

    const text = await response.text();

    res.setHeader("Content-Type", "application/json");

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

