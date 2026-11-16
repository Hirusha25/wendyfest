# Wendy Fest – AI design prompt pack

Copy-paste prompts for generating polished, realistic versions of the Wendy Fest kiosk screens in an AI design or image tool (ChatGPT image, Midjourney, Adobe Firefly, Canva Magic Design, Figma AI).

## How to get the best result

1. **Generate one screen at a time.** Paste the **Style block** for the activation, then the **screen prompt** underneath it.
2. **Attach the reference sheet** as an image prompt so the tool keeps our layout:
   - Roast Me: `docs/screens/roast-design.png`
   - Scream & Win: `docs/screens/scream-retro-blue-all.png`
3. **Set the canvas to 16:9 landscape, 1920 × 1080.** (Midjourney: add `--ar 16:9 --style raw --v 7`.)
4. **Leave the logo and the Wendy cameo as empty placeholders.** AI tools cannot draw the real Wendy's logo or cameo correctly. Drop the official files in afterwards (`public/assets/wendys-horiz-white.svg`, `public/assets/cameo.png`).
5. **Fix the text afterwards.** AI tools often misspell words. Generate the look, then retype headlines in Canva or Figma using **Poppins Black Italic** (stand-in for the licensed Wendy's fonts).
6. **For realism, generate the photo assets separately** (see the end of this file) and place them into the frames.

---

## Style block · Roast Me

```text
Premium interactive kiosk screen UI for "Wendy Fest", a Wendy's Sri Lanka brand activation. 16:9 landscape, 1920x1080, shown on a large LED wall. Bold, playful, confident, "serving the sass". Polished agency-quality UI, not a template, not generic AI art.

Background: dark charcoal stage, soft radial light from the upper left (#343030 fading to #1A1717), a faint Wendy's-blue glow rising from the bottom edge, very subtle white halftone dots fading out from the top-right and bottom-left corners.

Header: full-width bar 105px tall, Wendy's blue gradient (#1BB0E6 to #016F9F), empty logo placeholder on the left followed by a thin white divider and "WENDY FEST" in spaced white italic caps; on the right a white circle with the step number in blue and the step name in spaced white italic caps. Under the header a thin stripe: white, red #CD2028, white. Slim warm-brown footer (#493533) with small light text: "© 2026 Wendy's Sri Lanka", "Roast Me · Station B", "Terms · Privacy".

Typography: headlines in heavy italic geometric sans (Poppins Black Italic), all caps, tight tracking, with a two-layer extruded 3D shadow (blue #029CD4 then deep blue #01476A). Primary headline colour Wendy's blue #029CD4, second line white. Body text Poppins SemiBold, white.

Components: white cards with a solid offset shadow in deep blue (#016F9F) and soft drop shadow; pill buttons in Wendy's blue gradient with a white circle containing a blue arrow on the right; white pill chips; Wendy's red #CD2028 used only as an accent (product names, chilli icons, title tags). A small round Wendy cameo placeholder acts as a host character with white rounded speech bubbles.

Avoid: neon glow overload, glassmorphism, purple, stock-photo clutter, extra text, misspelled words, fake logos, any joke about body, skin, age or religion.
```

## Style block · Scream & Win

```text
Premium interactive kiosk screen UI for "Wendy Fest", a Wendy's Sri Lanka brand activation called "Scream & Win". 16:9 landscape, 1920x1080, shown on a large LED wall. Bold, loud, joyful, retro fast-food energy. Polished agency-quality UI, not a template, not generic AI art.

Background: Wendy's blue vertical gradient (#19B2E8 at top to #029CD4 to #016F9F at bottom) with a soft white glow behind the centre and very subtle white halftone dots fading out from the top-right and bottom-left corners.

Header: full-width bar 105px tall, Wendy's red gradient (#DB323B to #A51A22), empty logo placeholder on the left, thin white divider, "WENDY FEST" in spaced white italic caps; on the right a white circle with the step number in red and the step name in spaced white italic caps. Under the header a thin stripe: cream #F6F0E6, red #CD2028, cream. Slim navy footer (#01476A) with small light text: "© 2026 Wendy's Sri Lanka", "Station A", "Terms · Privacy".

Typography: headlines in heavy italic geometric sans (Poppins Black Italic), all caps, tight tracking. First line cream #F6F0E6 with a deep-blue extruded 3D shadow (#01476A, #012F47); highlighted words in Wendy's red #CD2028 with a white outline and a white-then-blue extruded shadow. Big numbers cream with red extruded depth (#A5171F, #7A0F16).

Components: cream cards with a solid navy offset shadow; red pill buttons with a white circle containing a red arrow; cream pill badges; a round Wendy cameo placeholder acts as a host character with cream speech bubbles; audio waveforms made of rounded vertical bars, mostly cream with every fourth bar red.

Avoid: neon glow overload, glassmorphism, purple, stock-photo clutter, extra text, misspelled words, fake logos.
```

---

## Roast Me · screen prompts

### 1 · Register (attract screen)
```text
Layout: left third holds a small blue eyebrow "AI-POWERED ROAST BOOTH" with a short blue rule, then a huge two-line headline "ROAST" (blue) / "ME." (white) with extruded 3D shadow, then the line "Let Wendy roast your look. Nicely." with "Nicely." in bold italic blue. Below, the round Wendy cameo placeholder with a white speech bubble "Think you can handle it?". Centre: two overlapping instant-camera polaroid photos, slightly rotated, a strip of yellow tape on the front one, handwritten-style red captions "MAIN CHARACTER ENERGY" and "COLOMBO'S FINEST FIT"; the photos show a smiling young Sri Lankan guest in a red cap doing a peace sign at a fun food event. Right: a white card with a QR code and "SCAN TO REGISTER" with a short blue underline; below it a large blue pill button "ENTER YOUR CODE" with a white arrow circle. Step badge "1 REGISTER".
```

### 2 · Ready? (consent + spice level)
```text
Layout: top-left headline "QUICK ONE," (white) / "DILSHAN." (blue). Below it a white card with three rows, each with a blue circular tick: "We take one photo for your roast", "It's saved to your Wendy Fest pass", "Playful, never mean. No looks-shaming." Top-right a section "PICK YOUR SPICE" with three stacked pill chips showing chilli icons: "MILD" (1 red chilli), "MEDIUM" (2 chillies, selected: white chip with blue text), "EXTRA SPICY" (3 chillies). Far right the Wendy cameo placeholder with a speech bubble "I'll be nice. Mostly." Bottom: a large blue pill button "I'M IN, ROAST ME" with arrow and a white-outline ghost pill "NOT TODAY". Step badge "2 READY?".
```

### 3 · Pose (live camera)
```text
Layout: left half a large live camera viewfinder with rounded corners, thick white border and a deep-blue offset shadow, blue corner brackets, faint rule-of-thirds grid, a dashed white oval face guide, and a red "LIVE" pill with a dot in the top-left. Inside the viewfinder a realistic photo of a cheerful young Sri Lankan guest in a red cap and sunglasses doing a peace sign. Right: headline "STRIKE" (white) / "A POSE." (blue); four pose chips "PEACE SIGN", "POWER POSE", "MAIN CHARACTER", "SQUAD" (first one selected); a big round blue shutter button with a white camera icon and white ring; the Wendy cameo placeholder with a speech bubble "Smile, or don't. I'll roast it anyway." Step badge "3 POSE".
```

### 4 · Snap (countdown)
```text
Layout: the same camera viewfinder on the left with a huge white number "2" centred over the photo, blue extruded 3D shadow, a soft white flash vignette at the edges. Right: giant headline "SAY" (blue) / "FROSTY!" (white); beneath it a countdown row "3 • 2 • 1" with 2 highlighted in blue and 1 dimmed. Step badge "4 SNAP".
```

### 5 · Cooking (AI is writing the roast)
```text
Layout: left a large polaroid of the guest's photo, rotated slightly, yellow tape on top, the photo half-developed (warm sepia, soft blur), caption "DEVELOPING..." in faded red. Right: headline "COOKING YOUR" (white) / "ROAST..." (blue); a checklist with blue tick circles "STUDYING THE FIT", "FINDING THE ANGLE", a spinning loader on "ADDING THE SASS", and a dimmed "PLATING IT UP"; a striped blue progress bar about 70% full; a small italic line "Asking the Frosty machine for a second opinion...". Far right the Wendy cameo placeholder with a speech bubble "Ooh. This one's gonna be spicy." Step badge "5 COOKING".
```

### 6 · Your roast (reveal)
```text
Layout: left a polaroid of the guest (realistic photo, red cap, sunglasses, peace sign), rotated, yellow tape, red handwritten caption "DILSHAN · WENDY FEST"; below it a red title tag with white border, slightly rotated: "MAIN CHARACTER, SIDE QUEST ENERGY". Centre: the Wendy cameo placeholder with a small label "WENDY SAYS", and a large white speech bubble pointing at her. Inside the bubble, a header row with "SPICE" and two red chilli icons on the left and language chips "EN" (selected, blue), "සිං", "தமி" on the right, then the roast text in dark grey: "Dilshan walked in like the main character and the camera agreed. That red cap is working harder than a Baconator on a Friday night, and the peace sign says 'I rehearsed this'. Honestly? Colombo's not ready. Grab a Frosty, superstar. You've earned the cool-down." with "main character", "Baconator" and "Frosty" in bold italic red. Right: white QR card "DOWNLOAD & SHARE" and a blue pill button "NEXT GUEST". Step badge "6 YOUR ROAST".
```

### 7 · Share (Instagram story card)
```text
Layout: left headline "YOUR ROAST," (white) / "READY TO POST." (blue); a checklist with blue ticks "SCAN THE QR", "SAVE YOUR ROAST CARD", "POST & TAG @WENDYS.LK"; a white pill "#WENDYFEST · #ROASTEDBYWENDY". Centre-right: a modern smartphone, slightly rotated, showing a vertical 9:16 Instagram story card: blue header with logo placeholder, white-red-white stripe, the guest's polaroid, the red title tag "MAIN CHARACTER, SIDE QUEST ENERGY", a white quote card with one roast line, and "GET ROASTED AT WENDY FEST" at the bottom on a dark charcoal background. Far right the Wendy cameo placeholder with a speech bubble "Tag me. I'll be checking." Step badge "6 SHARE".
```

---

## Scream & Win · screen prompts

### 1 · Register (attract screen)
```text
Layout: left: small spaced caps "INTERACTIVE LED WALL EXPERIENCE" with a short red rule, then a huge two-line headline "SCREAM" (cream with deep-blue extrusion) / "& WIN" (red with white outline). Below: "Say WENDY'S. Make some noise." with "WENDY'S." in bold italic red-shadowed white. Along the bottom-left, an audio waveform of rounded vertical bars rising to a hill in the middle and fading at both ends, cream with every fourth bar red. Right: cream QR card "SCAN TO REGISTER" with a red underline and a large red pill "ENTER YOUR CODE" with a white arrow circle. Step badge "1 REGISTER".
```

### 2 · Enter code
```text
Layout: left: headline "LET'S HEAR YOU." in cream with red depth, the line "Enter your 6-character guest code to start the experience.", six cream code boxes with red outlines showing "D R 4" and a blinking red cursor in the fourth, and "Ask your host for help." between two short cream rules. Right: a red on-screen QWERTY keyboard with rounded keys (shift, backspace, "123", "SPACE") and a big red pill "CONTINUE". Step badge "2 ENTER CODE".
```

### 3 · Mic check
```text
Layout: centred headline "READY, DILSHAN?" in cream with red depth, the line "When the count hits zero, scream 'WENDY'S!'", a horizontal waveform of cream and red rounded bars peaking in the middle, a cream pill "MIC CONNECTED · SAY 'HELLO'" with a cyan dot, and a red pill "LET'S GO". On the right the Wendy cameo placeholder with a cream speech bubble "Lean in and give it everything!". Step badge "3 MIC CHECK".
```

### 4 · Countdown
```text
Layout: left: "GET READY TO SCREAM." in cream with red depth, a short red rule, and "3 • 2 • 1". Right: a large circular LED countdown ring made of fine cream tick marks with the leading ticks glowing red, two rings of red dotted circles outside it, three short red markers, and a giant cream number "2" with red extruded depth in the centre. Step badge "4 COUNTDOWN".
```

### 5 · Live
```text
Layout: top centre headline "SCREAM WENDY'S!" with "WENDY'S!" popping slightly larger. Centre: a circular LED loudness gauge (270-degree arc of cream ticks turning red at the leading edge, red dotted outer rings, a red target tick joined by a thin red leader line to a red pill "TARGET 75" at top right) with a big cream number "92" and "LOUDNESS SCORE" inside, a soft white glow behind it. Mirrored audio waveforms flow out to the left and right of the gauge. Top-left: the Wendy cameo placeholder with a cream speech bubble "HEARD IT!" with a red dot. Bottom-left: "WE HEARD" with a red tick and the words "Wendy's" in bold italic. Bottom-right: "7.5s LEFT" with a draining cream progress bar. Below the gauge a red pill with white border "★ YOU'RE IN! ★". Step badge "5 LIVE".
```

### 6 · Result · win
```text
Layout: left: headline "YOU BROUGHT THE LOUD." in cream with red depth, a giant cream score "84" with red extrusion and "FINAL SCORE" between two short rules. Centre: "YOUR REWARD CODE" above a red ticket with punched notches, a cream stub with a red star, diagonal stripes and a shine, showing "WENDY10-AAA111" in white italic; below it "10% OFF your next Wendy's order" and "Sent by SMS · saved on your Wendy Fest pass"; a red pill "NEXT PLAYER". Right: cream QR card "SAVE YOUR REWARD". Red, white and cream confetti scattered across the top. Step badge "6 RESULT".
```

### 7 · Result · miss
```text
Layout: left: headline "DON'T FORGET THE S!" in cream with red depth and a giant cream score "70" with "FINAL SCORE". Centre: the line "So close. It's WENDY'S, with the S." then a dark-blue translucent panel with two bars: "LOUDNESS 90" (cream bar, nearly full) and "CLARITY 40" (short red bar), and below "TO WIN: 75+ OVERALL · LOUD 60+ · CLEAR 70+"; a red pill "NEXT PLAYER". Right: cream QR card "SCAN FOR YOUR PASS" and a small cream card with the Wendy cameo placeholder: "NEXT STOP: ROAST ME". Step badge "6 RESULT".
```

---

## Realistic photo assets (generate separately, then place into the frames)

```text
Candid instant-camera photo of a cheerful young Sri Lankan man in his twenties wearing a red baseball cap and dark sunglasses, doing a peace sign and grinning, at a lively outdoor food festival in Colombo at golden hour, warm bokeh lights behind him, shot on Fujifilm Instax, natural skin texture, slight film grain, square 1:1 crop. No text, no logos.
```

```text
Candid photo of three Sri Lankan friends in their twenties laughing and doing a group power pose in front of a bright blue backdrop at a brand event, casual streetwear, flash photography, square 1:1, natural skin texture, no text, no logos.
```

```text
Close-up of a young Sri Lankan woman screaming joyfully into a black podcast microphone on a stand at a festival booth, red and blue stage lights, motion energy, shallow depth of field, 3:2, natural skin texture, no text, no logos.
```

```text
Seamless subtle texture: soft white halftone dots fading diagonally on a transparent background, PNG, 2048x2048.
```

---

## Roast Me · Welcome screen illustration (for `public/_design/roast-welcome.html`)

Save the result as `public/assets/roast-wendy.png`. It fills the red panel on the right and is cropped automatically.

- **Size:** 2048 × 2048 px, PNG
- **Background:** transparent. If the tool can't do transparency, use solid Wendy's red `#CD2028`.
- **Colours:** Wendy's red `#CD2028` and white only

```text
Flat two-colour vector illustration of Wendy, the red-haired girl from the Wendy's logo, drawn only in Wendy's red (#CD2028) and white. No black outlines, no gradients, no shading, no other colours. Close-up of her face and shoulders, facing forward and looking straight at the viewer (not to the left or right), with a confident, cheeky half-smile, big round eyes, a few freckles on her cheeks, and her signature pigtail tied with a bow sweeping out to the left. Bold retro screen-print poster style: big flat red shapes for her hair and collar, white negative space for her face. Her face sits in the right half of the frame; the top of her hair and the right side of her head are cropped off the edge. Transparent background, square PNG, 2048 x 2048 px. No text, no logo.
```
