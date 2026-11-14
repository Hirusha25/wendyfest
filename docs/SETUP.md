# Event-day setup

## Hardware map

```
                 ┌──────────── LED WALL ────────────┐
                 │  /kiosk/scream  (Station WALL)   │
                 └───────────────┬──────────────────┘
                                 │ HDMI
                         Laptop A (Chrome, fullscreen "F")
                                 │ USB
                         Podcast mic #1 (via USB interface)

  Kiosk 1 (touch screen) — /kiosk/scream  (Station K1) — Podcast mic #2
  Kiosk 2 (touch screen) — /kiosk/roast   (Station K2) — USB webcam

  All machines on the same Wi-Fi/LAN as the server laptop.
  Guest phones use 4G or venue Wi-Fi → BASE_URL must be reachable from the internet
  (deploy to a small VPS / Render / Railway) OR run a tunnel (cloudflared) from the server laptop.
```

## Server

1. Deploy once: `npm install && npm start` on a VPS, or run on Laptop A with `cloudflared tunnel --url http://localhost:3000` and put the public URL in `BASE_URL`.
2. `.env`: `BASE_URL`, `ANTHROPIC_API_KEY`, `SMS_PROVIDER` + credentials, `SMS_SENDER_ID=Wendys`, PINs.
3. `/admin` → import the coupon codes → confirm reward copy → set threshold.

## Scream & Win station (each screen)

1. Open `/kiosk/scream` in Chrome, unlock with the kiosk PIN, press `F` for fullscreen.
2. Click the faint gear (bottom-right) → pick **the mic for this station** → watch the live level. The choice is remembered per station label.
3. Calibrate: staff member screams "WENDY'S" at the real distance. Peak should land ~90–100. Adjust **dB ceiling / floor** in `/admin` if not. Normal talking should sit near 10–30.
4. Clarity: default is Chrome speech recognition (needs internet). If the venue internet is flaky, set **Host judges** in the gear menu.
5. Flow: Host enters code → "Start the count" → guest screams → result + QR → "Next guest". Esc returns to idle at any time. Idle auto-return after 30 s.

### Mic → kiosk checklist (TO VERIFY — see REMINDERS)
- Podcast mics (XLR, e.g. SM7B/Podmic) need a USB audio interface or a USB-C podcast mic. Confirm the kiosk PC/touchscreen has a free USB port and Chrome can see the interface in the gear menu.
- Two mics on two different machines = no problem. Two mics on ONE machine = two Chrome windows each picking a different input device (also works; set different station labels).
- Disable Windows "audio enhancements"/AGC on the input, and disable noise suppression in the interface software, or screams will be squashed.
- Chrome needs `https://` or `localhost` to allow mic/camera. A plain `http://192.168.x.x` kiosk URL will be blocked → use the tunnel URL / deployed HTTPS URL or launch Chrome with `--unsafely-treat-insecure-origin-as-secure=http://192.168.x.x:3000`.

## Roast Me station

1. Open `/kiosk/roast`, unlock, fullscreen.
2. Gear → pick the **USB webcam** (not the laptop's built-in). Mirror preview on. Camera at eye height, ~1.2 m, light from behind the camera.
3. Flow: code → consent (guest picks language, host taps "I agree" on their yes) → "Take the photo" → 3-2-1 → ~5–10 s "Looking you over…" → reveal with QR.
4. Without an API key or internet, the fallback roast bank is used automatically.

### Webcam → kiosk checklist (TO VERIFY)
- Confirm the kiosk's OS exposes the USB webcam to Chrome (Settings → Privacy → Camera on Windows).
- Same HTTPS rule as the mic.

## Crowd control

- Both activities are host-driven: the guest never touches the kiosk, the host types the code. That keeps the queue moving and avoids greasy touchscreens.
- One attempt per guest per activity by default (`/admin`).

## Before doors open

- [ ] Test SMS to 3 real numbers on Dialog, Mobitel/SLT and Hutch. Check the sender shows as **Wendys**.
- [ ] Scan the big QR with iPhone + Android.
- [ ] Register → scream → roast → open profile link → download card → share to WhatsApp.
- [ ] Coupon pool ≥ expected winners (1,000–1,500). Admin warns under 50.
- [ ] Spare USB cables, extension lead, a second webcam, a USB mic as backup.
- [ ] Export CSV at close: `/api/admin/export.csv`.

## Privacy

Photos and roasts are stored under `data/photos` and linked to the guest's profile. Consent text is on the kiosk in all three languages. Delete `data/` after the campaign's retention window agreed with the client.
