export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      status: "invalid",
      message: "Method not allowed",
    });
  }

  try {
    const response = await fetch(
      "https://moxcqojvtglssftskouj.supabase.co/functions/v1/check-license",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    );

    const text = await response.text();

    res.setHeader("Content-Type", "application/json");

    return res.status(response.status).send(text);
  } catch (error) {
    return res.status(500).json({
      status: "invalid",
      message: "License proxy error",
    });
  }
}
