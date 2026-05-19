// Serverless function for Stripe Checkout — works on Vercel and Netlify (with @netlify/functions wrapper).
// Set the STRIPE_SECRET_KEY environment variable in your hosting dashboard.
// Use a "test" key (sk_test_…) while developing, switch to "live" (sk_live_…) when ready.

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Prices in öre (SEK * 100). Edit here if amounts change.
const TOURNAMENTS = {
  'Weekend 1':           { name: 'Weekend 1 — 7–9 augusti',           amount: 40000 },
  'Weekend 2':           { name: 'Weekend 2 — 14–16 augusti',         amount: 40000 },
  'Snabbschack':         { name: 'Snabbschack — 10 augusti',          amount: 20000 },
  'Chess960':            { name: 'Chess960 — 11 augusti',             amount: 20000 },
  'Blixt':               { name: 'Blixt — 12 augusti',                amount: 20000 },
  'Amatör':              { name: 'Amatör — 13 augusti',               amount: 20000 },
  'Schack dygnet runt':  { name: 'Schack dygnet runt — 14–15 aug',    amount: 10000 },
  'Ungdom':              { name: 'Ungdom — 16 augusti',               amount: 10000 }
};

module.exports = async (req, res) => {
  // CORS headers (handy if site is hosted on a different domain than the API)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured on the server.' });
  }

  try {
    // Vercel parses JSON automatically; for other platforms parse manually if needed.
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { name, email, club, rating, message, tournaments, lang } = body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      return res.status(400).json({ error: 'Select at least one tournament.' });
    }

    // Build line items, ignoring anything we don't know about.
    const lineItems = tournaments
      .filter(t => TOURNAMENTS[t])
      .map(t => ({
        price_data: {
          currency: 'sek',
          product_data: { name: TOURNAMENTS[t].name },
          unit_amount: TOURNAMENTS[t].amount
        },
        quantity: 1
      }));

    if (lineItems.length === 0) {
      return res.status(400).json({ error: 'No valid tournaments selected.' });
    }

    // Origin used to build success/cancel URLs. Falls back to the request host.
    const origin =
      req.headers.origin ||
      (req.headers['x-forwarded-host']
        ? `https://${req.headers['x-forwarded-host']}`
        : `https://${req.headers.host}`);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: email,
      locale: lang === 'en' ? 'en' : 'sv',
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel.html`,
      metadata: {
        name: name.slice(0, 480),
        club: (club || '').slice(0, 480),
        rating: (rating || '').slice(0, 100),
        tournaments: tournaments.join(', ').slice(0, 480),
        message: (message || '').slice(0, 480)
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
