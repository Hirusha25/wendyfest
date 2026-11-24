# Wendy Fest · Scream & Win + Roast Me

One platform for the Wendy's Sri Lanka launch activation.

| Surface | URL | Who |
|---|---|---|
| Guest landing / QR target | `/` and `/register` | Guests on their phones |
| Guest pass (profile) | `/p/<token>` (link in SMS) · `/profile` | Guests |
| Roast share page | `/r/<token>` | Guests + whoever they share with |
| Host console | `/kiosk` (PIN) | Staff |
| Scream & Win screen | `/kiosk/scream` | LED wall laptop + kiosk(s) |
| Scream & Win · earlier dark design (same flow) | `/kiosk/scream-dark` | spare, not for the event |
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

- **Loudness** is the loudest *sustained half-second* (mean power over ~30 frames), not a single peak, so a clap or tap can't max it. Mapped `dbFloor → 0`, `dbCeil → 100` (defaults −42/−6). **Calibrate on site** in `/admin`; every mic/interface is different.
- **Clarity** must be "WENDY'S" **with the S**. Chrome's Web Speech API transcript is checked against accepted spellings ("wendys", "wendies", "when these", "wendy is", …). Only the guest's **first attempt** at the word counts. "Wendy" without the S scores at most 40; a word that never gets near it scores at most 25. If speech recognition is unavailable, or "Host judges" is set in kiosk settings, the host picks *Said "Wendy's"* / *Said "Wendy" (no S)* / *Didn't say it*.
- **To win, all three must pass:** overall score ≥ `threshold` (default 75), loudness ≥ `minLoud` (60) and clarity ≥ `minAcc` (70). Score = loudness × 0.6 + clarity × 0.4.
- **Window:** 5 seconds (`durationMs`). The round ends early about a second after the first attempt at the word is heard, and the Live screen shows "Heard it!" or "Missed the S!" straight away.
- All of these are live-editable in `/admin`. The result screen tells the guest why they missed: no S, too quiet, unclear, or close.

## Roast Me engine

`server/roast.js` sends the photo to Claude (`claude-opus-5-5` by default, effort `medium`, server-side refusal fallback on) with a strict JSON schema: observations, vibe, title and roast in `en/si/ta`. The roast picks one or two visible things the guest chose (a cap and its colour, glasses, a shirt), teases that kindly in simple language and turns it into a compliment. The system prompt bans anything about body, skin, age, religion, ethnicity, disability or other unchangeable traits, religious or cultural dress, and references that need explaining (cricket jargon, bus routes, place in-jokes, internet slang). The guest picks a heat (mild, medium, extra spicy) on the camera screen. If there is no API key or the call fails, a pre-written line is used so the booth never stalls.

## Scream & Win comebacks

If a guest shouts something other than "Wendy's", the result screen answers back: a sassy punchline as the big headline and a follow-up line beside it. Other restaurant names get "wrong restaurant" lines; any other words get a line built around what was heard; rude words are never repeated. With an API key the AI writes both lines (`server/sass.js`); otherwise pre-written lines in `server/util.js` are used. Lines tease the guest only and never comment on another brand.

## Coupons

Paste the client's codes into `/admin` (one per line, optional `,label`). Codes are claimed in order, one per win. The label/terms shown on screens and in SMS live in `/admin` too.

## SMS

`SMS_PROVIDER=console` prints to the terminal. Providers wired: `notifylk`, `shoutout`, `dialog` (eSMS, endpoint per account), `http` (generic JSON POST). Sender ID `Wendys` **must be pre-approved** with the gateway/operators (see `docs/REMINDERS.md`).

## Deploy

One container, data on a `/data` volume. One-click: https://render.com/deploy?repo=https://github.com/Hirusha25/wendyfest (then set `BASE_URL` to the service URL). Details in `docs/SETUP.md` → Hosting.

## Files

```
CLAUDE.md  project guide for Claude Code sessions (commands, rules, workflow)
server/    index.js (routes) · db.js (SQLite) · roast.js · sass.js · sms.js · util.js · config.js
public/    guest pages, kiosk/ (roast.html, scream.html, scream-dark.html), admin.html, css/, js/, _design/ (mockups)
data/      wendyfest.sqlite + photos/  (created at runtime, gitignored)
docs/      HANDOVER.md · HANDOVER_PROMPT.md · DESIGN_SYSTEM.md · SETUP.md · REMINDERS.md · EMAIL_DRAFTS.md · screens/
scripts/   build-demo.mjs · publish-demo.sh · kiosk-check.mjs (browser smoke test) · mock-*.mjs (design mockups)
```

Current state and open items: `docs/HANDOVER.md`. Kiosk design rules: `docs/DESIGN_SYSTEM.md`.

## Brand notes

Colours and type follow the Wendy's brand guide (Red #CD2028, Blue #029CD4, Dark Red #A32539, Blush #F2D4D7, Charcoal #493533) and the Gotta Be Wendy's notched-ticket frame. GT Walsheim Ultra Bold / Wendy's Fresh are licensed fonts; the build uses Poppins 900 Italic + Noto Sans Sinhala/Tamil as stand-ins. Swap them in `css/brand.css` (`--display`, `--body`) once the licensed files are available. Logo assets in `public/assets/` were converted from the supplied `HorizLU_FullColor_PMS.pdf`; the cameo is used full-colour on red per the GBW end-card treatment.
