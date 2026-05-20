export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { fornamn, efternamn } = req.query;

  if (!efternamn) {
    return res.status(400).json({ error: 'efternamn is required' });
  }

  // If no fornamn given, try with a single space — the SSF API may return
  // all players with that last name regardless of first name.
  const fn = fornamn && fornamn.trim() ? fornamn.trim() : ' ';
  const url = `https://member.schack.se/public/api/v1/player/fornamn/${encodeURIComponent(fn)}/efternamn/${encodeURIComponent(efternamn.trim())}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'SSF API error', status: response.status });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
