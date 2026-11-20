// Proxy endpoint: fetches and parses standings from member.schack.se
// Usage: GET /api/results?id=19022
// Returns: { title, players: [{pos, name, club, rating, points}] }

const https = require('https');

function fetchPage(id) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'member.schack.se',
      path: `/ShowTournamentServlet?id=${encodeURIComponent(id)}`,
      method: 'GET',
      headers: { 'User-Agent': 'UCF-Site/1.0', Accept: 'text/html' },
      timeout: 12000,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function decode(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&aring;/g, 'å')
    .replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Aring;/g, 'Å')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseStandings(html) {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? decode(titleMatch[1]) : '';

  // Find all tables (skip first which is navigation)
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  let tableIdx = 0;

  while ((tableMatch = tableRe.exec(html))) {
    tableIdx++;
    if (tableIdx < 2) continue;

    const tableHtml = tableMatch[1];
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    const rows = [];

    while ((rowMatch = rowRe.exec(tableHtml))) {
      const cells = [];
      const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRe.exec(rowMatch[1]))) {
        const text = decode(cellMatch[1]);
        if (text) cells.push(text);
      }
      if (cells.length) rows.push(cells);
    }

    // Try to parse as standings: pos | name | club | rating | ... | points
    const players = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      if (cells.length < 5) continue;
      const pos = parseInt(cells[0]);
      if (isNaN(pos) || pos < 1 || pos > 60) continue;
      const name = cells[1].replace(/\s+/g, ' ').trim();
      const club = cells[2] || '';
      const rating = /^\d{3,4}$/.test(cells[3]) ? parseInt(cells[3]) : 0;
      let points = null;
      for (let j = cells.length - 1; j >= 4; j--) {
        if (/^\d+\.\d$/.test(cells[j])) { points = parseFloat(cells[j]); break; }
      }
      if (name && points !== null) {
        players.push({ pos, name, club, rating, points });
      }
    }

    if (players.length >= 2) {
      return { title, players };
    }
  }

  return { title, players: [] };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const id = parseInt(req.query && req.query.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Missing or invalid id' });
  }

  try {
    const html = await fetchPage(id);
    const result = parseStandings(html);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};
