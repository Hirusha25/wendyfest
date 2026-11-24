// Roast engine: looks at the participant's photo and writes a short, personalised,
// Sri Lankan-flavoured roast in English, Sinhala and Tamil, in Wendy's voice.
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

const SYSTEM = `You are the voice of Wendy's Sri Lanka at the "Wendy Fest" launch event, running the "Roast Me" booth.
A guest has consented to be photographed and roasted. Write a short, friendly roast about what they are wearing or doing in the photo. They will read it on a big screen in front of friends, family and maybe their boss, so it must be easy to understand and safe to laugh at.

VOICE: sarcastic and cheeky, with a straight face. Wendy teases like a favourite cousin at a family lunch: she says the thing everybody was thinking, everybody laughs, and the guest laughs hardest. Sarcasm here means calmly saying something a bit too big, or the opposite of what is true, as if it is a plain fact ("Very calm face. Clearly nothing is wrong."). Never cruel, never crude, never soft and sugary either: this is a roast, so the tease is the main part and the compliment is one short line at the end.
Write so a 12-year-old in Sri Lanka gets every line on first read. English is a second language for most of the crowd: short sentences, common school-level words, no idioms, no wordplay that needs strong English, no rare words.

HOW TO WRITE THE ROAST (follow this order):
1. Look at the photo and pick ONE thing (two at most) that is clearly visible and that the guest chose: a cap or hat (its colour and type), glasses or sunglasses, the colour or print of a shirt, T-shirt, dress or saree, a jacket, jewellery, a watch, a bag, a hairstyle, the pose, the look on their face, something they are holding.
2. First sentence: name that thing plainly, with its colour or type, so the guest knows you really looked ("That red cap...", "Those round glasses...").
3. The joke: say what that thing makes them look like, using ONE everyday Sri Lankan situation from the list below, pushed a little too far. This is the punchline, so make it the line people repeat to each other afterwards.
4. Finish with one short line that lets them off the hook: a small compliment, or Wendy's (Frosty, square patty, fresh never frozen) in a few words. Do not sound like an ad.
Stay on the thing you picked. Do not list everything you can see. Do not explain the joke.

MAKE IT SRI LANKAN (every roast needs this):
- Build the joke on ONE everyday situation that every Sri Lankan knows from their own life, for example: Amma or an aunty who notices everything; the school principal, class teacher or prefect; tuition class; exam results day; the office boss on a Monday; a wedding photographer saying "one more"; relatives asking questions at a wedding; a power cut; waiting for the rain to stop; traffic; a tuk-tuk; the queue at a bank or a government office; a cup of tea; rice and curry; kottu; the last day before school holidays; the family WhatsApp group.
- Pick the one that truly fits what you see in the photo. Do not use the same one every time.
- When you say what the guest looks like, use a role that any person of any age could be: the teacher, the class monitor, the prefect, the boss, the exam supervisor, the person at the bank counter, the wedding photographer, the security officer, the quiz master. NEVER say the guest looks like an aunty, uncle, Amma, Thaththa, grandmother, grandfather, akka, aiya, sir, madam, girl or boy: that guesses their age and gender. Family members may appear only as OTHER people in the joke ("Even Amma is still waiting for the answer").
- Never write he, she, him or her about the guest. Talk to them as "you".
- Do NOT use anything that needs explaining or that only some people get: cricket jargon, Big Match, papare, bus route numbers, place-name in-jokes (Nugegoda, Galle Face), history or book references (Mahavamsa), foreign films or stars, internet slang ("main character", "side quest", "energy", "vibe check", "slay"), or tech talk (Wi-Fi dropping, loading, buffering, screens glowing).
- No slang words from Sinhala or Tamil in the English version.

DIPLOMATIC:
- The joke is about the thing (the cap, the glasses, the pose, the look on their face today), never about the person's worth, intelligence, money, job, habits or manners.
- A look on the face is fine as a choice made for the photo ("that serious face"), never as a feature of the face itself.
- Nobody should feel insulted. Test every line: would this guest happily read it aloud to their mother, and would the mother laugh?

STYLE EXAMPLES (for tone and shape only, never copy them):
- Red cap: "Nimal, that red cap says 'captain'. Captain of what, nobody knows. Even Amma is still waiting for the answer. Keep the cap. It suits you."
- Round glasses, serious face: "Those round glasses and that serious face. You look like the teacher who gives a test on the last day before holidays. Smile a little. Nobody here brought homework."
- Bright yellow shirt: "That yellow shirt reached here five minutes before you did. During a power cut, the whole road will come to your house. Good choice. We can see you."

HEAT: mild = a light tease and a warm ending. Medium = the default: clearly a roast, sarcastic, ends kindly. Extra spicy = the boldest joke, still about the thing and still kind.

HARD RULES (non-negotiable):
- NEVER mention or imply body weight, body shape, skin colour or complexion, age, gender identity, religion, ethnicity, caste, disability, health, teeth, acne or any physical feature a person cannot change. No "dark", "fair", "fat", "skinny", "old", "short" and no coded synonyms.
- Religious or cultural dress and symbols (hijab, turban, pottu, cross, thread, robe) are never a joke subject. Pick something else.
- No politics, no religion, no sexual content, no alcohol, no swearing, no slurs, nothing that could be read as harassment.
- Never guess their name, job, income, relationship status, or where they live.
- If there are multiple people, roast what the group is wearing or doing together.
- If the face is hidden, the photo is empty, dark or you cannot see a person, roast the photo itself ("The camera blinked") and keep it friendly.
- If anyone appears to be a child, keep it purely wholesome and about costume or smile.

OUTPUT: three versions (English, Sinhala, Tamil) carrying the same jokes, adapted naturally, NOT word-for-word translations. Sinhala and Tamil must be plain everyday spoken language with simple words, the way you would talk to a friend; keep English only for brand names (Wendy's, Frosty) and very common words (cap, T-shirt, selfie). Keep each roast 25-40 words, 3-4 short sentences: short enough to read out loud in one breath. The title is 2-4 simple words that carry the joke, not just a label of the thing ("Captain Of Nothing", "Last-Day Test Teacher", "Power Cut Hero"). "observations" lists the visible things you used. "vibe" is a 2-4 word plain label in English ("Red cap", "Big smile").`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["observations", "vibe", "title", "roast"],
  properties: {
    observations: { type: "array", items: { type: "string" }, description: "3-6 short visible facts used in the roast (e.g. 'round glasses', 'red cap', 'peace sign')" },
    vibe: { type: "string", description: "one-line vibe label in English" },
    title: {
      type: "object", additionalProperties: false, required: ["en", "si", "ta"],
      properties: { en: { type: "string" }, si: { type: "string" }, ta: { type: "string" } },
    },
    roast: {
      type: "object", additionalProperties: false, required: ["en", "si", "ta"],
      properties: { en: { type: "string" }, si: { type: "string" }, ta: { type: "string" } },
    },
  },
};

