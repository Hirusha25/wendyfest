# Handover prompt

Paste everything below the line into a new local Claude Code session. Open it in your existing `wendyfest` folder, or in an empty folder if you have no copy yet; the first paragraph handles both.

---

First, make sure this folder is the Hirusha25/wendyfest repo and is up to date: check that it is a git repo with that remote, switch to the `main` branch, and pull the latest from GitHub. If I have uncommitted local changes, stop and tell me before pulling. If this folder is not the repo, tell me and offer to clone https://github.com/Hirusha25/wendyfest instead.

You are taking over the Wendy Fest project from an earlier cloud session. It is an event platform for the Wendy's Sri Lanka launch: phone registration plus two kiosk games, Roast Me and Scream & Win. I am the project owner and I am not a developer, so explain things in plain language and show me screenshots rather than code.

Before doing anything else, read these in order and tell me in a few lines what you understood and what is still open:

1. `CLAUDE.md` — how the project is built and the rules to follow
2. `docs/HANDOVER.md` — what was done, what is waiting on me, what has never been tested
3. `docs/DESIGN_SYSTEM.md` — the approved look of the kiosk screens
4. `README.md` and `docs/REMINDERS.md` — product details and the pre-event checklist

Then set up and confirm the project runs on this machine:

- `npm install`, copy `.env.example` to `.env`, `npm start`, and open `http://localhost:3000/kiosk` (kiosk PIN 2468).
- Install Playwright for the checks (`npm i -D playwright && npx playwright install chromium`, without committing it) and run `node scripts/kiosk-check.mjs`. All checks should pass. If any fail, tell me which and why before changing anything.

How I like to work:

- When I ask for a design change, show me two or three options as screenshots first, recommend one, and wait for my pick.
- After building something, run it in a real browser and send me screenshots. Tell me plainly what you tested and what you could not test.
- Do not push to `main` or update the demo link until I say so. When I say "push", do both.
- Keep the kiosk rules in `CLAUDE.md`: nothing crossing the white stripe or the divider line, buttons that stand out from what is behind them, kind roasts about things people chose, comebacks that tease the guest and never another brand, and consent wording left as approved.
- Flag any Sinhala or Tamil text you write so a native speaker can check it.
- Never put API keys, SMS credentials or real PINs into the repo or into chat.

Where we stopped:

- All six Roast Me screens and the blue Scream & Win design are approved and on `main`. The demo is at https://hirusha25.github.io/wendyfest/ (guest code WENDYS).
- I was shown three stripe-and-food-icon designs for the Scream & Win result screen (`docs/screens/scream-stripes-option-a.png`, `-b.png`, `-c.png`) and have not chosen one yet. Ask me which I want, and whether it should go on the result screen only or on every Scream screen.
- The AI roasts and AI comebacks have never been run because there was no Anthropic API key. Once I give this machine a key in `.env`, help me test them with real photos and real shouting.
- The full app is not hosted anywhere yet. I will need help deploying it before the event.

Start by reading the four documents and giving me your summary.
