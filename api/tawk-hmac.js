import { createHmac } from 'crypto';

// Kamar Support -- tawk.to Secure Mode signature endpoint.
// Generates an HMAC-SHA256 hash of the visitor's email using the tawk.to
// Property "API Key" (kept server-side only, never sent to the browser).
//
// Required environment variable (set in Vercel Project Settings -> Environment Variables):
//   TAWK_API_KEY = the API Key from tawk.to Dashboard -> Administration -> Property Settings -> Security
//
// If TAWK_API_KEY is not configured yet, this endpoint returns { hash: null } so the
// live chat widget still loads normally (without Secure Mode) instead of failing.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  var apiKey = process.env.TAWK_API_KEY;
  if (!apiKey) {
    res.status(200).json({ hash: null });
    return;
  }

  var body = req.body || {};
  var email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email) {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  try {
    var hash = createHmac('sha256', apiKey).update(email).digest('hex');
    res.status(200).json({ hash: hash });
  } catch (e) {
    res.status(200).json({ hash: null });
  }
}
