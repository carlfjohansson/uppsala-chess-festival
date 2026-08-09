// Proxy för SSF:s spelaranmälningslista — undviker CORS
// Anropas: GET /api/startlist?id=19041

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const id = parseInt(req.query.id, 10);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Missing id' });

  try {
    const upstream = await fetch(
      `https://member.schack.se/ShowTournamentServlet?id=${id}&listingtype=1`,
      { headers: { 'User-Agent': 'Mozilla/5.0 Uppsala-Chess-Festival/1.0' } }
    );
    if (!upstream.ok) throw new Error('SSF HTTP ' + upstream.status);
    const html = await upstream.text();

    const players = [];
    const stripTags = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

    let rowMatch;
    while ((rowMatch = rowRe.exec(html)) !== null) {
      const cells = [];
      const re2 = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = re2.exec(rowMatch[1])) !== null) {
        cells.push(stripTags(cellMatch[1]));
      }
      // First cell is row number (integer), need at least 4 cols
      if (cells.length >= 4 && /^\d+$/.test(cells[0])) {
        players.push({
          nr:     parseInt(cells[0], 10),
          name:   cells[1] || '',
          club:   cells[2] || '',
          rating: parseInt(cells[3], 10) || 0,
        });
      }
    }

    return res.status(200).json({ id, players });
  } catch (err) {
    console.error('startlist error:', err);
    return res.status(502).json({ error: err.message });
  }
};
