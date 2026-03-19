import crypto from "crypto";

function signRequest(privateKeyPem, timestamp, method, path) {
  // Strip query parameters from path before signing — Kalshi requirement
  const pathWithoutQuery = path.split("?")[0];
  const message = timestamp + method + pathWithoutQuery;
  
  const sign = crypto.createSign("SHA256");
  sign.update(message);
  sign.end();
  
  return sign.sign(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PSS_PADDING },
    "base64"
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "No path provided" });

  const keyId = process.env.REACT_APP_KALSHI_API_KEY;
  const privateKeyPem = process.env.KALSHI_PRIVATE_KEY;

  if (!keyId || !privateKeyPem) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  try {
    const timestamp = Date.now().toString();
    const method = "GET";
    const fullPath = `/trade-api/v2/${path}`;
    const signature = signRequest(privateKeyPem, timestamp, method, fullPath);

    const url = `https://api.elections.kalshi.com${fullPath}`;
    const response = await fetch(url, {
      headers: {
        "KALSHI-ACCESS-KEY": keyId,
        "KALSHI-ACCESS-TIMESTAMP": timestamp,
        "KALSHI-ACCESS-SIGNATURE": signature,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return res.status(response.status).json(data);
    } catch {
      return res.status(response.status).send(text);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
