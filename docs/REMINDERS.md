# Reminders (from the brief on 14 Nov 2026)

## Emails to send
- [ ] **Kamalesh** — (1) send the coupon codes to load into the system (1,000–1,500 codes, CSV, one per line); (2) what's on the launch menu (needed so roast lines and the reward copy can reference real products, and for the "what the code unlocks" line). Draft in `EMAIL_DRAFTS.md`.
- [ ] **Eromika (client)** — (1) get the SMS **Sender ID "Wendys"** approved with the gateway/operators (Dialog, Mobitel/SLT, Hutch, Airtel). Lead time is usually 3–7 working days and needs a brand authorisation letter; (2) confirm **what the coupon code gives** (e.g. 10% off, free fries, BOGO), validity window, outlets, one-use rule, and how the POS will validate the codes. This copy appears on the LED wall, kiosks, SMS and profile. Draft in `EMAIL_DRAFTS.md`.

## Hardware to verify
- [ ] Can the two **podcast mics** connect to the **kiosk** units (USB interface / USB-C mic, port availability, Chrome device selection)? Also one mic to the LED wall laptop.
- [ ] Can a **USB webcam** connect to the Roast Me kiosk and is it visible to Chrome?
- [ ] Kiosk URL must be HTTPS (or localhost) for mic/camera access — decide: deployed domain vs cloudflared tunnel.

## Content to confirm
- [ ] Native review of Sinhala/Tamil UI strings (`public/js/i18n.js`), SMS templates (`server/sms.js`) and consent copy (`public/kiosk/roast.html`).
- [ ] Licensed fonts (GT Walsheim Ultra Bold, Wendy's Fresh) from the client to replace Poppins.
- [ ] Legal/T&Cs line for registration + photo consent retention period.

## SMS volume
- Each registration now sends **2 SMS** (OTP + welcome), plus 1 per scream result and 1 per roast. Budget ~4 SMS per guest with the gateway.

## Config before launch
- [ ] `ANTHROPIC_API_KEY` for Roast Me.
- [ ] `SMS_PROVIDER` credentials + approved sender ID.
- [ ] `BASE_URL` = public URL; change kiosk/admin PINs.
- [ ] Load coupon codes in `/admin`; calibrate scream dB on site.

## Added 24 Nov 2026 (kiosk redesign handover)
- [ ] **Host the full app** (nothing is deployed; the demo link has no server and no AI). Render one-click is in `render.yaml`.
- [ ] Test **AI roasts** with real photos (cap, glasses, plain T-shirt, group, empty frame) and **AI Scream comebacks** once `ANTHROPIC_API_KEY` is set. Neither has ever been run.
- [ ] Price the roast model against expected guest numbers (`ROAST_MODEL`, default `claude-opus-5-5`).
- [ ] Native review of the new Sinhala/Tamil: three consent-row headings on the Ready? screen (`public/kiosk/roast.html`) and the five offline roasts (`server/roast.js`). The promise line is still English only.
- [ ] Client OK for showing **competitor names** in Scream & Win comebacks.
- [ ] Decide: stripe + food-icon design for Scream & Win (options A/B/C in `docs/screens/`), free retry after a wrong-restaurant shout, and whether the comeback is spoken aloud.
- [ ] Test Scream & Win with a **real microphone** in Chrome (speech recognition) and Roast Me with the **real webcam**.
