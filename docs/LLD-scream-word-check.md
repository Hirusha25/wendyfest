# Scream & Win word check: what went wrong and how to fix it

Date: 27 Nov 2026. Status: built on branch `fix/word-check-upload` with option A in 2.3; tested locally with a stand-in speech service, not yet on the real kiosk.

## 1. What the records show

Source: `scream_attempts.speech` on staging, the nginx log, the app log, and a direct test on the server.

| Check | Result |
|---|---|
| ElevenLabs key on staging | Set. `/api/config` reports `stt: true`. |
| ElevenLabs word check, tested on the server 5 times with a recorded Wendy line | 5 of 5 correct, 0.3 to 0.4 s each. |
| Kiosk screams 21 to 28 and 30 (26 Nov 17:48 to 27 Nov 04:07 UTC) | Word heard correctly every time ("Wendy's", "KFC", "Pizza Hut"), 1.6 to 3.2 s. |
| Kiosk screams 29 and 31 (27 Nov 04:05 and 04:08 UTC) | `stt.err: "timeout"` after 9 s, no words, saved as a loss with score 60. |
| Chrome's own speech check on the kiosk | Still hears nothing on Android (0 results on every row). Server hearing is the only thing that works there. |

So ElevenLabs itself is healthy. Two things combine to make it look broken.

### Cause A: the recording sometimes does not reach our server in time

For scream 29 the kiosk sent the recording at about 04:05:29 UTC. nginx only received it at 04:07:02, about 90 seconds late, together with the recording from the retry. The small "save the scream" request sent in between arrived instantly. For scream 31 the recordings never arrived at all.

The recording is about 105 KB once packed as text. A request that size stalling while tiny requests pass points at the kiosk's upload link (mobile broadband) or at a stale connection, not at our code or ElevenLabs. The page gives up after a single 9 second try and never tries again.

This is not proven from here: I cannot see the kiosk's network. The fix below covers both explanations.

### Cause B: a later change turned "could not hear" into "you lose"

When server hearing shipped (ac71d56), a failed check fell back to the host choosing the result. Commit 3d6d3a8 (27 Nov) removed the host screen because the kiosk runs unattended. Since then:

1. First failed check: the guest is sent back to try again.
2. Second failed check: the scream is saved with no words, so accuracy is 0 and the guest loses, however loud and correct they were.

Screams 29 and 31 are exactly this: loud (peak -2.6 and -0.6 dB), the word check timed out twice, result "lost".

### Smaller findings

- Mic too hot: every kiosk scream is clipping (10 to 74 % of samples, peaks at -0.6 to -3 dB). The two failures were the most distorted ones (32 % and 74 %). ElevenLabs coped at 10 to 17 %; above that is untested.
- Scream 27 came back partly in Hindi script ("Wendy's के लिए"). The word was still found, but the transcript is shown on screen.
- The server keeps no record of hearing requests, so a late or lost recording can only be found in the nginx log.
- nginx closes idle connections after 5 seconds for this site, so the kiosk always opens a new connection for the recording.
- The app prints the kiosk and admin PINs into the server log every time it starts.

## 2. Design

### 2.1 Kiosk: make the upload small and persistent (`public/kiosk/scream.html`)

- `startRec()`: record at 24 kbps instead of 48 kbps (`audioBitsPerSecond: 24000`). A 10 s scream drops from about 78 KB to about 35 KB.
- `hearOnServer()`: send the recording as raw bytes (`fetch("/api/kiosk/hear", { body: blob, headers: { "Content-Type": blob.type, "X-Station": K.station } })`) instead of base64 inside JSON. Saves another third. Final upload about 35 KB instead of 105 KB.
- Two tries instead of one: try 1 with a 5 s limit, try 2 with a 6 s limit, each with its own `AbortController` so a stalled request is really cancelled and the second try opens a fresh request. Total wait stays about the same as today's 9 s.
- Warm the connection: when the scream window closes (before the 1.3 s pause that already exists), send a tiny `GET /api/ping` so the connection is open before the recording goes.
- Diagnostics: `STT` gains `tries`, and per try `ms` and `err`; all saved in the `speech` JSON as today.

### 2.2 Server (`server/index.js`, `server/hear.js`)

- `/api/kiosk/hear` accepts a raw audio body (`express.raw({ type: "audio/*", limit: "4mb" })` on this route only) and still accepts the old JSON form, so a kiosk with a cached page keeps working.
- `hear()`: 4 s limit per call, and one automatic second call if ElevenLabs answers with a 5xx or times out.
- Keep only Latin letters, digits and basic punctuation in the returned text, so another script never shows on screen.
- Log one line per hearing request: bytes, milliseconds, characters heard or the error. No audio and no PINs.
- Add `GET /api/ping` (returns `{ ok: true }`, no PIN needed, no data).
- Stop printing PINs in the start-up message.

### 2.3 What the guest sees when hearing fails twice (owner decision needed)

Today (the owner's "no host screen" rule, CLAUDE.md): a second miss is scored as it stands, which in practice is a loss. That rule was made before we knew uploads could stall. Proposed: keep "no buttons that award a win", but never save a loss for a technical failure. Options:

- A (recommended): after the second failure show "Our ears are not working. Please tell the team." The attempt is not used and nothing is saved, so the guest can play again when it works.
- B: keep the retry loop going (up to 3 tries), then A.
- C: bring back the host buttons behind the kiosk PIN, so only staff can decide.

### 2.4 Mic level (event set-up, no code)

Turn the kiosk's mic input down until a full scream peaks around -6 dB and the clipping warning in Station settings stays off. Add this to `docs/SETUP.md`.

### 2.5 Not changing

- Scoring, thresholds, wording, consent text, layout.
- Chrome's speech check stays as a second opinion (it works on laptops).
- nginx settings: the warm-up request makes the 5 s idle close harmless.

## 3. Test plan

| Test | How | Pass when |
|---|---|---|
| Normal path | Local server with a stand-in speech service | Word returned, guest wins, `tries: 1` saved |
| First upload stalls | Stand-in that ignores the first request | Second try succeeds inside 11 s, `tries: 2` saved |
| Both stall | Stand-in that ignores everything | Retry screen, then the chosen 2.3 screen; no loss saved |
| Old cached page | Post the old JSON form | Still answered |
| Real service | On staging from `127.0.0.1`, recorded line | Correct words, under 2 s |
| Real kiosk | Owner screams on the Android kiosk, I read the `speech` rows | Words heard; upload size about 35 KB |
| Smoke | `node scripts/kiosk-check.mjs` and an upright walk | No page errors |

Cannot be tested from here: the venue's network and a real distorted scream. Those need the kiosk.

## 4. Rollout and rollback

1. Build on a branch, run the tests above.
2. Push to `main` and the demo only on the owner's word. Staging deploys itself within about 2 minutes.
3. Reload the kiosk page once so it picks up the new version.
4. Rollback: revert the one commit and push. `ELEVENLABS_STT_MODEL=off` is not a rollback on the Android kiosk, because without server hearing no word is heard there at all.
