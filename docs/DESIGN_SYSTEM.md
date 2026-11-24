# Kiosk design system

The rules the approved kiosk screens follow. New screens and changes should reuse these, not invent new parts.

## Canvases

| Kiosk | File | Canvas | Unit |
|---|---|---|---|
| Roast Me | `public/kiosk/roast.html` | 1920 × 1080 | `--p` = min(100vw/1920, 100vh/1080) |
| Scream & Win (final, blue) | `public/kiosk/scream.html` | 1440 × 760 | `--u` = min(100vw/1440, 100vh/760) |

Every size and position is `calc(N * var(--p))` (or `--u`). The canvas scales to any 16:9 screen.

## Colour

| Name | Value | Use |
|---|---|---|
| Red | `#CD2028` (gradient `#D92530 → #B81C24`) | Roast Me right panel, accents, Scream header |
| Charcoal | `#1E1B1B` | Roast Me left side, dark keys and blocks |
| Blue | `#029CD4` | eyebrows, rings, progress; header gradient `#01679A → #1BB0E6` |
| Cream | `#F6F0E6` | headline lettering, cards on blue |
| Button blue | `#2BB6EA → #0186B8`, underside `#01476A` | primary buttons |
| Dark red underside | `#7E1016` | 3D edge under white parts on red |

## Type

- **Poppins** throughout (stand-in for the licensed GT Walsheim Ultra Bold and Wendy's Fresh). Headlines are italic 900, upper case, tight tracking.
- **Barlow Semi Condensed** italic 900 only for the "WENDY FEST" lockup.
- **Eyebrow** (`.eb`): italic 800, 24, tracking .24em, upper case, with a short line after it. Blue on charcoal, white on red.
- **Two-tone headline** (`.t3`): line 1 cream with a blue 3D edge, line 2 red with a white outline.
- Sinhala and Tamil fall back to Noto Sans Sinhala / Noto Sans Tamil.

## Roast Me frame

- Blue gradient header (140 high) with the Wendy's logo, the WENDY FEST lockup and a step badge (number in a white circle + label).
- Cream/red/cream stripe under the header; blue footer (59 high).
- Charcoal left, red right, split by a white diagonal band: red panel `polygon(1130 0, 1920 0, 1920 1080, 740 1080)`, band 42 wide to its left.
- Camera screen uses a steeper split further right (`1250 → 1150`) so the camera frame has room.
- Faint halftone dots: bottom-left of the charcoal, top-right of the red.
- On Welcome, Ready?, Cooking the red side is replaced by the Wendy illustration (`/assets/roast-wendy.png`).

**Nothing may cross the white band.** At height y the band's left edge is at about `1088 − 0.361·y`; keep left-side content inside that.

## Components

| Part | Look | Where |
|---|---|---|
| Primary button | blue gradient, 4 white outline, dark-blue underside, white italic 900 text, gentle pulse | Let's get roasted, I'm in roast me, Take my photo |
| Confirm on red | solid white, red text, dark-red underside; outline-only until allowed | Go on the code screen |
| Secondary block | charcoal gradient `#403939 → #1E1B1B`, black underside | keypad letters, Delete, No thanks, Next guest, heat choices |
| Number keys | button-blue gradient | code keypad |
| Selected choice | turns white with red text and a tick | heat picker |
| Quiet button | transparent, white outline (`.ghostb`) | Back, Cancel |
| White card | white, radius 10, blue underside `0 10 0 #01679A` | consent card, Wendy says card |
| Code slots | six white tiles above the keypad; active one ringed | code screen |
| Speech bubble | white, 6 blue outline, radius 28, tail bottom-right | Wendy's lines on Cooking |
| Polaroid | white frame, tilted a few degrees, caption strip | guest photo on Cooking |
| Badge card | share card with tab, punched hole and blue lanyard | Reveal |
| Language picker | squared tabs on a card, or small squared buttons | Ready?, Reveal |

Pressed state for 3D parts: move down ~5 and shrink the underside.

## Roast Me screens (approved)

1. **Welcome** — ROAST ME. headline, QR to register, blue "Let's get roasted".
2. **Your code** — title and "No code yet?" QR on the left; slots, keypad, Delete and Go on the red side.
3. **Ready?** — "Hi" + name in red; language tabs on a white card with three icon rows and a red promise strip; No thanks + blue "I'm in, roast me" over Wendy.
4. **Camera** — camera frame with LIVE tag; red side has "Pick your heat." choices and blue "Take my photo".
5. **Cooking** — checklist left, polaroid over the band, Wendy's speech bubble with rotating lines.
6. **Your roast** — vibe eyebrow, roast title, "Wendy says" card; badge-style share card in the middle; Scan to save QR and Next guest on the right.

## Scream & Win (blue)

Red header, blue background with faint dots, cream 3D lettering with a red edge, red pill buttons, cream cards. Result screen: headline top-left (the sassy punchline when there is one), score below it, a divider line, then the follow-up line, loudness/clarity bars, QR card and Next player.

## Text that changes

Names, roasts, translations and comebacks vary in length. Each has a fit function that shrinks the type until it fits; extend these instead of hard-coding sizes:

- `fitConsent()` — greeting width and consent card height (`roast.html`)
- `fitReveal()` — roast title, roast body, name on the share card (`roast.html`)
- `fitResTitle()` — result headline vs. the divider line and the score (`scream.html`)

Always check English, Sinhala and Tamil, and one long name.

## Mockups

- `public/_design/{code,consent,camera,cooking,reveal}-options.html` — the three options shown for each Roast Me screen. Open with `?v=a`, `?v=b` or `?v=c` for one option full size.
- `scripts/mock-scream-stripes.mjs` — renders the three stripe + food-icon options for the Scream result (not built yet; see `docs/HANDOVER.md`).
- Images of every option are in `docs/screens/*-option-*.png`; approved live screens are `docs/screens/*-live*.png`.
