// Temporary endpoint: fetches standings for all historical weekend groups from SSF
// Delete after use — only needed once to populate results/archive.json

const https = require('https');

function fetchPage(id) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'member.schack.se',
      path: `/ShowTournamentServlet?id=${id}`,
      method: 'GET',
      headers: { 'User-Agent': 'UCF-Archive/1.0' },
      timeout: 10000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ id, html: data, status: res.statusCode }));
    });
    req.on('error', e => resolve({ id, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ id, error: 'timeout' }); });
    req.end();
  });
}

function parseStandings(html) {
  // Parse title
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';

  // Find all <table> elements and look for the standings table
  const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
  let standings = [];

  for (const tableHtml of tableMatches) {
    const rowMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    if (rowMatches.length < 3) continue;

    const candidates = [];
    for (let i = 1; i < rowMatches.length; i++) {
      const row = rowMatches[i];
      const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      const cells = cellMatches
        .map(td => td.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&ouml;/g, 'ö').replace(/&aring;/g, 'å').replace(/&auml;/g, 'ä').trim())
        .filter(t => t !== '');
      if (cells.length < 5) continue;

      const pos = parseInt(cells[0]);
      if (isNaN(pos) || pos < 1 || pos > 50) continue;

      const name = cells[1] ? cells[1].replace(/\s+/g, ' ').trim() : '';
      const club = cells[2] || '';
      const rating = parseInt(cells[3]) || 0;

      let points = null;
      for (let j = cells.length - 1; j >= 4; j--) {
        if (/^\d+\.\d$/.test(cells[j])) { points = parseFloat(cells[j]); break; }
      }
      if (name && points !== null) {
        candidates.push({ pos, name, club, rating, points });
      }
    }
    if (candidates.length >= 2) { standings = candidates; break; }
  }
  return { title, standings };
}

const ALL_GROUPS = [
  // UCF 2026 Weekend 1 (7-9 aug)
  ...Array.from({length:8}, (_,i) => ({ year:2026, event:'UCF Weekend 1', date:'7–9 aug 2026', id:19022+i })),
  // UCF 2026 Weekend 2 (14-16 aug)
  ...Array.from({length:6}, (_,i) => ({ year:2026, event:'UCF Weekend 2', date:'14–16 aug 2026', id:19095+i })),
  // Uppsala Weekend September 2026
  { year:2026, event:'Uppsala Weekend September', date:'11–13 sep 2026', id:19348 },
  { year:2026, event:'Uppsala Weekend September', date:'11–13 sep 2026', id:19349 },
  { year:2026, event:'Uppsala Weekend September', date:'11–13 sep 2026', id:19350 },
  { year:2026, event:'Uppsala Weekend September', date:'11–13 sep 2026', id:19351 },
  // Uppsala Weekend November 2026
  { year:2026, event:'Uppsala Weekend November', date:'6–8 nov 2026', id:19699 },
  { year:2026, event:'Uppsala Weekend November', date:'6–8 nov 2026', id:19700 },
  { year:2026, event:'Uppsala Weekend November', date:'6–8 nov 2026', id:19701 },
  // UCF 2025 Weekend (8-10 aug)
  ...Array.from({length:7}, (_,i) => ({ year:2025, event:'UCF Weekend', date:'8–10 aug 2025', id:16723+i })),
  // UCF 2024 Weekend (9-11 aug)
  ...Array.from({length:8}, (_,i) => ({ year:2024, event:'UCF Weekend', date:'9–11 aug 2024', id:14410+i })),
  // UCF 2023 Weekend (4-6 aug)
  ...Array.from({length:6}, (_,i) => ({ year:2023, event:'UCF Weekend', date:'4–6 aug 2023', id:12126+i })),
  // UCF 2022 Weekend (5-7 aug)
  ...Array.from({length:3}, (_,i) => ({ year:2022, event:'UCF Weekend', date:'5–7 aug 2022', id:10472+i })),
  // UCF 2021 Weekend (13-15 aug)
  ...Array.from({length:6}, (_,i) => ({ year:2021, event:'UCF Weekend', date:'13–15 aug 2021', id:9022+i })),
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const results = [];
  for (const g of ALL_GROUPS) {
    const { html, error } = await fetchPage(g.id);
    if (error) {
      results.push({ ...g, error });
    } else {
      const parsed = parseStandings(html);
      results.push({ ...g, groupTitle: parsed.title, standings: parsed.standings });
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(results));
};
