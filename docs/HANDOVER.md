# Handover — Wendy Fest kiosks

State of the project as of 24 Nov 2026, written for whoever (person or Claude Code session) picks it up next. Start a local session with the prompt in `docs/HANDOVER_PROMPT.md`.

## Where things are

| What | Where |
|---|---|
| Repository | https://github.com/Hirusha25/wendyfest |
| Approved code | `main` |
| Demo (static, no server, no AI) | https://hirusha25.github.io/wendyfest/ — built from `main` into the `gh-pages` branch |
| Roast Me demo | https://hirusha25.github.io/wendyfest/kiosk/roast.html |
| Scream & Win demo | https://hirusha25.github.io/wendyfest/kiosk/scream.html |
| Demo logins | kiosk PIN `2468`, guest code `WENDYS` |
| Full app hosting | **None yet.** `wendyfest.onrender.com` in older notes was only an example; nothing is deployed there. |

## What was done (16–24 Nov)

### Roast Me kiosk — all six screens redesigned and live on `main`

Each screen went through three mockups; the owner picked one.

| Screen | Chosen | What changed |
|---|---|---|
| 1 Welcome | — | "Let's get roasted" button is blue (red on the red illustration was hard to see) |
| 2 Your code | Option C | Six code slots above the keypad on the red side; solid 3D keys (charcoal letters, blue numbers); Go is an outline counting down until six characters are in; "No code yet?" QR on the left; faint dots top-right of the red side |
| 3 Ready? | Option A | Name in red after "Hi"; language tabs on the white card; consent split into three icon rows (original wording, not shortened); red promise strip; blue "I'm in, roast me" beside "No thanks" |
| 4 Camera | Option A | Red panel with heat choices as 3D blocks; blue "Take my photo"; LIVE tag inside the frame; camera name hidden from guests unless the camera fails |
| 5 Cooking | Option C | Wendy illustration; rotating lines in her speech bubble; checklist; guest photo as a polaroid captioned with the chosen heat |
| 6 Your roast | Option A + extras | "Wendy says" white card for the roast; share card shown as a badge with a punched hole and lanyard; squared language buttons; charcoal "Next guest" |

### Roast wording

- AI instructions rewritten (`SYSTEM` in `server/roast.js`): pick one or two visible things the guest chose (cap and its colour, glasses, shirt), name it, tease it kindly, turn it into a compliment. Simple language; at most one everyday local touch. Cricket jargon, bus routes, place in-jokes and internet slang are banned. 35–60 words.
- The five offline roast lines (used by the demo, and by the kiosk when the AI is unreachable) were rewritten to match. They never claim to see anything.

### Scream & Win

- The **blue design is final** and lives at `/kiosk/scream`. The dark design is a spare at `/kiosk/scream-dark`; `/kiosk/scream-cream` forwards to the final page.
- **Comebacks:** when a guest shouts something other than "Wendy's", the result screen answers back. The punchline is the big headline; a follow-up line sits beside it.
  - Other restaurants (KFC, McDonald's, Burger King, Pizza Hut, Domino's, Subway, Taco Bell, Popeyes) get "wrong restaurant" lines.
  - Any other words get a line built around what was heard, with themed replies for food words, greetings, "I love you", "amma"/"help" and plain screaming.
  - Rude words are never repeated on screen.
  - With an API key the AI writes both lines (`server/sass.js`, 7-second cap); otherwise the pre-written lines in `server/util.js` are used.
- Result headline shrinks to stay clear of the divider line and the score.

### Tooling

- Demo pages reload themselves when a newer build is published (`version.txt` check), because GitHub Pages lets browsers cache a page for 10 minutes.
- `scripts/kiosk-check.mjs` — browser smoke test of both kiosks (21 checks).
- `scripts/publish-demo.sh` — rebuild and publish the demo.
- `scripts/mock-scream-stripes.mjs` — regenerates the stripe/icon design options.

## Waiting on a decision

1. **Stripes and food icons on Scream & Win.** Three designs were shown (`docs/screens/scream-stripes-option-{a,b,c}.png`), based on the blue-and-white striped event token: A awning band under the header, B token-style striped panel behind the QR, C soft all-over stripes with icon stickers. B was recommended. Not built. Also undecided: result screen only, or every Scream screen. Caution given: a "burger + fries + drink + Frosty" row can read as a meal the guest has won.
2. **Free retry after a wrong-restaurant shout?** Today it uses up the guest's one scream.
3. **Should the comeback be spoken aloud?** Today it is shown only.
4. **Competitor names on screen** need the client's OK.

## Not verified — do these before the event

- **AI roasts and AI comebacks have never been run.** No API key was available. Deploy with `ANTHROPIC_API_KEY`, then test photos (cap, glasses, plain T-shirt, group, no person) and shouts.
- **Real microphone and camera.** All browser checks used a fake camera, and fed "heard" text straight to the scoring instead of using speech recognition.
- **Sinhala and Tamil written by AI**, needing a native read: the three consent-row headings on Ready? (`roast.html`), and the five offline roasts (`server/roast.js`). The consent promise line is still English only.
- **Hosting.** Nothing serves the full app. Render one-click is set up in `render.yaml`; needs a persistent disk, `BASE_URL`, API key, SMS provider and real PINs.
- **Cost.** The roast model is `claude-opus-5-5` (the most expensive tier), one photo per roast. Price it against expected guests; `ROAST_MODEL` in `.env` switches it.
- Everything in `docs/REMINDERS.md` (SMS sender ID, coupons, hardware, licensed fonts).

## Known rough edges

- With a three-line follow-up, the comeback text sits close to the loudness box on the Scream result.
- Speech recognition returning "Wendy’s" with a curly apostrophe scores clarity 90, not 100 (still a pass). The straight apostrophe scores 100. See `tokenise` in `server/util.js`.
- The rude-word filter covers common English words only.
- Older scripts in `scripts/` (`journey*.mjs`, `mock-*.mjs`, `sfx-test.mjs`, …) hard-code a Playwright path from the cloud sandbox (`/opt/node-tools/node_modules/`). Use `scripts/lib/kiosk-harness.mjs` `loadChromium()` if you need them locally.
- `README.md` describes the product well but predates some of this work; this file and `CLAUDE.md` are the current source for the kiosk screens.

## How to continue

```bash
git clone https://github.com/Hirusha25/wendyfest && cd wendyfest
npm install && cp .env.example .env && npm start     # http://localhost:3000/kiosk
npm i -D playwright && npx playwright install chromium   # once, for the checks (don't commit)
node scripts/kiosk-check.mjs
```

Working pattern that the owner is used to: show designs first when asked, build the chosen one, test it in a browser, send screenshots, and publish to `main` and the demo only on a go-ahead. Details in `CLAUDE.md`.
