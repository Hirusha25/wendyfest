// Makes the kiosk's sound effects and Wendy's pre-recorded waiting lines with ElevenLabs (key read from .env, never printed).
// Usage: node el_assets.mjs <.env> <public dir> [only=name,name]
import fs from "node:fs"; import path from "node:path";
const [envPath, pub, onlyArg] = process.argv.slice(2); const only = onlyArg ? onlyArg.replace("only=", "").split(",") : null;
const env = Object.fromEntries(fs.readFileSync(envPath, "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const H = { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" };
const SFX = {
  tap: ["soft bright UI button tap, single clean pop click, no reverb", 0.5],
  key: ["single chunky arcade keypad key press, short plastic click with a tiny bright blip", 0.5],
  delete: ["short soft backspace blip, one quick descending tone", 0.5],
  go: ["bright positive confirm chime, two quick ascending notes, playful game interface", 1],
  error: ["short friendly wrong-answer sound, soft low double buzz, not harsh", 0.8],
  whoosh: ["quick soft airy swoosh, screen transition", 0.6],
  beep: ["single short game show countdown beep, clear mid tone", 0.5],
  shutter: ["camera shutter click with a quick flash pop", 0.8],
  sizzle: ["burger patty sizzling steadily on a hot flat grill, close up, constant, no music, no voices", 6],
  win: ["short triumphant winning fanfare, bright brass with sparkling chimes, game show jackpot", 2.5],
  lose: ["playful sad trombone, three descending wah notes, short and comedic", 1.8],
  reveal: ["short snare drum roll building for one second, then a bright ta-da brass fanfare hit with a cymbal crash, game show reveal", 3],
};
const WAIT = [
  ["[amused] Okay. Let me have a good look at you.", "Okay. Let me have a good look at you."],
  ["[teasing] Hmm. Interesting choices today.", "Hmm. Interesting choices today."],
  ["[deadpan] Do not move. I am thinking.", "Do not move. I am thinking."],
  ["[playfully sarcastic] Oh, this is going to be good.", "Oh, this is going to be good."],
  ["[smug] Warming up the grill, just for you.", "Warming up the grill, just for you."],
  ["[teasing] Adding a little extra sass. You can take it.", "Adding a little extra sass. You can take it."],
  ["[amused] Hold that smile. I am nearly done.", "Hold that smile. I am nearly done."],
  ["[cheerfully] Fresh roast, never frozen. Almost ready.", "Fresh roast, never frozen. Almost ready."],
];
const HERE = "[cheerfully] Okay. Here comes the roast!";
const save = async (file, r) => { if (!r.ok) { console.log("FAILED", path.basename(file), r.status, (await r.text()).slice(0, 200)); return; } const b = Buffer.from(await r.arrayBuffer()); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, b); console.log("made", path.relative(pub, file), b.length, "bytes"); };
for (const [name, [text, secs]] of Object.entries(SFX)) { if (only && !only.includes(name)) continue;
  await save(path.join(pub, "assets/sfx", name + ".mp3"), await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", { method: "POST", headers: H, body: JSON.stringify({ text, duration_seconds: secs, prompt_influence: 0.6 }) })); }
const say = (text) => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`, { method: "POST", headers: H, body: JSON.stringify({ text, model_id: "eleven_v4", voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true } }) });
for (let i = 0; i < WAIT.length; i++) { if (only && !only.includes("wait")) continue; await save(path.join(pub, "assets/voice", `wait-${i + 1}.mp3`), await say(WAIT[i][0])); }
if (!only || only.includes("here")) await save(path.join(pub, "assets/voice", "here-it-comes.mp3"), await say(HERE));
console.log("WAIT TEXT", JSON.stringify(WAIT.map((w) => w[1])));
