# Uppsala Schackfestival – Teknisk dokumentation

Denna fil dokumenterar hemsidans struktur, vad som gjorts och hur man underhåller sidan inför kommande år.

---

## Teknisk översikt

| Komponent | Teknik |
|---|---|
| Hemsida | Statisk HTML (index.html, resultat.html) |
| Hosting | Vercel (auto-deploy från GitHub vid push) |
| Domän | uppsalachessfestival.se |
| GitHub-repo | https://github.com/carlfjohansson/uppsala-chess-festival |
| API – schackresultat | https://member.schack.se/public/api/v1 |
| Betalningar – kort | Stripe (via /api/checkout.js) |
| Betalningar – Swish/Plusgiro | Manuell bekräftelse via /api/register.js |
| Mejl | Resend (via RESEND_API_KEY i Vercel env) |

### Miljövariabler i Vercel (måste finnas)
- `STRIPE_SECRET_KEY` – Stripe-nyckel (sk_live_...)
- `RESEND_API_KEY` – Resend API-nyckel

---

## Filstruktur

```
/
├── index.html               – Huvudsidan (anmälan, info, turneringsöversikt)
├── resultat.html            – Resultatsida (hämtar från SSF API)
├── success.html             – Visas efter genomförd kortbetalning
├── cancel.html              – Visas om man avbryter kortbetalning
├── privacy.html             – Integritetspolicy
├── DOKUMENTATION.md         – Den här filen
├── Uppsala_Schackfestival_2026_inbjudan.pdf   – Svensk inbjudan
├── Uppsala_Chess_Festival_2026_invitation.pdf – Engelsk inbjudan
├── logo.png, bg-*.jpg etc.  – Grafik
└── api/
    ├── checkout.js          – Skapar Stripe-betalningssession
    ├── confirm.js           – Verifierar Stripe-betalning och skickar bekräftelsemejl
    ├── register.js          – Hanterar Swish/Plusgiro-anmälningar och skickar mejl
    └── search-player.js     – SSF-spelarsökning
```

---

## SSF API-ID:n (2026)

| Turnering | SSF-ID |
|---|---|
| Weekend 1 | 18485 |
| Weekend 2 | 18494 |
| Snabbschack | 18496 |
| Chess960 | 18495 |
| Blixt | 18489 |
| Amatör | 18491 |
| Ungdom – 2006–2008 | 18502 |
| Ungdom – 2009–2011 | 18501 |
| Ungdom – 2012–2014 | 18500 |
| Ungdom – 2015– | 18499 |

### Berger-grupper Weekend 1
Grupp-IDn tilldelas av SSF tätt inpå rond 1. Uppdatera `WEEKEND1_GROUPS`-arrayen i `resultat.html`:

```js
// resultat.html, rad ~184
const WEEKEND1_GROUPS = []; // ← Fyll i SSF-IDs för varje grupp
```

Exempel: `const WEEKEND1_GROUPS = [18510, 18511, 18512, 18513];`

---

## Anmälningsdeadlines

Styr i `index.html` i `DEADLINES`-objektet (i DOMContentLoaded):

```js
const DEADLINES = {
  'Weekend 1':   new Date('2026-08-07T16:00:00+02:00'),
  'Snabbschack': new Date('2026-08-09T23:59:00+02:00'),
  'Chess960':    new Date('2026-08-10T23:59:00+02:00'),
  'Blixt':       new Date('2026-08-11T23:59:00+02:00'),
  'Amatör':      new Date('2026-08-12T23:59:00+02:00'),
  'Weekend 2':   new Date('2026-08-13T23:59:00+02:00'),
  'Ungdom':      new Date('2026-08-15T23:59:00+02:00'),
};
```

När deadline passeras ersätts "Lägg till i varukorg"-knappen automatiskt med en grå "Tävlingen har startat"-knapp.

---

## Hämta anmälningar (kortbetalningar)

Skriptet `hamta_anmalningar.js` hämtar alla bekräftade Stripe-betalningar:

```bash
# I mappen outputs (eller var skriptet ligger):
STRIPE_SECRET_KEY=sk_live_... node hamta_anmalningar.js
```

Swish/Plusgiro-anmälningar skickas per mejl till info@uppsalachessfestival.se.

