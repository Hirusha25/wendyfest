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
// Scream & Win result lines Wendy says. A random one plays: WIN when the guest wins, QUIET when the word was right but not loud enough.
const WIN = [
  "[excited] Now that is how you say it! [smug] Wendy's. Loud and clear. [cheerfully] You win!",
  "[mock impressed] Wow. My ears are ringing. [cheerfully] That was perfect. You win!",
  "[excited] Yes! That is my name! [teasing] Say it just like that when you order. [cheerfully] You win!",
  "[amused] Okay, okay, I heard you. [smug] The whole place heard you. [cheerfully] We have a winner!",
  "[cheerfully] Loud. Clear. Correct. [smug] I like you already. [excited] You win!",
  "[excited] We have a winner! [teasing] Somebody has been practising at home.",
];
const QUIET = [
  "[teasing] I heard Wendy's. [deadpan] Just about. [playfully sarcastic] Was that a shout, or a secret?",
  "[amused] Right word. Wrong volume. [teasing] My grill is louder than that.",
  "[deadpan] Sorry, did somebody whisper? [cheerfully] You said it right. Now say it louder!",
  "[teasing] That was Wendy's, in a classroom voice. [cheerfully] Next time, let it out!",
  "[playfully sarcastic] Very polite. Very quiet. [teasing] This is a scream booth, not a meeting.",
  "[amused] You got my name right. [smug] Now tell the people at the back.",
];
// NOS: the guest said "Wendy" without the S.
const NOS = [
  "[teasing] So close. [deadpan] But my name has an S at the end. [cheerfully] It is Wendy's!",
  "[amused] Wendy? [playfully sarcastic] Who is Wendy? [smug] Around here, we say Wendy's.",
  "[mock impressed] Great shout. [teasing] But you dropped something. An S. [cheerfully] It is Wendy's!",
  "[deadpan] Almost my name. [teasing] You forgot the last letter. [cheerfully] Wendy's, with an S.",
  "[teasing] Wendy is nice. [smug] Wendy's is better. [cheerfully] Do not forget the S!",
  "[amused] One letter short. [playfully sarcastic] And it was the important one. [cheerfully] Wendy's!",
];
const HERE = "[cheerfully] Okay. Here comes the roast!";
const save = async (file, r) => { if (!r.ok) { console.log("FAILED", path.basename(file), r.status, (await r.text()).slice(0, 200)); return; } const b = Buffer.from(await r.arrayBuffer()); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, b); console.log("made", path.relative(pub, file), b.length, "bytes"); };
for (const [name, [text, secs]] of Object.entries(SFX)) { if (only && !only.includes(name)) continue;
  await save(path.join(pub, "assets/sfx", name + ".mp3"), await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", { method: "POST", headers: H, body: JSON.stringify({ text, duration_seconds: secs, prompt_influence: 0.6 }) })); }
const say = (text) => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`, { method: "POST", headers: H, body: JSON.stringify({ text, model_id: "eleven_v4", voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true } }) });
for (let i = 0; i < WAIT.length; i++) { if (only && !only.includes("wait")) continue; await save(path.join(pub, "assets/voice", `wait-${i + 1}.mp3`), await say(WAIT[i][0])); }
if (!only || only.includes("here")) await save(path.join(pub, "assets/voice", "here-it-comes.mp3"), await say(HERE));
for (const [kind, list] of [["win", WIN], ["quiet", QUIET], ["nos", NOS]]) for (let i = 0; i < list.length; i++) { if (only && !only.includes("say-" + kind)) continue; await save(path.join(pub, "assets/voice", `${kind}-${i + 1}.mp3`), await say(list[i])); }
console.log("WAIT TEXT", JSON.stringify(WAIT.map((w) => w[1])));
