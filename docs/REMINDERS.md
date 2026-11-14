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

## Config before launch
- [ ] `ANTHROPIC_API_KEY` for Roast Me.
- [ ] `SMS_PROVIDER` credentials + approved sender ID.
- [ ] `BASE_URL` = public URL; change kiosk/admin PINs.
- [ ] Load coupon codes in `/admin`; calibrate scream dB on site.