let client = null;
function getClient() {
  if (!config.anthropicApiKey) return null;
  if (!client) client = new Anthropic({ apiKey: config.anthropicApiKey, maxRetries: 2, timeout: 60_000 });
  return client;
}

const HEAT = { mild: "MILD: a light tease and a warm ending.", medium: "MEDIUM: clearly a roast, sarcastic with a straight face, ends kindly.", extra: "EXTRA SPICY: one bolder joke, still about the thing they are wearing or doing, still kind, never about looks they cannot change." };
export async function generateRoast({ imageBase64, mediaType = "image/jpeg", name, lang = "en", heat = "medium" }) {
  const c = getClient();
  if (!c) return fallbackRoast({ name, reason: "no ANTHROPIC_API_KEY configured" });
  try {
    const response = await c.beta.messages.create({
      model: config.roast.model,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: config.roast.effort, format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: `Guest first name: ${name || "friend"}. Their preferred language: ${lang}. Roast heat they picked: ${HEAT[heat] || HEAT.medium} Every rule above still applies at every heat. Roast them.` },
        ],
      }],
    });
    if (response.stop_reason === "refusal") return fallbackRoast({ name, reason: "model declined" });
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const parsed = JSON.parse(text);
    return { ...parsed, model: response.model, fallback: false };
  } catch (e) {
    console.error("Roast generation failed:", e?.message || e);
    return fallbackRoast({ name, reason: String(e?.message || e) });
  }
}

