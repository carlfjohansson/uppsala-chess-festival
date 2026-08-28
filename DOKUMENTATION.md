# Uppsala Schackfestival – Teknisk dokumentation

Denna fil dokumenterar hemsidans struktur, vad som gjorts och hur man underhåller sidan inför kommande år.

---

## Teknisk översikt

| Komponent | Teknik |
|---|---|
| Hemsida | Statisk HTML |
| Hosting | Vercel (auto-deploy från GitHub vid push) |
| Domän | uppsalachessfestival.se |
| GitHub-repo | https://github.com/carlfjohansson/uppsala-chess-festival |
| Betalningar – kort | Stripe (via /api/checkout.js) |
| Betalningar – Swish/Plusgiro | Manuell bekräftelse via /api/register.js |
| Mejl | Resend (via RESEND_API_KEY i Vercel env) |
| Resultat | Direktlänkar till SSF (member.schack.se) |
| Anmälningslista | /api/startlist.js (Vercel-proxy mot SSF) |

### Miljövariabler i Vercel (måste finnas)
- `STRIPE_SECRET_KEY` – Stripe-nyckel (sk_live_...)
- `RESEND_API_KEY` – Resend API-nyckel

---

## Filstruktur

```
/
├── index.html               – Huvudsidan (info, turneringsöversikt, anmälan)
├── resultat.html            – Resultatsida (direktlänkar till SSF per grupp)
├── weekend.html             – Uppsala Weekend-sida (höstturneringar)
├── success.html             – Visas efter genomförd kortbetalning
├── cancel.html              – Visas om man avbryter kortbetalning
├── privacy.html             – Integritetspolicy
├── live.html                – Live-visning (Stockfish-analys, PGN-visare)
├── CLAUDE.md                – Regler för Claude (git-kommandon, generella regler)
├── DOKUMENTATION.md         – Den här filen
├── logo.png, nattsol.jpg    – Grafik
└── api/
    ├── checkout.js          – Skapar Stripe-betalningssession
    ├── confirm.js           – Verifierar Stripe-betalning och skickar bekräftelsemejl
    ├── register.js          – Hanterar Swish/Plusgiro-anmälningar och skickar mejl
    ├── startlist.js         – Proxy: hämtar anmälningslista från SSF (undviker CORS)
    └── search-player.js     – SSF-spelarsökning för anmälningsformuläret
```

---

## SSF ID:n 2026

### UCF 2026 – Turneringsgrupper
| Turnering | SSF-ID |
|---|---|
| Weekend 1 (alla grupper 1-8) | 19022–19029 |
| Weekend 2 (alla grupper 1-6) | 19095–19100 |
| Snabbschack | 18496 |
| Chess960 | 18495 |
| Blixt | 18489 |
| Amatör | 18491 |
| Ungdom Minior (2012-2014) | 18502 |
| Ungdom Knatte (2015-) | 18499 |

*Obs: 2006-2008 (18500) och 2009-2011 (18501) skapades men fick inga deltagare.*

### Uppsala Weekend 2026 – Anmälnings-ID (ShowTournamentServlet)
| Turnering | SSF-ID |
|---|---|
| September Weekend | 19041 |
| November Weekend | 19042 |
| December Weekend | 19043 |

---

## SSF API – Viktiga lärdomar

### CORS-problem och lösning
SSF:s `member.schack.se` blockerar requests från webbläsaren (CORS). Lösning: Vercel-proxy i `/api/startlist.js` som hämtar HTML-sidan server-sida och parsar spelarlistan.

### SSF:s HTML-tabellstruktur
SSF använder `emptycellstyle`-celler som visuella spacers mellan varje riktig kolumn. Tabellen ser ut så här:

```
[spacer][nr][spacer][NAMN][spacer][KLUBB][spacer][RATING][spacer][spacer][DISTRIKT]...
```

Parsern i `startlist.js` filtrerar därför bort tomma celler först, sedan hämtas:
- `cells[0]` = radnummer (heltal) om det finns, annars hoppa till `cells[1]`
- `cells[1]` = namn, `cells[2]` = klubb, `cells[3]` = rating

### SSF API vs ShowTournamentServlet
- **Publik API** (`/public/api/v1/tournament/group/id/{id}`) → returnerar metadata, INTE spelarlista
- **ShowTournamentServlet** (`?id={id}&listingtype=1`) → returnerar HTML med spelarlista
- Dessa har OLIKA ID-system. API-ID och Servlet-ID är inte samma.

---

## Betalningar

### Swish/Plusgiro
- **Swish:** 123 138 89 09
- **Plusgiro:** 16 13 539-4
- Anmälningar via Swish/Plusgiro skickar automatiskt mejl till info@uppsalachessfestival.se via `/api/register.js`

### Stripe
- Kortbetalningar hanteras via `/api/checkout.js` → Stripe → `/success.html` → `/api/confirm.js`
- Bekräftelsemejl skickas av `confirm.js` via Resend efter bekräftad betalning

