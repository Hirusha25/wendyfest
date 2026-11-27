// Scream & Win: turns the recorded scream into words on the server (ElevenLabs speech-to-text).
// Chrome's own speech recognition hears nothing on the Android kiosk, so the kiosk sends the recording here instead.
// If there is no key, or the service fails or is slow, this returns no words and the kiosk falls back to Chrome / the host.
import { config } from "./config.js";

export const hearEnabled = () => !!config.voice.apiKey && config.voice.sttModel !== "off";

const EXT = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav" };

async function ask(audio, type, ms) {
  const form = new FormData();
  form.append("model_id", config.voice.sttModel);
  form.append("language_code", "en");
  form.append("tag_audio_events", "false");   // we want the word, not "(screaming)"
  form.append("file", new Blob([audio], { type }), `scream.${EXT[type] || "webm"}`);
  const res = await fetch(`${config.voice.baseUrl}/v1/speech-to-text`, { method: "POST", headers: { "xi-api-key": config.voice.apiKey }, body: form, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const out = await res.json();
  // drop any sound tags, and anything that is not Latin script (the service sometimes answers in another script)
  return String(out?.text || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/[^ -ɏ‘’]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

// One call of up to 4 s. If the service fails quickly (not a slow answer), it is asked once more; the kiosk also sends again by itself.
export async function hear(audio, mime = "audio/webm") {
  const type = String(mime || "audio/webm").split(";")[0].trim().toLowerCase(), t0 = Date.now();
  try { return await ask(audio, type, 4_000); }
  catch (e) { if (e?.name === "TimeoutError" || Date.now() - t0 > 1_500) throw e; return ask(audio, type, 2_500); }
}
