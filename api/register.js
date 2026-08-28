const PRICES = {
  'Weekend 1': 400, 'Weekend 2': 400, 'Snabbschack': 200,
  'Chess960': 200, 'Blixt': 200, 'Amatör': 200,
  'Ungdom': 100,
  'Sep Weekend 2026': 400, 'Okt Weekend 2026': 400, 'Dec Weekend 2026': 400,
};

const DATES = {
  'Weekend 1': '7–9 augusti 2026',
  'Weekend 2': '14–16 augusti 2026',
  'Snabbschack': '10 augusti 2026, kl. 17.00',
  'Chess960': '11 augusti 2026, kl. 17.00',
  'Blixt': '12 augusti 2026, kl. 17.00',
  'Amatör': '13 augusti 2026, kl. 17.00',
  'Ungdom': '16 augusti 2026, kl. 11.00'
};

async function sendEmail(apiKey, to, subject, html) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Uppsala Schackfestival <info@uppsalachessfestival.se>',
      to: [to],
      subject,
      html
    })
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error('Resend error:', err);
  }
}

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
    const payLabel = paymentMethod === 'swish' ? 'Swish: 123 138 89 09' : 'Plusgiro: 16 13 539-4';
    const isEn = lang === 'en';
    const WEEKEND_KEYS = ['Sep Weekend 2026', 'Okt Weekend 2026', 'Dec Weekend 2026'];
    const isWeekend = tournaments.some(t => WEEKEND_KEYS.includes(t));
    const eventName = isWeekend ? 'Uppsala Weekend Schack 2026' : 'Uppsala Schackfestival 2026';
    const eventNameEn = isWeekend ? 'Uppsala Weekend Chess 2026' : 'Uppsala Chess Festival 2026';

    if (process.env.RESEND_API_KEY) {

      // ── Mejl till arrangören ──────────────────────────────────────
      const organizerHtml = `
        <div style="font-family:sans-serif;max-width:560px;color:#222;">
          <h2 style="color:#b85a2e;">Ny anmälan – ${eventName}</h2>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;">Namn</td><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">${name}</td></tr>
            <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;">E-post</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${email}</td></tr>
            <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;">Klubb</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${club || '—'}</td></tr>
            <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;">FIDE-ID</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${rating || '—'}</td></tr>
            <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;">Turneringar</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${tournaments.join(', ')}</td></tr>
            <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;">Totalt</td><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">${total} kr</td></tr>
            <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;">Betalningssätt</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${payLabel}</td></tr>
            ${message ? `<tr><td style="padding:8px 12px;color:#666;">Övrigt</td><td style="padding:8px 12px;">${message}</td></tr>` : ''}
          </table>
          <p style="color:#888;font-size:12px;margin-top:16px;">Spelaren har ombetts betala ${total} kr via ${payLabel}.</p>
        </div>`;

      // ── Bekräftelsemejl till spelaren ─────────────────────────────
      const tournamentRows = tournaments.map(t => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #2a3a52;color:#c9bfa8;">${t}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #2a3a52;color:#c9bfa8;">${DATES[t] || ''}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #2a3a52;color:#f5cb6b;text-align:right;">${PRICES[t] || 0} kr</td>
        </tr>`).join('');

      const playerHtml = `
        <div style="font-family:sans-serif;background:#0f1722;color:#f5ecd9;padding:40px 0;">
          <div style="max-width:560px;margin:0 auto;background:#1d2a3d;border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#f5cb6b,#e08a3c);padding:28px 32px;">
              <div style="font-size:1.8rem;font-weight:bold;color:#0f1722;">${isWeekend ? 'Uppsala Weekend Schack' : 'Uppsala Schackfestival'}</div>
              <div style="color:#0f1722;opacity:0.8;margin-top:6px;">${isWeekend ? '' : '7–16 augusti 2026'}</div>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#f5cb6b;margin:0 0 8px;">${isEn ? 'Registration confirmed!' : 'Anmälan mottagen!'}</h2>
              <p style="color:#c9bfa8;margin:0 0 24px;">${isEn ? `Hi ${name}, we have received your registration.` : `Hej ${name}, vi har tagit emot din anmälan.`}</p>

              <h3 style="color:#f5ecd9;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">${isEn ? 'Your tournaments' : 'Dina turneringar'}</h3>
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <thead>
                  <tr style="border-bottom:1px solid #e8b552;">
                    <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#8e8674;text-transform:uppercase;">${isEn ? 'Tournament' : 'Turnering'}</th>
                    <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#8e8674;text-transform:uppercase;">${isEn ? 'Date' : 'Datum'}</th>
                    <th style="padding:8px 12px;text-align:right;font-size:0.75rem;color:#8e8674;text-transform:uppercase;">${isEn ? 'Fee' : 'Avgift'}</th>
                  </tr>
                </thead>
                <tbody>${tournamentRows}</tbody>
              </table>

              <div style="background:#243349;border-radius:10px;padding:16px 20px;margin-bottom:24px;display:flex;justify-content:space-between;">
                <span style="color:#8e8674;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.08em;">${isEn ? 'Total to pay' : 'Totalt att betala'}</span>
                <span style="color:#f5cb6b;font-size:1.4rem;font-weight:bold;">${total} kr</span>
              </div>

              <div style="background:#182434;border:1px solid rgba(232,181,82,0.3);border-radius:10px;padding:20px 24px;margin-bottom:24px;">
                <h3 style="color:#f5cb6b;margin:0 0 12px;font-size:1rem;">${isEn ? 'Payment instructions' : 'Betalningsinstruktioner'}</h3>
                <p style="color:#c9bfa8;margin:0 0 8px;font-size:0.95rem;">
                  ${paymentMethod === 'swish'
                    ? (isEn ? 'Please pay via <strong>Swish: 123 138 89 09</strong>' : 'Betala via <strong>Swish: 123 138 89 09</strong>')
                    : (isEn ? 'Please pay via <strong>PlusGiro: 16 13 539-4</strong>' : 'Betala via <strong>Plusgiro: 16 13 539-4</strong>')}
                </p>
                <p style="color:#8e8674;margin:0;font-size:0.85rem;">
                  ${isEn
                    ? `Amount: <strong style="color:#f5cb6b;">${total} kr</strong>. Please include your name and the tournament(s) as the payment reference.`
                    : `Belopp: <strong style="color:#f5cb6b;">${total} kr</strong>. Ange ditt namn och turneringen/turneringarna som meddelande.`}
                </p>
              </div>

              <p style="color:#8e8674;font-size:0.85rem;margin:0;">
                ${isEn
                  ? 'Questions? Email us at <a href="mailto:info@uppsalachessfestival.se" style="color:#f5cb6b;">info@uppsalachessfestival.se</a>'
                  : 'Frågor? Mejla oss på <a href="mailto:info@uppsalachessfestival.se" style="color:#f5cb6b;">info@uppsalachessfestival.se</a>'}
              </p>
            </div>
            <div style="padding:20px 32px;border-top:1px solid #2a3a52;text-align:center;color:#8e8674;font-size:0.8rem;">
              Uppsala Skolschacksällskap · Uppsala Schackcentrum · Ekeby Bruk 6L
            </div>
          </div>
        </div>`;

      await Promise.all([
        sendEmail(process.env.RESEND_API_KEY, 'info@uppsalachessfestival.se',
          `Ny anmälan (${paymentMethod}): ${name} — ${tournaments.join(', ')}`,
          organizerHtml),
        sendEmail(process.env.RESEND_API_KEY, email,
          isEn ? `Registration confirmed — ${eventNameEn}` : `Anmälningsbekräftelse – ${eventName}`,
          playerHtml)
      ]);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
