// Roast voice-over: turns the English roast into speech with ElevenLabs, in the voice chosen for Wendy.
// It runs in the background after the roast is written, so the roast screen never waits for it.
// If there is no key or voice, or the service fails, there is simply no voice-over: the booth carries on.
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

const pending = new Map(); // roast token -> Promise<boolean> while the audio is being made

export const voiceEnabled = () => !!(config.voice.apiKey && config.voice.voiceId);
export const voiceFile = (token) => path.join(config.photoDir, `${String(token).replace(/[^A-Za-z0-9_-]/g, "")}.mp3`);

async function speak(token, text) {
  const url = `${config.voice.baseUrl}/v1/text-to-speech/${encodeURIComponent(config.voice.voiceId)}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": config.voice.apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: config.voice.model, voice_settings: { stability: config.voice.stability, similarity_boost: 0.8, style: config.voice.style, use_speaker_boost: true } }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length < 1000) throw new Error("ElevenLabs sent back an empty sound file");
  const file = voiceFile(token);
  fs.writeFileSync(file + ".part", audio); fs.renameSync(file + ".part", file);
  return true;
}

// Starts making the voice-over. Returns straight away.
export function startVoice(token, text) {
  const say = String(text || "").replace(/\s+/g, " ").trim().slice(0, 700);
  if (!voiceEnabled() || !say) return;
  const job = speak(token, say).catch((e) => { console.error("Roast voice-over failed:", e?.message || e); return false; }).finally(() => pending.delete(token));
  pending.set(token, job);
}

// Waits (up to ms) for a voice-over that is still being made, then says whether the file is there.
export async function voiceReady(token, ms = 15_000) {
  const job = pending.get(token);
  if (job) await Promise.race([job, new Promise((r) => setTimeout(r, ms))]);
  return fs.existsSync(voiceFile(token));
}
