// Proxy för SSF:s spelaranmälningslista — undviker CORS
// GET /api/startlist?id=19041
// GET /api/startlist?id=19041&debug=1  (returnerar rå HTML)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const id = parseInt(req.query.id, 10);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Missing id' });

  try {
    const upstream = await fetch(
      `https://member.schack.se/ShowTournamentServlet?id=${id}&listingtype=1`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
        }
      }
    );
    if (!upstream.ok) throw new Error('SSF HTTP ' + upstream.status);
    const html = await upstream.text();

    if (req.query.debug === '1') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(
        `STATUS: ${upstream.status}\nLENGTH: ${html.length}\n\n` +
        html.substring(0, 8000)
      );
    }

    const stripTags = s =>
      s.replace(/<[^>]+>/g, ' ')
       .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
       .replace(/\s+/g, ' ').trim();

    const SKIP = /^(NAMN|KLUBB|RANKING|DISTRIKT|BETALT|AVPRICKAD|NR|#)$/i;

    const players = [];
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRe.exec(html)) !== null) {
      const rawCells = [];
      const re2 = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cm;
      while ((cm = re2.exec(rowMatch[1])) !== null) {
        rawCells.push(stripTags(cm[1]));
      }

      // SSF uses emptycellstyle spacers between every real column — strip them
      const cells = rawCells.filter(c => c.trim() !== '');
      if (cells.length < 3) continue;

      // After filtering: [nr?, name, club, rating, district?, ...]
      let name, club, rating;
      if (/^\d+$/.test(cells[0])) {
        // Row number is first non-empty cell
        name = cells[1]; club = cells[2]; rating = parseInt(cells[3], 10) || 0;
      } else {
        name = cells[0]; club = cells[1]; rating = parseInt(cells[2], 10) || 0;
      }

      // Skip header rows and empty/invalid rows
      if (!name || SKIP.test(name) || rating < 100) continue;

      players.push({ nr: players.length + 1, name, club, rating });
    }

    return res.status(200).json({ id, players });
  } catch (err) {
    console.error('startlist error:', err);
    return res.status(502).json({ error: err.message });
  }
};