### Priser i register.js och checkout.js
**Viktigt:** Båda filerna måste ha samma turneringsnamn och priser. Om ett nytt turneringsnamn läggs till i frontend-koden måste det också läggas till i `PRICES`-objektet i `register.js` OCH `TOURNAMENTS`-objektet i `checkout.js`. 2026 missades "Sep/Okt/Dec Weekend 2026" i register.js → mejl visade 0 kr totalt.

---

## Resultat-sidan (resultat.html)

### Design 2026
Sidan är avsiktligt enkel: ingen custom resultatvy, bara knappar som öppnar SSF:s egna resultatsidor i ny flik. Fördelar:
- Alltid uppdaterat
- Buggar aldrig
- Enkelt att underhålla

### Struktur
- Helgtävlingar med knappar per grupp (Grupp 1, Grupp 2 ...)
- Övriga tävlingar med en "Resultat"-knapp vardera
- Ungdom med knappar per klass (Minior, Knatte)

### Navigering
Alla SSF-länkar öppnar i `target="_blank"` → UCF-sidan förblir öppen i bakgrunden.

---

## Uppsala Weekend (weekend.html)

Separata höstturneringar med eget anmälningssystem. Samma tekniska stack som UCF. Viktiga detaljer:
- Nav-länk till "Live" är dold tills tävlingsstart (JavaScript-timer)
- Anmälda spelare visas via modal som hämtar data från `/api/startlist`
- Turneringsnamnen i koden är: `'Sep Weekend 2026'`, `'Okt Weekend 2026'`, `'Dec Weekend 2026'`

---

## Generella designregler (CLAUDE.md)

- Inga symboler, emojis eller ikoner
- SSF-ID eller FIDE-ID är obligatoriskt
- Betalning via Stripe, Swish, Plusgiro (inte PayPal)
- Alla priser delas vid lika poäng
- Priser betalas till bankkonto
- Arrangör = Uppsala SSS (inte "Uppsala Schackstadssällskap" eller liknande påhittat)

---

## iCloud FUSE – Känt problem med Git

Repo:t ligger i iCloud-mappen. Bash-miljön (Claude) kan inte ta bort git lock-filer (`HEAD.lock`, `index.lock`) på grund av iCloud FUSE-restriktioner. Om git låser sig:

```bash
rm .git/HEAD.lock .git/index.lock   # Kör i Terminal, inte via Claude
git add -A && git commit -m "..." && git push
```

Git-commit lyckas vanligtvis ändå (trots varningarna om temp-filer), men push måste göras manuellt från Terminal.

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
- [ ] Uppdatera datum i hero-rubriken och hela index.html (7–16 aug → 6–15 aug 2027 etc.)
- [ ] Uppdatera kalenderavsnittet (dagarna) i index.html
- [ ] Skapa nya SSF-turneringar och hämta nya ID:n
- [ ] Uppdatera `TOURNAMENTS`-objekt i **api/checkout.js** med nya namn och datum
- [ ] Uppdatera `PRICES` och `DATES` i **api/register.js** (samma turneringsnamn som checkout.js!)
- [ ] Uppdatera datum, tider och priser i **index.html** (artikel-korten)
- [ ] Uppdatera `DEADLINES`-objektet i **index.html**
- [ ] Uppdatera copyright-år i footer
- [ ] Uppdatera PDF-inbjudningarna (svensk + engelsk) och ladda upp

### Tätt inpå tävlingsstart
- [ ] Uppdatera SSF-grupp-ID:n i **resultat.html** (Weekend 1 och 2 får nya grupp-IDs varje år)
- [ ] Kontrollera att anmälningslistan (startlist.js) fungerar med årets SSF-IDs
- [ ] Aktivera Live-länken i navigationen (ta bort `display:none`)

### Under tävlingen
- [ ] Kolla att anmälda spelare visas korrekt i modal (via startlist.js)
- [ ] Kolla att resultatlänkarna öppnar rätt SSF-grupper

### Efter tävlingen
- [ ] Byt hero-CTA från "Välj turneringar" till "Se resultat"
- [ ] Ta bort anmälningsknapparna från varje turnerings-kort
- [ ] Ta bort anmälningssektionen (#anmalan) och varukorgen
- [ ] Ta bort Live-länken ur navigationen

---

## Historik – vad som gjordes 2026

1. Grundstruktur: index.html och resultat.html med tvåspråkigt gränssnitt (SV/EN)
2. Anmälningssystem: Stripe, Swish, Plusgiro; mejl via Resend
3. SSF spelarsökning i anmälningsformuläret
4. Berger-gruppsvy förberedd och live-sida (live.html) skapad
5. Resultatsidan ersattes med enkel länk-sida till SSF (gammal custom-viewer buggade)
6. CORS-problem med SSF löst via Vercel-proxy (startlist.js)
7. SSF-tabellparser fixad: emptycellstyle-spacers filtreras bort
8. weekend.html skapad för höstturneringarna (September/November/December Weekend)
9. Ungdom: klasser 2006-2008 och 2009-2011 togs bort (inga deltagare), kvarvarande heter Minior och Knatte
10. Festival avslutad: anmälningsknappar borttagna, resultatlänk i hero