---

## Turneringsinformation 2026

| Turnering | Datum | Ronder | Betänketid | Avgift |
|---|---|---|---|---|
| Weekend 1 | 7–9 aug | 5 | 90 min + 30 sek/drag | 400 kr |
| Weekend 2 | 14–16 aug | 5 | 90 min + 30 sek/drag | 400 kr |
| Snabbschack | 10 aug kl 17.00 | 7 | 15 min + 5 sek | 200 kr |
| Chess960 | 11 aug kl 17.00 | 7 | 15 min + 5 sek | 200 kr |
| Blixt | 12 aug kl 17.00 | 11 | 3 min + 2 sek | 200 kr |
| Amatör | 13 aug kl 17.00 | 7 | 15 min + 5 sek | 200 kr |
| Ungdom | 16 aug kl 11.00 | 6 | 10 min + 5 sek | 100 kr (gratis USSS-med.) |

---

## Inför nästa år – checklista

### Tidigt (jan–mars)
- [ ] Skapa nya SSF-turneringar och hämta nya ID:n
- [ ] Uppdatera `TOURNAMENTS`-arrayen i **index.html** och **resultat.html** med nya ID:n
- [ ] Uppdatera `PRICES`, `DATES` och `TOURNAMENTS` i **api/register.js** och **api/checkout.js**
- [ ] Uppdatera datum, tider och priser i **index.html** (artikel-korten)
- [ ] Uppdatera `DEADLINES`-objektet i **index.html**
- [ ] Uppdatera `YOUTH_IDS` i **resultat.html** med årets ungdoms-IDs
- [ ] Uppdatera kalenderavsnittet i **index.html** (dagarna 7–16 aug etc.)
- [ ] Uppdatera nedräkningstimern (target-datum) i **index.html**
- [ ] Uppdatera copyright-år i footer
- [ ] Uppdatera PDF-inbjudningarna (svensk + engelsk) och ladda upp dem

### Tätt inpå tävlingsstart
- [ ] Fyll i `WEEKEND1_GROUPS` i **resultat.html** med riktiga SSF-grupp-IDs
- [ ] Gör detsamma för Weekend 2 om Berger-grupper används där också

### Betalningar och anmälningar
- [ ] Plusgiro: 16 13 539-4
- [ ] Swish: 123 138 89 09
- [ ] Stripe-nycklar roteras vid behov i Vercel-miljövariabler
- [ ] Resend-nyckel kontrolleras

---

## Historik – vad som gjordes 2026 (i ordning)

1. **Grundstruktur** – index.html och resultat.html skapades med tvåspråkigt gränssnitt (SV/EN)
2. **SSF API-integration** – resultat.html hämtar startlistor och krysstabeller från member.schack.se
3. **Anmälningssystem** – Stripe, Swish och Plusgiro integrerade; mejl via Resend
4. **Ungdomsgruppsortering** – YOUTH_IDS-ordning rättad (SSF skapar yngsta gruppen först)
5. **Ratingsortering** – standings()-funktionen rättad så att spelarna sorteras korrekt
6. **24-timmarsblixten avbokad** – All info om tävlingen togs bort från index.html, resultat.html och mailchimp-mejl (commit ca4a63e, aug 2026)
7. **Rondantal och Ungdom-datum rättade** – Snabbschack/Chess960 6→7, Amatör 5→7, Ungdom "8–16 aug" → "16 aug kl 11.00" (aug 2026)
8. **Meta description och kalendertext** – "åtta turneringar" → "sju turneringar" (commit 3e51954)
9. **PDF-inbjudningar uppdaterade** – Ny svensk och engelsk PDF med korrekta rondantal laddades upp
10. **Mailchimp-mejl** – Svensk HTML-mall skapad (ucf2026_mailchimp.html)
11. **Stripe-mejl fixat** – confirm.js skapad; mejl skickas nu efter bekräftad betalning, från rätt avsändaradress, med fullständig anmälningsinfo (commit 00d9688)
12. **Anmälningsdeadlines** – Automatisk stängning av anmälan per turnering baserat på datum/tid
13. **Berger-gruppsvy** – Förberedd i resultat.html; fyll i WEEKEND1_GROUPS när SSF-IDs är klara
