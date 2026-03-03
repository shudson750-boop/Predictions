export default async function handler(req, res) {
  // Allow requests from your app
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "No path provided" });

  try {
    const url = `https://trading-api.kalshi.com/trade-api/v2/${path}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${process.env.REACT_APP_KALSHI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
