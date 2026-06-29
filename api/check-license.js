export default async function handler(req, res) {
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

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({
      status: "invalid",
      message: "License proxy error",
    });
  }
}
