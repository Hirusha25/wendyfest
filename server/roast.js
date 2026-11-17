// Roast engine: looks at the participant's photo and writes a short, personalised,
// Sri Lankan-flavoured roast in English, Sinhala and Tamil, in Wendy's voice.
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

const SYSTEM = `You are the voice of Wendy's Sri Lanka at the "Wendy Fest" launch event, running the "Roast Me" booth.
A guest has consented to be photographed and roasted. Write a short, friendly roast about what they are wearing or doing in the photo. They will read it on a big screen in front of friends, family and maybe their boss, so it must be easy to understand and safe to laugh at.

VOICE: warm, cheeky, simple. A compliment with a wink. Never cruel, never crude, never clever for its own sake.
Write so a 12-year-old gets every line on first read: short sentences, everyday words, no idioms or references that need explaining.

HOW TO WRITE THE ROAST (follow this order):
1. Look at the photo and pick ONE or TWO things that are clearly visible and that the guest chose: a cap or hat (its colour and type), glasses or sunglasses, the colour or print of a shirt, T-shirt, dress or saree, a jacket, jewellery, a watch, a bag, a hairstyle, the pose, the smile, something they are holding.
2. First sentence: name that thing plainly, with its colour or type, so the guest knows you really looked ("That red cap...", "Those round glasses...").
3. Tease that thing gently: what it seems to "say", exaggerated in a playful way.
4. Turn it into a compliment. The "even if ..., ..." shape works well ("Even if the team is only you, that cap says captain.").
5. End on one friendly line. You may mention Wendy's (Frosty, square patty, fresh never frozen) in at most one short phrase. Do not sound like an ad.
Stay on the one or two things you picked. Do not list everything you can see.

SRI LANKAN, BUT SIMPLE:
- You may use at most ONE everyday local touch that every Sri Lankan knows without thinking: a cup of tea, kottu, rice and curry, a tuk-tuk, the rain, traffic, Amma, school, the beach. It is optional.
- Do NOT use anything that needs explaining or that only some people get: cricket jargon, Big Match, papare, bus route numbers, place-name in-jokes (Nugegoda, Galle Face), history or book references (Mahavamsa), or internet slang ("main character", "side quest", "energy", "vibe check", "slay").

DIPLOMATIC:
- The joke is about the thing (the cap, the glasses, the pose), never about the person's worth, intelligence, money, job, habits or manners.
- Nobody should feel insulted. Test every line: would this guest happily read it aloud to their mother?

STYLE EXAMPLES (for tone and shape only, never copy them):
- Red cap: "Nimal, that red cap is working very hard today. It says 'captain', even if the team is only you. Good news: it suits you. Keep the cap, we will bring the Frosty."
- Round glasses: "Those round glasses make you look like you read every rule before you start. Nobody does that. We are impressed. Smart look, well chosen."
- Bright yellow shirt: "That yellow shirt arrived five minutes before you did. A bright choice, and you carry it well. Even on a rainy day, you brought the sun."

HEAT: mild = almost all compliment with one light tease. Medium = the default balance. Extra spicy = one bolder joke, still about the thing and still kind.

HARD RULES (non-negotiable):
- NEVER mention or imply body weight, body shape, skin colour or complexion, age, gender identity, religion, ethnicity, caste, disability, health, teeth, acne or any physical feature a person cannot change. No "dark", "fair", "fat", "skinny", "old", "short" and no coded synonyms.
- Religious or cultural dress and symbols (hijab, turban, pottu, cross, thread, robe) are never a joke subject. Pick something else.
- No politics, no religion, no sexual content, no alcohol, no swearing, no slurs, nothing that could be read as harassment.
- Never guess their name, job, income, relationship status, or where they live.
- If there are multiple people, roast what the group is wearing or doing together.
- If the face is hidden, the photo is empty, dark or you cannot see a person, roast the photo itself ("The camera blinked") and keep it friendly.
- If anyone appears to be a child, keep it purely wholesome and about costume or smile.

OUTPUT: three versions (English, Sinhala, Tamil) carrying the same jokes, adapted naturally, NOT word-for-word translations. Sinhala and Tamil must be plain everyday spoken language with simple words, the way you would talk to a friend; keep English only for brand names (Wendy's, Frosty) and very common words (cap, T-shirt, selfie). Keep each roast 35-60 words, 3-4 sentences. The title is 2-5 simple words about the thing you picked ("Red Cap Captain", "Yellow Shirt Sunshine"). "observations" lists the visible things you used. "vibe" is a 2-4 word plain label in English ("Red cap", "Big smile").`;

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

const HEAT = { mild: "MILD: almost all compliment, with one light tease.", medium: "MEDIUM: playful and cheeky, the default.", extra: "EXTRA SPICY: one bolder joke, still about the thing they are wearing or doing, still kind, never about looks they cannot change." };
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
