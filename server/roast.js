// Roast engine: looks at the participant's photo and writes a short, personalised,
// Sri Lankan-flavoured roast in English, Sinhala and Tamil, in Wendy's voice.
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

const SYSTEM = `You are the voice of Wendy's Sri Lanka at the "Wendy Fest" launch event, running the "Roast Me" booth.
A guest has consented to be photographed and roasted. Write them a roast they will want to screenshot and share.

VOICE (from the Wendy's brand playbook): dry, confident, quick, playful. Short punchy sentences. Never cruel, never crude.
Think "Serving the Sass": the roast is a compliment wearing a smirk. End on a line that makes them feel like the main character.

WHAT TO ROAST (only what is genuinely visible in the photo):
- outfit, colours, costume, fit, accessories (glasses, caps, earrings, watches, bags), hairstyle, facial hair, tattoos, pose, expression, energy, props, what they are holding.
- Mix in Sri Lankan life: Colombo traffic, the 138/145 bus, tuk-tuk fare negotiation, "five minutes away", Galle Face evenings, Kandy, papare bands, Big Match season, cricket commentary from the sofa, kottu at midnight, short eats, Amma's packed lunch, machan/aiyo energy, rain in Nugegoda, power cuts, the group chat deciding where to eat for 47 minutes.
- Gently tie it back to Wendy's (fresh never frozen beef, square patties, Frosty, Baconator, Dave's Triple) in at most one line. Do not sound like an ad.

HARD RULES (non-negotiable):
- NEVER mention or imply body weight, body shape, skin colour or complexion, age, gender identity, religion, ethnicity, caste, disability, health, teeth, acne or any physical feature a person cannot change. No "dark", "fair", "fat", "skinny", "old", "short" and no coded synonyms.
- No politics, no religion, no sexual content, no alcohol, no swearing, no slurs, nothing that could be read as harassment.
- Never guess their name, job, income, relationship status, or where they live as a fact; playful speculation is fine ("you look like you argue with tuk drivers for sport").
- If there are multiple people, roast the group vibe together.
- If the face is hidden, the photo is empty, dark or you cannot see a person, roast the photo itself ("The camera blinked") and keep it friendly.
- If anyone appears to be a child, keep it purely wholesome and about costume/energy.

OUTPUT: three versions (English, Sinhala, Tamil). They should carry the same jokes, adapted naturally, NOT word-for-word translations. Use natural spoken Sinhala / Tamil as a Colombo 20-something would say it; English brand names (Wendy's, Frosty, Baconator) stay in English. Keep each roast 45-80 words, 3-5 sentences. The title is 2-6 words, like a nickname or a headline ("Main Character, Side Quest Energy").`;

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

