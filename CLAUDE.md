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
- LED wall colours (owner): the same pass in four colours, `dark`, `blue`, `red` and `paper` (`.t-*` rules in `public/wall.html`), changed at random from roast to roast; all four are used before one repeats. The stage turns blue behind the red pass. `/wall?theme=blue` holds one colour for checking. Guests do not choose the colour.
- LED wall details (owner): "ROASTED." leans with the slanted band (`.roasted { rotate }`). Wendy in the corner is `roast-wendy.png`, which is a crop: it is mirrored so the cut side and bottom hide under the card's edge, and a mask rounds the flat top of her hair before the white outline is drawn.
- Roast card colour (owner, Nov 2026): the card starts beige (`paper`) on the kiosk, the phone page and in `roast-card.js`; this replaces the earlier dark default. Until the guest picks a colour, the circles take turns to press and pop (`.swatch.hint`, `swTap`) so it is clear they can be tapped.
- LED wall slideshow (owner): the pass on screen unhooks and falls away (`passOut`), then the next one drops in on its lanyard and bounces (`passIn`); a thin bar along the bottom shows the time left. With only one roast approved it simply stays up.
- Roast Me is always on an upright kiosk at the event (owner, Nov 2026); the wide Roast Me layout is kept working but is not the one to polish. Scream & Win runs on both the upright kiosk and the wide LED screen.
- Messages on the code screens must fit one line (a second line hides under the upright keypad): keep them under about 45 characters.
- LED wall photo backdrops (owner, Nov 2026): the guest is cut out of their photo (`roastCard.cut`) and placed on a backdrop picture supplied by the owner, one or more per card colour, in `public/assets/wall-bg/` and listed in `BACKS` in `public/wall.html` (1600 x 1540, no people or text, bottom fifth plain). A card colour with no picture shows the photo as taken. `?bg=all` shows the first picture on every card colour; `?bg=a` to `f` are earlier drawn options kept for comparison.
- Roast Me photo: captured at the camera's own sharpness up to 1600 wide (camera asked for full HD), with a light lift in contrast and colour applied in the same instant.

## Game 3: Wendy's Claw, Grab the Order (Nov 2026)

