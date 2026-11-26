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

// Delivery directions the voice model may be given. Anything else in square brackets is dropped.
const DIRECTIONS = ["playfully sarcastic", "teasing", "smug", "deadpan", "mock impressed", "amused", "cheerfully", "warmly", "chuckles", "short pause"];
const lettersOnly = (s) => String(s || "").toLowerCase().replace(/\[[^\]]*\]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const takesDirections = () => /^eleven_v[3-9]/.test(config.voice.model);

// What Wendy actually says. The roast writer supplies a script with directions like [teasing]; it is used only if,
// with the directions removed, it is word for word the roast on the screen. Otherwise a simple standard delivery is used.
export function speakable(text, script) {
  const plain = String(text || "").replace(/\s+/g, " ").trim().slice(0, 700);
  if (!plain || !takesDirections()) return plain;
  const cleaned = String(script || "").replace(/\[([^\]]*)\]/g, (m, d) => DIRECTIONS.includes(d.trim().toLowerCase()) ? `[${d.trim().toLowerCase()}]` : " ").replace(/\s+/g, " ").trim();
  if (cleaned.includes("[") && lettersOnly(cleaned) === lettersOnly(plain)) return cleaned.slice(0, 900);
  // standard delivery: tease through the roast, warm on the last sentence
  const parts = plain.match(/[^.!?]+[.!?]+["”']?\s*|[^.!?]+$/g) || [plain];
  if (parts.length < 2) return `[playfully sarcastic] ${plain}`;
  return `[playfully sarcastic] ${parts.slice(0, -1).join("").trim()} [warmly] ${parts[parts.length - 1].trim()}`;
}

// Starts making the voice-over. Returns straight away. `script` is the roast writer's version with delivery directions.
export function startVoice(token, text, script) {
  const say = speakable(text, script);
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