export async function generateRoast({ imageBase64, mediaType = "image/jpeg", name, lang = "en" }) {
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
          { type: "text", text: `Guest first name: ${name || "friend"}. Their preferred language: ${lang}. Roast them.` },
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

// Offline / failure fallback: a bank of generic-but-local lines so the booth never stalls.
const BANK = [
  {
    vibe: "Main character energy",
    title: { en: "Main Character, Side Quest Energy", si: "ප්‍රධාන චරිතය, Side Quest ශක්තිය", ta: "மெயின் கேரக்டர், சைட் க்வெஸ்ட் எனர்ஜி" },
    roast: {
      en: "{name}, you walked up to this camera like the 138 bus finally stopped for you. The outfit says 'big plans', the face says 'five minutes away' for the last forty. The group chat is still deciding where to eat. You already decided. Respect. Fresh, never frozen, just like your confidence.",
      si: "{name}, ඔයා මේ කැමරාවට ආවේ 138 බස් එක අන්තිමේදී ඔයාට නැවැත්තුවා වගේ. ඇඳුම කියන්නේ 'ලොකු plans', මූණ කියන්නේ 'five minutes away' කියලා පැය බාගයක්. Group chat එක තාම කන්න තැනක් තෝරනවා. ඔයා දැනටමත් තෝරලා. Respect. Fresh, never frozen, ඔයාගේ confidence එක වගේමයි.",
      ta: "{name}, 138 பஸ் கடைசியா உங்களுக்காக நின்ன மாதிரி இந்த கேமராவுக்கு வந்தீங்க. உடை சொல்லுது 'பெரிய plans', முகம் சொல்லுது 'five minutes away' கடந்த அரை மணி நேரமா. குரூப் சாட் இன்னும் எங்க சாப்பிடுறதுன்னு முடிவு பண்ணல. நீங்க ஏற்கனவே முடிவு பண்ணிட்டீங்க. Respect. Fresh, never frozen, உங்க confidence மாதிரியே.",
    },
  },
  {
    vibe: "Tuk-tuk negotiator",
    title: { en: "Negotiates Every Bill Like A Tuk Fare", si: "හැම බිලක්ම ත්‍රීවීල් ගානක් වගේ කතා කරනවා", ta: "ஒவ்வொரு பில்லையும் டுக்-டுக் கட்டணம் போல பேரம்" },
    roast: {
      en: "{name}, that pose has 'I know a shortcut through Nugegoda' written all over it. You've never held a bat but you coach the whole country from the sofa. Your 'quick story' is longer than the Mahavamsa. Honestly? We'd still save you a Frosty. Don't make it weird.",
      si: "{name}, ඒ pose එකේ 'මම නුගේගොඩ හරහා shortcut එකක් දන්නවා' කියලා ලියලා තියෙනවා. ඔයා කවදාවත් bat එකක් අල්ලලා නැහැ, ඒත් sofa එකෙන් මුළු රටටම coach කරනවා. ඔයාගේ 'quick story' එක මහාවංශයට වඩා දිගයි. ඇත්තටම? අපි තාම ඔයාට Frosty එකක් තියාගන්නවා. Weird කරගන්න එපා.",
      ta: "{name}, அந்த போஸ்ல 'நுகேகொடை வழியா எனக்கு ஷார்ட்கட் தெரியும்'னு எழுதி இருக்கு. நீங்க வாழ்க்கையில பேட் பிடிச்சதில்ல, ஆனா சோஃபால இருந்து முழு நாட்டுக்கும் கோச். உங்க 'quick story' மகாவம்சத்தை விட நீளம். உண்மையா? இன்னும் உங்களுக்கு ஒரு Frosty வெச்சிருக்கோம். Weird பண்ணாதீங்க.",
    },
  },
  {
    vibe: "Papare band captain",
    title: { en: "Joined The Papare, Forgot The Match", si: "පපරේට එකතු වුණා, match එක අමතක වුණා", ta: "பப்பரேயில் சேர்ந்து மேட்சை மறந்தவர்" },
    roast: {
      en: "{name}, you look like you arrive at the Big Match for the papare and leave before the first wicket. That smile has survived at least three Colombo rush hours today. The fit is loud, the energy is louder, and somewhere a tuk driver is still waiting for you. Square patty, round applause.",
      si: "{name}, ඔයා Big Match එකට එන්නේ පපරේට, පළවෙනි wicket එකට කලින් යනවා වගේ. ඒ හිනාව අද කොළඹ rush hour තුනක්වත් survive කරලා. ඇඳුම loud, energy එක ඊටත් loud, කොහේ හරි ත්‍රීවීල් කාරයෙක් තාම ඔයා එනකම් බලන් ඉන්නවා. Square patty, round applause.",
      ta: "{name}, Big Match-க்கு பப்பரேக்காக வந்து முதல் விக்கெட்டுக்கு முன்னாடியே கிளம்புற ஆள் மாதிரி இருக்கீங்க. அந்த சிரிப்பு இன்னைக்கு குறைந்தது மூணு கொழும்பு ட்ராஃபிக்கை தாங்கி இருக்கு. உடை loud, energy இன்னும் loud, எங்கயோ ஒரு டுக் டிரைவர் இன்னும் உங்களுக்காக காத்திருக்கார். Square patty, round applause.",
    },
  },
];

export function fallbackRoast({ name, reason }) {
  const pick = BANK[Math.floor(Math.random() * BANK.length)];
  const n = name || "Machan";
  const fill = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.replaceAll("{name}", n)]));
  return { observations: ["fallback line used: " + reason], vibe: pick.vibe, title: pick.title, roast: fill(pick.roast), model: "fallback-bank", fallback: true };
}
