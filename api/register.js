// Serverless function for Swish/PlusGiro registrations.
// Sends a confirmation email to the organizer via Resend.
// Set RESEND_API_KEY in your Vercel environment variables.

const PRICES = {
  'Weekend 1': 400, 'Weekend 2': 400, 'Snabbschack': 200,
  'Chess960': 200, 'Blixt': 200, 'Amatör': 200,
  'Schack dygnet runt': 100, 'Ungdom': 100
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { name, email, club, rating, message, tournaments, paymentMethod, lang } = body;

    if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
    if (!Array.isArray(tournaments) || tournaments.length === 0) return res.status(400).json({ error: 'Select at least one tournament.' });

    const total = tournaments.reduce((s, t) => s + (PRICES[t] || 0), 0);
    const payLabel = paymentMethod === 'swish' ? 'Swish (123 138 89 09)' : 'Plusgiro (16 13 539-4)';

    // Email to organizer
    if (process.env.RESEND_API_KEY) {
      const html = `
        <h2>Ny anmälan – Uppsala Schackfestival 2026</h2>
        <table style="border-collapse:collapse;width:100%;max-width:500px;">
          <tr><td style="padding:8px;color:#666;">Namn</td><td style="padding:8px;font-weight:bold;">${name}</td></tr>
          <tr><td style="padding:8px;color:#666;">E-post</td><td style="padding:8px;">${email}</td></tr>
          <tr><td style="padding:8px;color:#666;">Klubb</td><td style="padding:8px;">${club || '—'}</td></tr>
          <tr><td style="padding:8px;color:#666;">Rating</td><td style="padding:8px;">${rating || '—'}</td></tr>
          <tr><td style="padding:8px;color:#666;">Turneringar</td><td style="padding:8px;">${tournaments.join(', ')}</td></tr>
          <tr><td style="padding:8px;color:#666;">Totalt</td><td style="padding:8px;font-weight:bold;">${total} kr</td></tr>
          <tr><td style="padding:8px;color:#666;">Betalningssätt</td><td style="padding:8px;">${payLabel}</td></tr>
          ${message ? `<tr><td style="padding:8px;color:#666;">Övrigt</td><td style="padding:8px;">${message}</td></tr>` : ''}
        </table>
        <p style="color:#888;font-size:12px;margin-top:16px;">Spelaren har ombetts betala ${total} kr via ${payLabel}.</p>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Uppsala Schackfestival <onboarding@resend.dev>',
          to: ['info@uppsalachessfestival.se'],
          subject: `Ny anmälan (${paymentMethod}): ${name} — ${tournaments.join(', ')}`,
          html
        })
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