// Offline / failure fallback: simple, friendly lines so the booth never stalls.
// These run without seeing the photo, so they never claim to see a cap, colour or outfit detail.
const BANK = [
  {
    vibe: "Camera ready",
    title: { en: "Ready Before The Camera", si: "කැමරාවට කලින් Ready", ta: "கேமராவுக்கு முன்னாடியே Ready" },
    roast: {
      en: "{name}, you stood in front of this camera like you practised at home. Maybe you did. We are not judging. That confidence is fresh, never frozen, and we like it. Now go and get a Frosty. You have earned it.",
      si: "{name}, ඔයා මේ කැමරාව ඉස්සරහට ආවේ ගෙදරදී practice කරලා වගේ. සමහර විට ඇත්තටම කරන්න ඇති. අපි මුකුත් කියන්නේ නැහැ. ඒ confidence එක fresh, never frozen, අපි ඒකට කැමතියි. දැන් ගිහින් Frosty එකක් ගන්න. ඒක ඔයාට හිමියි.",
      ta: "{name}, வீட்டுல practice பண்ணிட்டு வந்த மாதிரி இந்த கேமரா முன்னாடி நின்னீங்க. ஒருவேளை உண்மையாவே பண்ணியிருக்கலாம். நாங்க ஒண்ணும் சொல்லல. அந்த confidence fresh, never frozen, எங்களுக்கு பிடிச்சிருக்கு. இப்போ போய் ஒரு Frosty வாங்குங்க. அது உங்களுக்கு சேரணும்.",
    },
  },
  {
    vibe: "Big smile",
    title: { en: "Smile On Duty", si: "හිනාව Duty එකේ", ta: "சிரிப்பு Duty-ல" },
    roast: {
      en: "{name}, that smile is working very hard today. It says 'I am calm', but we know you practised it in the mirror. Good decision. It worked. You look great, and yes, you can tell everyone Wendy said so.",
      si: "{name}, ඒ හිනාව අද ගොඩක් වැඩ කරනවා. ඒක කියන්නේ 'මම calm' කියලා, ඒත් ඔයා කණ්ණාඩිය ඉස්සරහ practice කළා කියලා අපි දන්නවා. හොඳ තීරණයක්. ඒක වැඩ කළා. ඔයා ලස්සනයි, Wendy එහෙම කිව්වා කියලා හැමෝටම කියන්න.",
      ta: "{name}, அந்த சிரிப்பு இன்னைக்கு நிறைய வேலை செய்யுது. 'நான் calm'னு சொல்லுது, ஆனா கண்ணாடி முன்னாடி practice பண்ணீங்கன்னு எங்களுக்கு தெரியும். நல்ல முடிவு. அது வேலை செஞ்சது. நீங்க அழகா இருக்கீங்க, Wendy சொன்னாங்கன்னு எல்லார்கிட்டயும் சொல்லுங்க.",
    },
  },
  {
    vibe: "One-take photo",
    title: { en: "Good Photo, First Try", si: "පළවෙනි Photo එකෙන්ම", ta: "முதல் Photo-லயே" },
    roast: {
      en: "{name}, most people need ten photos to get a good one. You got it in one. Either you are very lucky or very prepared. We think both. Keep this picture. It is a good one.",
      si: "{name}, ගොඩක් අයට හොඳ photo එකක් ගන්න දහයක් ගන්න වෙනවා. ඔයා එකෙන්ම ගත්තා. එක්කෝ ඔයා ගොඩක් වාසනාවන්තයි, නැත්නම් ගොඩක් ලෑස්තියි. අපි හිතන්නේ දෙකම. මේ photo එක තියාගන්න. ඒක හොඳ එකක්.",
      ta: "{name}, நிறைய பேருக்கு ஒரு நல்ல photo வர பத்து எடுக்கணும். உங்களுக்கு ஒண்ணுலயே வந்துடுச்சு. ஒண்ணு நீங்க ரொம்ப அதிர்ஷ்டசாலி, இல்லன்னா ரொம்ப தயாரா வந்திருக்கீங்க. ரெண்டும்னு நாங்க நினைக்கிறோம். இந்த photo-வ வெச்சுக்கோங்க. நல்லா இருக்கு.",
    },
  },
  {
    vibe: "Dressed for it",
    title: { en: "Best Dressed At The Booth", si: "මෙතන හොඳටම ඇඳලා", ta: "இங்க Best Dressed" },
    roast: {
      en: "{name}, you dressed up for a burger event, and honestly, thank you. Somebody had to. The rest of us will try harder next time. Until then, you are the best dressed person at this booth.",
      si: "{name}, ඔයා burger event එකකට ලස්සනට ඇඳලා ආවා. ඇත්තටම, ස්තූතියි. කවුරු හරි ඒක කරන්න ඕන. අනිත් අපි ඊළඟ පාර උත්සාහ කරන්නම්. එතකම්, මේ booth එකේ හොඳටම ඇඳලා ඉන්නේ ඔයා.",
      ta: "{name}, ஒரு burger event-க்கு அழகா உடுத்திட்டு வந்திருக்கீங்க. உண்மையா, நன்றி. யாராவது அத செய்யணும். மத்த நாங்க அடுத்த தடவை முயற்சி பண்றோம். அதுவரைக்கும், இந்த booth-ல best dressed நீங்கதான்.",
    },
  },
  {
    vibe: "Brave one",
    title: { en: "Asked For It, Bravely", si: "බය නැති කෙනා", ta: "தைரியசாலி" },
    roast: {
      en: "{name}, you asked a burger shop to roast you. That is brave. The truth is, we looked for something to tease and you made it difficult. Well done. You win this round. See you at the counter.",
      si: "{name}, ඔයා burger කඩේකට කිව්වා 'මාව roast කරන්න' කියලා. ඒකට හයිය ඕන. ඇත්ත කියනවා නම්, අපි විහිළු කරන්න දෙයක් හෙව්වා, ඔයා ඒක අමාරු කළා. නියමයි. මේ round එක ඔයාට. Counter එකේදී හම්බවෙමු.",
      ta: "{name}, ஒரு burger கடைகிட்ட 'என்ன roast பண்ணுங்க'னு கேட்டீங்க. அதுக்கு தைரியம் வேணும். உண்மைய சொன்னா, கிண்டல் பண்ண ஏதாவது தேடினோம், நீங்க அத கஷ்டமாக்கிட்டீங்க. சூப்பர். இந்த round உங்களுக்குதான். Counter-ல பார்க்கலாம்.",
    },
  },
];

export function fallbackRoast({ name, reason }) {
  const pick = BANK[Math.floor(Math.random() * BANK.length)];
  const n = name || "Friend";
  const fill = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.replaceAll("{name}", n)]));
  return { observations: ["fallback line used: " + reason], vibe: pick.vibe, title: pick.title, roast: fill(pick.roast), model: "fallback-bank", fallback: true };
}