- `public/kiosk/claw.html` (`/kiosk/claw`): a memory match game inside a claw machine. Six slots are shown for 3 seconds, then closed; the guest matches the three pairs (burger, fries, Frosty) before the clock runs out. Each match makes the claw carry the item to the tray and gives 2 seconds back. Eight screens: welcome, code, code error (same screen), how to play, memorise, play, Order up, Time's up.
- One fixed 1080 x 1920 canvas scaled to the screen by `fit()` (sizes are canvas pixels). On a wide screen the same upright canvas is shown centred; there is no separate wide layout.
- It uses the same guest code as the other games (3 numbers, 2 letters, checked when the last letter is typed) and the same Wendy Fest header and logos. The big button under the cabinet belongs to whichever screen is showing (`CTA`).
- Settings: `CLAW_DURATION_MS` (15000), `CLAW_BONUS_MS` (2000), `CLAW_MEMORISE_MS` (3000), `CLAW_ATTEMPTS` (1). Rounds are saved by `POST /api/kiosk/claw` in `claw_attempts`; a round is a win only with all three matched. There is no prize yet (owner to decide).
- Pictures are in `public/assets/claw/`, made from the owner's artwork: the fries box and Frosty cup were recoloured white with the Wendy's logo, and the vanilla Frosty was made from the chocolate one. The Frosty flavour is picked at random each round.
- Sounds are the existing ElevenLabs-made set in `public/assets/sfx/`, played from `<audio>` tags.
- The big button pulses, so browser tests must tap it with `force: true`.
- LED wall name tape: runs from behind Wendy's head to the photo's right edge, square-ended, at the photo's tilt, with a cream line above and below.
- Wendy's Claw rules (owner, Nov 2026): three tries (`CLAW_CHANCES`), one used for every pair turned over, so a single wrong pair means the order cannot be completed; the round ends when the tries or the time run out. A full order wins a coupon from the same pool as Scream & Win (`activity = 'claw'`, `claw_attempts.coupon_id`), with the same win SMS; the guest's pass lists coupons from any game (`rewards`). The claw lifts the item out of the slot half hidden, shows it fully as it rises, then lowers it slowly onto the tray. Keys are beige like Scream & Win. The welcome screen has two looks being chosen by the owner (`?w=a` showcase, `?w=b` the grab).
- Wendy's Claw, later changes: the clock is 13 seconds. Each round orders one burger (five kinds), one side (fries or Chicken Bites) and one Frosty (chocolate or vanilla), picked at random. Claw sounds (`clawmove`, `clawgrab`, `clawdrop`, `flip`, `jackpot`) and the `tension` music under the round are in `scripts/make-sounds.mjs`. The win screen follows the Scream & Win coupon: prize ribbon, beige ticket, red stub with the QR. The guest's pass has a Wendy's Claw card, and the kiosk start page has a third ticket. In the slot only the top half of the product shows in the claw; it comes fully into view as it is pulled out. Key colours being chosen by the owner: `?k=red|blue|dark|white` (beige is the base). The fries box is recoloured white by picking only pure red pixels, so no haze is left over the fries.
- Wendy's Claw welcome screen (owner, Nov 2026): the owner's finished picture (`public/assets/claw/welcome.jpg`, Wendy pointing at the loaded tray, claw, QR card) fills the cabinet as one image (`.wd`), and the real Scan to register QR is laid over the sample QR in the picture (`.qrd`). `?w=a` and `?w=b` still show the two earlier welcomes. A new picture must keep the QR card in the same place, or `.qrd` must be moved.
- Wendy's Claw, harder and clearer (owner, Nov 2026): after Let's play a pop-up shows "This is your order" for 5 seconds (`CLAW_ORDER_MS`) with the three products and their names, then flies up to the order bar. The cabinet has nine slots: the order's three pairs plus three single items that are not in the order (`CLAW_DECOYS`, 0 to 3); turning one over wastes a try. Every slot shows the product's menu name (`NAMES`, taken from the owner's photos of the Sri Lanka menu board). The beef and bacon pictures match nothing on that board and are out of the game (`BURGERS`) until the owner's product pictures arrive. Keys are blue with a red border line; the `?k=` colour options are gone. The product hangs below the claw's prongs so all of it is seen once out of the slot. On the result screens the three items sit close together and large.
- Scream & Win result line (owner, Nov 2026): when the word was right but too quiet, or said without the S, the line on the result screen is the same teasing line Wendy says out loud (`SAID` in `scream.html`, in the same order as `QUIET` and `NOS` in `scripts/make-sounds.mjs`). Change both together.
- Nov 2026, later: the claw clock is 15 seconds and the music starts with the "This is your order" countdown; How to play shows a different product on each card. Wide Scream & Win: Wendy's comment on the result screen is a slanted cream ribbon like Hold it, with clear space above the score box (`sassy` size from 52 characters), and the words in the We heard ribbon are sized to stay inside it.
- Wendy's Claw (owner, Nov 2026, later still): a matched pair is ticked off at once and the clock keeps running; the claw comes once, when the round ends, and carries every matched item to the tray together (`pairOk`, `collect`), then the result screen shows. The footer's little Wendy and copyright line are on one line, and there is a gap between WENDY'S CLAW and the Grab the order plate.
- Wendy's Claw look (owner picked option B, Nov 2026): How to play cards have a red tab with the step number and bigger products with a heavy shadow; the "This is your order" pop-up is a cream order slip with the three products and their names (`.dz-b` rules, always on).
- Wendy's Claw drinks (owner, Nov 2026): the third item of an order is a drink (Coca-Cola, Sprite or Coca-Cola Zero, about 6 rounds in 10) or a Frosty. All drinks use the same Wendy's cup picture (`cup.webp`), so only the name tells them apart, and one look-alike (another drink, or the other Frosty) is always among the wrong items. Slot names are a little bigger for this.
- Wendy's Claw menu and flow (owner, Nov 2026, latest): products and names are the Sri Lanka menu's own (owner's picture files): six burgers (Classic Chicken, Lankan Fire, Molten Cheese Lava, Paneer Double Decker, Grilled Chicken, Chicken Tenders Burger), sides (Fries, BBQ Shaker Fries, Cheese Shaker Fries, Chicken Bites, Chicken Tenders), then a Frosty or a drink. The shaker fries pictures are the plain fries with seasoning added by `shaker()` (see the scratch script's logic in git history; only fry-coloured pixels are tinted). The three wrong items are always look-alikes: another burger, the other fries or chicken, another drink or Frosty. Guests match all their pairs first with the clock running; matched slots stay open with a green tick. Only when the round ends does the claw come, lifting each matched item from its own slot onto the tray (`collect`). Wendy speaks (`vo`, files `voice/claw-*.mp3`, text in `CLAW` in `scripts/make-sounds.mjs`): hello, how to play, "Your order!", four to one, remember, go, a cheer on each pair, and a win or lose line. The takeaway bag stands on the winner's tray.
- Wendy's Claw, no early stop (owner, Nov 2026: "within your 15 seconds, do not stop"): there is no tries limit and no time bonus by default (`CLAW_CHANCES` 0, `CLAW_BONUS_MS` 0). The round ends only when all three pairs are matched or the 15 seconds run out; a wrong pair just closes again. Only then does the claw come and carry the matched items to the tray. Setting `CLAW_CHANCES` above 0 brings the tries counter back.
- Roast writing, current brief (owner, Nov 2026: "go with the flow", "a mix of all", "very funny", "relatable", "read their mind, based on their personality", "be diplomatic"): the writer picks the ONE most personal detail (what the guest is doing, or a deliberate styling choice such as two gold chains), reads the guest's mood like a friend would, keeps to one idea for both lines, and mixes three shapes (three-beat with a menu reaction, deadpan, big exaggeration). A menu item appears only when it belongs to the same idea. It thinks of three roasts and keeps the funniest. The old "food always wins" contest is gone. Reference lines the owner liked: hoodie in the heat, phone call, silence T-shirt, two gold chains. All safety rules (DIPLOMATIC, HARD RULES) are unchanged.
- Wendy's Claw installs as a home-screen shortcut like the other two kiosks: `public/assets/claw.webmanifest` and `icon-claw-192/512.png`; the Add to home screen button is the shared one in `kiosk.js`, shown on the staff PIN screen only. The claw clock is 8 seconds (owner, 28 Nov 2026).
- Scream & Win at a noisy venue (owner, 28 Nov 2026): (1) a sentence that merely contains the word is not a shout: more than two words that are not the target word caps clarity at 30 (`wendysCheck`), because the stage announcer was winning for guests; (2) the kiosk measures the room during the countdown (`AMB`, `roomDb`: mean power without the loudest fifth) and sends `ambientDb`; `voiceDb()` in `server/util.js` takes that power out of the shout, so loudness is the guest's own voice over the music (at most 7 dB is taken off). The live meter uses the same sum (`voiceOnly`). The room reading is saved as `amb` in each attempt's `speech` JSON.
