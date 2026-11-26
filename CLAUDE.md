# Wendy Fest — project guide for Claude Code

Event platform for the Wendy's Sri Lanka launch ("Wendy Fest"): guest registration by phone, plus two kiosk games, **Scream & Win** and **Roast Me**. One Node/Express server, SQLite, plain HTML/CSS/JS pages (no framework, no build step for the app itself).

Read `docs/HANDOVER.md` first for the current state and the open items. `docs/DESIGN_SYSTEM.md` holds the kiosk design rules. `README.md` covers the product and scoring; `docs/SETUP.md` covers event-day hardware.

## Commands

```bash
npm install
cp .env.example .env            # PINs, BASE_URL, ANTHROPIC_API_KEY, SMS provider
npm start                       # http://localhost:3000  (kiosk PIN 2468, admin PIN 1357 by default)
npm run dev                     # same, restarts on change

node scripts/build-demo.mjs     # static, server-less demo into demo/ (gitignored)
node scripts/kiosk-check.mjs    # browser smoke test of both kiosks on the demo build
node scripts/kiosk-check.mjs --shots docs/screens/check   # same, with screenshots
scripts/publish-demo.sh "what changed"                    # rebuild + push demo to gh-pages
```

The browser scripts need Playwright: `npm i -D playwright && npx playwright install chromium` (do not commit that to `package.json` unless asked; the server image should stay small).

## Layout

```
server/index.js    routes (guest, kiosk, admin APIs)
server/util.js     scream judging, competitor detection, pre-written comebacks  (also embedded in the demo)
server/roast.js    Roast Me: AI prompt + offline roast lines
server/sass.js     Scream & Win: AI comeback (falls back to util.js lines)
server/sms.js, db.js, config.js
public/kiosk/roast.html         Roast Me kiosk (all six screens, styles and script inline)
public/kiosk/scream.html        Scream & Win kiosk — the FINAL blue design
public/kiosk/scream-dark.html   earlier dark design, spare only
public/kiosk/scream-cream.html  one-line redirect to scream.html (old address)
public/_design/*.html           static design mockups (open with ?v=a|b|c)
scripts/                        demo build, checks, mockup generators
docs/screens/                   screenshots and mockup images
```

## How the work is done here

1. **Designs first when asked.** For a visual change the owner usually wants options before anything goes live: build 2–3 mockups, screenshot them, recommend one, wait for the pick. Mockups live in `public/_design/` or are rendered by a script in `scripts/mock-*.mjs`.
2. **Build, then prove it in a browser.** After changing a kiosk page, run `node scripts/kiosk-check.mjs` and look at real screenshots. Do not report a screen as done from reading the code.
3. **Publish only when told.** The owner reviews on the demo link. Pushing to `main` and to `gh-pages` (the demo) each need a go-ahead; "push" from the owner has meant both.
4. **Report plainly.** Say what was tested and what was not (anything needing the AI key or a real microphone/camera usually was not).

## Rules that are easy to break

- **Kiosk pages are fixed canvases.** `roast.html` is 1920×1080 in `--p` units; `scream.html` is 1440×760 in `--u` units. Position with `calc(N * var(--p))` / `var(--u)`, never raw px or vw.
- **Nothing may touch the diagonal white stripe** on Roast Me, and nothing may overlap the divider line on the Scream result. Text that can vary (names, roasts, three languages, comebacks) must be fitted with a shrink loop (`fitConsent`, `fitReveal`, `fitResTitle`), and checked in English, Sinhala and Tamil.
- **Buttons must contrast with what is behind them.** Primary actions are blue with a white outline; red-on-red was rejected three times.
- **Roast wording:** tease a visible thing the guest chose (cap, glasses, shirt colour), in simple words, kindly. Never body, skin, age, gender, religion, ethnicity; never religious or cultural dress. No cricket jargon, bus routes, place in-jokes or internet slang. Rules live in the `SYSTEM` prompt in `server/roast.js`.
- **Competitor comebacks tease the guest, never the other brand.** No claims about another restaurant's food, prices, staff or customers. Rude words are never echoed on screen (`UNSAFE` in `server/util.js`).
- **Consent text** on the Ready? screen is the approved wording split into three rows. Do not shorten or reword it without sign-off; keep Sinhala and Tamil in step.
- **Sinhala/Tamil written by an AI needs a native check** before the event. Flag any new strings.
- **Secrets:** `.env` is gitignored; never commit `ANTHROPIC_API_KEY`, SMS credentials or real PINs.
- **Shared code:** `server/util.js` is copied into the demo by `scripts/build-demo.mjs` (imports and `export` stripped). Keep it dependency-free. Anything the demo needs must live there, not in a file that imports the Anthropic SDK.
- **AI calls** use `@anthropic-ai/sdk` with `config.roast.model` (default `claude-opus-5-5`), structured JSON for roasts, server-side refusal fallback on, and a pre-written fallback for every failure. Keep that fallback path working: the booth must never stall.

