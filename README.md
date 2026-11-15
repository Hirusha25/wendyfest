# Wendy Fest · Scream & Win + Roast Me

One platform for the Wendy's Sri Lanka launch activation.

| Surface | URL | Who |
|---|---|---|
| Guest landing / QR target | `/` and `/register` | Guests on their phones |
| Guest pass (profile) | `/p/<token>` (link in SMS) · `/profile` | Guests |
| Roast share page | `/r/<token>` | Guests + whoever they share with |
| Host console | `/kiosk` (PIN) | Staff |
| Scream & Win screen | `/kiosk/scream` | LED wall laptop + kiosk(s) |
| Scream & Win · Studio Cream (light skin, same flow) | `/kiosk/scream-cream` | alternative look |
| Roast Me screen | `/kiosk/roast` | Roast kiosk with webcam |
| Admin | `/admin` (PIN) | You |

## Run it

```bash
cd wendyfest
cp .env.example .env     # fill in ANTHROPIC_API_KEY, SMS provider, BASE_URL
npm install
npm start
```

Open `http://localhost:3000`. Default PINs: kiosk `2468`, admin `1357` (change in `.env`).

## Guest journey

1. Guest scans the big QR → `/register` → name, mobile, email (optional), date of birth, language.
2. A 4-digit OTP is sent by SMS (2-minute expiry, 30-second resend, 5 attempts). On verify, the server creates a 6-letter entry code (no 0/O/1/I), sends a welcome SMS with the code + pass link, and shows the entry pass on screen.
3. Guest tells the host the code at either kiosk. Host types it (on-screen keypad or keyboard).
4. **Scream & Win:** 3-2-1 → 3-second scream window → score = 60% peak loudness + 40% "Wendy's" clarity (speech recognition). Score ≥ 70 wins → next unused coupon from the pool is claimed, SMS'd, shown on screen with a QR to their profile.
5. **Roast Me:** consent screen (EN/සිං/தமிழ்) → webcam countdown → Claude looks at the photo → roast in all three languages → QR to `/r/<token>` where they download a 1080×1350 card or share.
6. Profile shows badges (Screamer / Winner / Roasted), score, reward code, roast, and a downloadable/shareable card.

## Scoring details (Scream & Win)

- Loudness: peak RMS dBFS during the window, mapped `dbFloor → 0`, `dbCeil → 100` (defaults −42/−6). **Calibrate on site** in `/admin`; every mic/interface is different.
- Clarity: Chrome's Web Speech API transcript vs a phonetic bank ("wendys", "when these", "windies", …). Needs Chrome and internet. If unavailable, or if you set "Host judges" in the kiosk gear menu, the host picks Clear / Close / Nope after each scream.
- Weights, threshold, window length and attempts-per-guest are live-editable in `/admin`.

## Roast Me engine

`server/roast.js` sends the photo to Claude (`claude-opus-5-5`, adaptive thinking, effort `medium`, server-side refusal fallback on) with a strict JSON schema: observations, vibe, title and roast in `en/si/ta`. The system prompt bans anything about body, skin, age, religion, ethnicity, disability or other unchangeable traits and steers to outfit, accessories, pose, expression and Sri Lankan references. Without an API key, or on any error, a local fallback bank keeps the booth running (flagged in admin).

## Coupons

Paste the client's codes into `/admin` (one per line, optional `,label`). Codes are claimed in order, one per win. The label/terms shown on screens and in SMS live in `/admin` too.

## SMS

`SMS_PROVIDER=console` prints to the terminal. Providers wired: `notifylk`, `shoutout`, `dialog` (eSMS, endpoint per account), `http` (generic JSON POST). Sender ID `Wendys` **must be pre-approved** with the gateway/operators (see `docs/REMINDERS.md`).

## Deploy

One container, data on a `/data` volume. One-click: https://render.com/deploy?repo=https://github.com/Hirusha25/wendyfest (then set `BASE_URL` to the service URL). Details in `docs/SETUP.md` → Hosting.

## Files

```
server/   index.js (routes) · db.js (SQLite) · roast.js · sms.js · util.js · config.js
public/   guest pages, kiosk/, admin.html, css/brand.css (brand system), js/
data/     wendyfest.sqlite + photos/  (created at runtime, gitignored)
docs/     SETUP.md · REMINDERS.md · EMAIL_DRAFTS.md · screens/ (screenshots)
scripts/  screenshots.mjs (Playwright visual check)
```

## Brand notes

Colours and type follow the Wendy's brand guide (Red #CD2028, Blue #029CD4, Dark Red #A32539, Blush #F2D4D7, Charcoal #493533) and the Gotta Be Wendy's notched-ticket frame. GT Walsheim Ultra Bold / Wendy's Fresh are licensed fonts; the build uses Poppins 900 Italic + Noto Sans Sinhala/Tamil as stand-ins. Swap them in `css/brand.css` (`--display`, `--body`) once the licensed files are available. Logo assets in `public/assets/` were converted from the supplied `HorizLU_FullColor_PMS.pdf`; the cameo is used full-colour on red per the GBW end-card treatment.
