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

- Roast Me sound: effects (`public/assets/sfx/`) and Wendy's recorded waiting lines (`public/assets/voice/`) are made with ElevenLabs by `node scripts/make-sounds.mjs .env public` (owner: ElevenLabs only for sound, no other source). The page plays them from `<audio>` tags (so the demo build rewrites the paths). While the roast cooks Wendy says recorded lines, then three lines about the guest's photo (`/api/kiosk/roast-lines` returns `audio`), then "Here comes the roast", a drum roll, and the roast in her voice. Scream & Win: Wendy reads the comeback (`sassAudio`), and says a random recorded line on a win (`voice/win-N.mp3`) when the word was right but too quiet (`voice/quiet-N.mp3`), or when the guest said "Wendy" without the S (`voice/nos-N.mp3`).

- Logos: `public/assets/wendys-horiz.svg` (colour), `wendys-horiz-white.svg` (white wordmark for coloured backgrounds), `wendyfest-logo.svg` and `.png` are built from the client's final artwork PDFs by `python scripts/make-logos.py <Wendy's PDF> <Wendy Fest PDF>`. Use the Wendy Fest logo image (`img.wfl`) wherever the event name appears as a logo; the old CSS text lockup is retired.

## Kiosk install and the speech check

- Each kiosk page has a web app manifest in `public/assets/*.webmanifest` (kept there so the demo build rewrites the path). `public/js/kiosk.js` shows an "Add to home screen" button on the PIN and station-picker screens only, never to guests. If Chrome does not offer it, use Chrome menu > Add to Home screen.
- Scream & Win also has an upright 1080 x 1920 layout: a generated `@media (orientation: portrait)` block at the end of its `<style>`. Edit `scripts/scream-portrait-css.py` and run `python scripts/scream-portrait-css.py public/kiosk/scream.html`; do not hand-edit the block. `fitText` reads `data-pfit` / `data-pfs` for upright sizes, and `drawLiveA` and `fitResTitle` have their own upright geometry. `kiosk-check.mjs` covers the wide layout only.
- Scream & Win hears the word through Chrome's speech recognition, which needs internet and is unreliable on Android (sessions end early, and the mic may be busy with the loudness meter). The page restarts it during the scream window, and if it errors or hears no words from a loud guest, the host judges instead. The last result is shown in Station settings.

- Upright Scream & Win only (`.up-only` elements, hidden on the wide layout): count ribbon and "On zero, shout" card on the countdown; on the live screen the Shout / Hold it / Finish chips, the stretched WENDYYYY'S word, the Hold it bar and the two info cards. Hold time is how long the voice stays above `HOLD_LINE` in one go; it is shown, with today's longest kept in this kiosk's localStorage, and does NOT change the score. The round is up to 10 s (`SCREAM_DURATION_MS`, also editable in /admin) and ends early once the word is heard and the guest stops.

- Server hearing: when `ELEVENLABS_API_KEY` is set, the kiosk also records the scream and `POST /api/kiosk/hear` (`server/hear.js`, ElevenLabs speech-to-text) returns the words; the page keeps whichever of Chrome or the server heard the word. This exists because Chrome's speech recognition hears nothing on the Android kiosk. The recording is sent as raw audio at 24 kbps (about 35 KB), up to two times (5 s, then 6 s; a stalled upload is cancelled and sent again), after a tiny `GET /api/ping` that opens the connection. The server logs one line per hearing request. `ELEVENLABS_STT_MODEL=off` turns it off, but then no word is heard on the Android kiosk at all. Background and test plan: `docs/LLD-scream-word-check.md`.
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

## Winner's screen, sounds and the Nov 2026 look

- Scream & Win winner's screen (`#win-new` in `scream.html`): shown only when a coupon was won. Sassy one-line title, score seal on the medallion, the meal picture (`public/assets/spicy-meal.webp`), the prize on a ribbon that bobs and shakes, and one beige coupon with the code and the QR. The prize text is read from the coupon's label by `prizeText()` ("FREE ..." or "50% OFF ..."). Upright positions are the base CSS; the landscape (LED) layout is the `WIN-WIDE` block, which zooms the same pieces. `node scripts/win-screen-shots.mjs <dir> [wide]` screenshots both.
- No host screen (owner): when the word cannot be heard for a technical reason the guest is sent back to the mic check once ("We couldn't hear you") without using their attempt; on a second miss, if the word check itself failed (no answer for the recording), the guest sees "Our ears need a minute" (`#s-miss`), nothing is saved and the attempt is not used (`POST /api/kiosk/miss` only writes a log line); a scream that was checked and had no words is scored as it stands. Never show guests buttons that award a win.
- While the guest shouts, the Listening pill cheers them on by first name (on screen only; nothing is spoken while the mic is scoring).
- Upright countdown: small white "Get ready to" over a big "Scream."; no "On zero, shout" card. Upright live screen: beige step chips, the sound wave on both sides of the meter (`drawLiveA`), three slanted ribbons at the bottom (owner picked "option J").
- Sounds say what the button or moment is (owner: "relevant sounds, not the common ones"): big action buttons power up, Next player drops a coin, colour circles spray, language tabs flick, a ding when the code is complete, pop / stamp / party / ticket on a win, rise and aww on a loss. All made by `scripts/make-sounds.mjs` with ElevenLabs only. No sound may play while the mic is scoring.
- Roast Me: the "Wendy says" card takes the card colour the guest picked (never dark on dark) and keywords are bold and coloured, not underlined. The finished card is drawn while Wendy announces the roast (`prepCard`), so the old poster and the raw photo are never shown first. The cooking screen's photo hangs from the header line on the card's lanyard, and Wendy there is the layered, moving Wendy from the welcome screen.
- The guest's phone roast page (`public/roast.html`) wears the kiosk look: blue header, red stage, white wave, dark lower half, card on a lanyard, colour circles, Download and Share.
- SMS: provider `textware` (TextWare EMG API, form POST, sender `WENDYS`); set `SMS_PROVIDER=textware`, `TEXTWARE_USER`, `TEXTWARE_PASS`. With a real provider the on-screen test code disappears. Drafts of every message are in `docs/SMS_DRAFTS.md`; draft legal text in `docs/PRIVACY_DRAFT.md` and `docs/TERMS_DRAFT.md` (not reviewed by a lawyer).
- Do not commit screenshots or recordings that show a guest's photo (the repo is public).
- Guest code (owner, Nov 2026): 3 numbers then 2 letters, for example `482KT` (`guestCode()` in `server/util.js`). The two letters are always neighbours on the kiosk letter pad or the same letter twice, so codes are easy to type. Both kiosks show a number pad first and switch to letters by themselves; no step chips; Delete sits beside the main button, never in the pad. Both code screens have a Back button to the welcome screen, for a guest who has not registered yet. Three wrong codes lock the pad for 30 seconds. The demo guest is `123AB`.
- Registration asks for one required tick (terms, privacy, photo and voice) and one optional tick (offers); neither is pre-ticked. Email and birthday stay on the form (owner).
- Times are stored in UTC and shown in Sri Lanka time (`slTime`, `slToday`, `SL_DAY_SQL` in `server/util.js`); "per day" always means the Sri Lanka calendar day.
- Roast Me voice guide (owner): on the Ready screen Wendy says the three steps (`voice/steps.mp3`), on the camera screen "Now, pick your heat!" (`voice/heat.mp3`). The kiosk never says "AI" to guests; Wendy writes the roast (the Privacy Statement still discloses the AI provider).
- Lip sync: while Wendy talks, `img.lip` on her drawn face (Ready screen on the wide layout, cooking screen on both) shows one of six mouth frames (`public/assets/lip/mouth-0..5.webp`, made from `roast-wendy.png`), chosen by the loudness of the playing line (Web Audio on `captureStream()`; a made-up rhythm if that is blocked).
- Big action buttons play the menu-page flip (`sfx/start.mp3`, owner's pick of 14 options).
- Wide Roast Me result screen: the card hangs fully on the red side and its swing stays clear of the white stripe; the Scan to save column is narrower. Landscape Scream live screen: Hold it sits above We heard in the same plain style, and the side wave is shorter so it never reaches them.

## Admin page (`/admin`, admin PIN)

- Tabs: Numbers, Guests, Half registered, Links, Settings. One file, `public/admin.html`; data from `/api/admin/stats`, `/api/admin/overview` (`?real=1` leaves out `DEMO_CODES`), `/api/admin/guests` (`q`, `f`, `page`) and `/api/admin/half`.
- "Half registered" = a phone in `otp_requests` with no row in `participants` (asked for a sign-up code, never typed it in). Their numbers are shown masked, because they were never confirmed.
- Every `sendSms()` call passes a kind (`otp`, `welcome`, `win`, `lose`, `roast`), saved in `sms_log.kind`. A new message type needs a kind and a label in `KIND` on the admin page.
- All days and times on the page are Sri Lanka time (`SL_DAY_SQL`, `slTime`). Counts say "people" when they count guests and "screams" or "roasts" when they count tries.
- The demo copy fakes the same routes in `scripts/build-demo.mjs`; add a stub there for any new admin route.

## LED wall and the guest cut-out (Nov 2026)

- `/wall` (`public/wall.html`, kiosk PIN) shows roasts on the LED wall: landscape, one at a time, shuffled, first name only. The look is the owner's landscape "ROASTED." pass template (Nov 2026): a dark card on a blue lanyard, photo left with the name on a red tape, Wendy peeking in the corner, the roast on cream strips with the last line on blue, #RoastedByWendy. It is drawn in a 16:9 box scaled to the screen (sizes in `em`, 1em = 1% of the box width); `strips()` wraps and sizes the roast, `fitName()` the name. No roast title is shown.
- Only roasts approved on the admin page's LED wall tab are shown (`roasts.wall`, `roasts.wall_at`; `/api/wall`, `/api/admin/roasts`, `POST /api/admin/roasts/:token/wall`). Nothing reaches the wall without approval. The tab also pauses the wall and sets seconds per roast (setting `wall`).
- The wall asks `/api/wall` every 20 seconds: a newly approved roast is shown next, a removed one leaves. With nothing approved, or when paused, it shows the holding screen.
- Cut-out (`cutout()` in `public/js/roast-card.js`): two looks with MediaPipe. The first finds the guest in the whole photo; the second looks closely at the head and shoulders, so hair is traced at about three times the detail. Only the main guest is kept (the biggest joined-up shape with a head): background people and a second person standing apart are left out. A head that the camera itself cut off cannot be brought back.
- `roastCard.focus(src)` gives the head box; the wall uses it (`frame()`) to keep the whole head, hair included, inside its photo window.
- Do not commit screenshots of the wall or the card made with real guest photos. Test pictures for docs use drawn placeholder faces.

## Scream & Win: one quick shout (owner, Nov 2026)

- No long hold. The round is 5 seconds at most (`SCREAM_DURATION_MS`) and ends as soon as the guest has shouted and gone quiet for 0.8 s. A guest still mid-shout at zero may finish (up to 1.5 s more). Before this the kiosk made everyone shout for the full 10 seconds, because Chrome hears no words on Android and the old early finish waited for the word.
- Loudness is the loudest 0.6 seconds, measured by time (`SUS_MS`), not by screen frames. That is the "slight hold": full voice for about half a second.
- The recording starts one second before GO and keeps a 0.35 s tail, so the mic waking up never eats the word. A quick shout is about 6 to 11 KB.
- Word check: the recording is sent, and sent again alongside after 1.5 s if no answer has come; the first good answer is used (`hearOnServer`). A loud, clear guest should not be sent back to try again because one upload stalled.
- Difficulty: four levels on the admin Settings tab (`SCREAM_LEVELS` in `server/index.js`): Easy, Medium, Hard, Very hard. Each sets `threshold`, `minLoud` and `dbCeil`. The code defaults are Hard. `/api/admin/scream-levels` counts how many recent clear screams would win at each level (`scream_attempts.sus_db` keeps the loudness in dB for this). Loudness depends on the kiosk's mic level, so the level must be checked at the venue.
- The upright Hold it bar fills in 2.5 seconds (`HOLD_FULL`); the hold time still does not change the score.
- Two drawings on one page must not share colour names (`id`s): the Roast Me result lanyard uses `lyS2...` because the cooking screen's copy is hidden on the wide layout, and a hidden drawing cannot lend its colours (the strap went see-through).

## Coupons and the redeem page (Nov 2026)

- The client's coupon codes are confidential: never commit the file, never print codes in chat or logs. They are imported into `coupons` on the server (code + prize label, in the file's order) and given to winners in that order.
- Test codes (`DEMO_CODES`) never take a real coupon: a win gets a made-up `TEST12345` code with a real prize name.
- `/redeem` (`public/redeem.html`) is for the Wendy's counter team, with its own access code (`REDEEM_PIN`; the admin PIN also opens it, the kiosk PIN does not). They look up a winner's code and mark it redeemed (`coupons.redeemed_at`, `redeemed_note`), with an undo. Only coupons that were won can be looked up or listed; the unused pool is never shown. Eight wrong access codes lock that address out for five minutes.
- A winner sees the code in the win SMS and on their profile; once redeemed the profile says "Redeemed" (English only for now).
- Wide Scream & Win live screen uses the upright screen's three slanted ribbons (cream Hold it, blue We heard, red clock). The Listening bubble is fitted by `sayPill()` so it never reaches the meter's rings: it shrinks, then drops the guest's name.
- "We heard" cannot show words while the guest shouts on the kiosk (Chrome hears nothing there); it shows the word for 0.65 s once the word check answers, then the result.

## Roast tone and code screens (Nov 2026)

- Roast tone (owner: funnier, more sarcastic, "a mix of the current one, A, B and C"): each roast is written in one of four tones, CLASSIC, SASSY, SARCASTIC or SAVAGE, drawn by `pickTone(heat)` in `server/roast.js` (`TONE_MIX`): mild never gets savage, medium gets all four, extra leans savage. The tones are described in the TONE section of `SYSTEM`. Every safety rule (DIPLOMATIC, HARD RULES) applies in every tone: savage means a bigger exaggeration about the thing the guest chose, never a harder insult.
- Both code screens check the code as soon as the fifth character is typed (`autoGo`): a right code moves on by itself, a wrong one shakes and shows why. The Continue / Go button stays.