## Upright kiosk layout (Roast Me)

The event kiosk is a 1080 x 1920 upright touch screen. `public/kiosk/roast.html` keeps the wide 1920 x 1080 layout and adds an upright one in a single `@media (orientation: portrait)` block at the end of its `<style>`.

- That block is generated. Edit the rules in `scripts/roast-portrait-css.py`, then run `python scripts/roast-portrait-css.py public/kiosk/roast.html`. Do not hand-edit the block.
- `kiosk-check.mjs` only covers the wide layout. For the upright one, walk the flow in a 1080 x 1920 browser window and check English, Sinhala and Tamil.
- Roasts are two short billboard-style lines (8 to 18 words). The English roast can be voiced with ElevenLabs (`server/voice.js`); it needs `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`, and is skipped without them. The voice model is `eleven_v4`, which follows delivery directions in square brackets; the roast writer returns a `voice` script with them, and `speakable()` in `server/voice.js` only uses it when its words match the roast on screen (allowed directions are listed there).

## Kiosk install and the speech check

- Each kiosk page has a web app manifest in `public/assets/*.webmanifest` (kept there so the demo build rewrites the path). `public/js/kiosk.js` shows an "Add to home screen" button on the PIN and station-picker screens only, never to guests. If Chrome does not offer it, use Chrome menu > Add to Home screen.
- Scream & Win also has an upright 1080 x 1920 layout: a generated `@media (orientation: portrait)` block at the end of its `<style>`. Edit `scripts/scream-portrait-css.py` and run `python scripts/scream-portrait-css.py public/kiosk/scream.html`; do not hand-edit the block. `fitText` reads `data-pfit` / `data-pfs` for upright sizes, and `drawLiveA` and `fitResTitle` have their own upright geometry. `kiosk-check.mjs` covers the wide layout only.
- Scream & Win hears the word through Chrome's speech recognition, which needs internet and is unreliable on Android (sessions end early, and the mic may be busy with the loudness meter). The page restarts it during the scream window, and if it errors or hears no words from a loud guest, the host judges instead. The last result is shown in Station settings.

- Upright Scream & Win only (`.up-only` elements, hidden on the wide layout): count ribbon and "On zero, shout" card on the countdown; on the live screen the Shout / Hold it / Finish chips, the stretched WENDYYYY'S word, the Hold it bar and the two info cards. Hold time is how long the voice stays above `HOLD_LINE` in one go; it is shown, with today's longest kept in this kiosk's localStorage, and does NOT change the score. The round is up to 10 s (`SCREAM_DURATION_MS`, also editable in /admin) and ends early once the word is heard and the guest stops.

- Server hearing: when `ELEVENLABS_API_KEY` is set, the kiosk also records the scream and `POST /api/kiosk/hear` (`server/hear.js`, ElevenLabs speech-to-text) returns the words; the page keeps whichever of Chrome or the server heard the word. This exists because Chrome's speech recognition hears nothing on the Android kiosk. No key, an error or a slow answer falls back to Chrome, then the host. `ELEVENLABS_STT_MODEL=off` turns it off.
- Every scream saves a `speech` JSON (route to the host, Chrome errors, clipping, mic, device, server hearing result) in `scream_attempts`; read it before guessing why a word was missed.
- Upright Scream & Win has soft rays behind every screen (`.screen.on::before` in the generator; owner's pick). The wide layout has none.

## Roast card and guest sign-in

- The share card is drawn by `public/js/roast-card.js` (`roastCard(r, lang)`, 1080 x 1920): the guest is cut out of the photo with MediaPipe in the browser (needs internet the first time; a framed photo is used if it fails). The kiosk reveal screen shows it over the older CSS poster, and the guest page uses it for Download and Share. The owner approved: slanted poster, name on a red tape, roast on cream strips with the last line on blue, no dots on the red.
- With `SMS_PROVIDER=console` the sign-up code is shown on the phone (demo mode) until an SMS provider is set. A phone that has registered keeps a one-year cookie; `/register` then opens its pass, and `/register?new=1` signs up someone else.
- Waiting lines and comebacks must not mention Amma or other family members (owner, Nov 2026).

## Branches

- `main` — everything approved.
- `gh-pages` — built demo only (output of `scripts/build-demo.mjs`); never edit by hand.
- Feature work: branch from `main`, merge back when the owner approves.
