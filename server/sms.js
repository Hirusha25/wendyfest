// SMS provider abstraction for Sri Lanka.
// provider = console (prints to terminal, default) | textware | notifylk | shoutout | dialog | http
import { config } from "./config.js";
import { db } from "./db.js";

const log = db.prepare("INSERT INTO sms_log(phone, body, provider, status, detail, kind) VALUES (?,?,?,?,?,?)");

// kind = which message this is (otp, welcome, win, lose, roast); only used for the counts on the admin page
export async function sendSms(phone, body, kind = null) {
  const p = config.sms.provider;
  let status = "sent", detail = "";
  try {
    if (p === "console") {
      console.log(`\n📱 SMS → +${phone} (sender ${config.sms.senderId})\n${body}\n`);
      detail = "console";
    } else if (p === "textware") {
      // TextWare EMG single-message API (v2.21): form POST, so the login never sits in a URL. Success answers "Operation success: <message id>".
      if (!config.sms.textwareUser || !config.sms.textwarePass) throw new Error("TEXTWARE_USER / TEXTWARE_PASS not set");
      const r = await fetch(config.sms.textwareUrl, {
        method: "POST", signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: config.sms.textwareUser, password: config.sms.textwarePass, src: config.sms.senderId, dst: phone, msg: body }),
      });
      detail = (await r.text()).trim(); if (!r.ok || !/operation success/i.test(detail)) status = "failed";
    } else if (p === "notifylk") {
      const u = new URL("https://app.notify.lk/api/v1/send");
      u.searchParams.set("user_id", config.sms.notifyUserId);
      u.searchParams.set("api_key", config.sms.notifyApiKey);
      u.searchParams.set("sender_id", config.sms.senderId);
      u.searchParams.set("to", phone);
      u.searchParams.set("message", body);
      const r = await fetch(u); detail = await r.text();
      if (!r.ok) status = "failed";
    } else if (p === "shoutout") {
      const r = await fetch("https://api.getshoutout.com/coreservice/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Apikey ${config.sms.shoutoutApiKey}` },
        body: JSON.stringify({ source: config.sms.senderId, destinations: [phone], content: { sms: body }, transports: ["sms"] }),
      });
      detail = await r.text(); if (!r.ok) status = "failed";
    } else if (p === "dialog") {
      // Dialog Axiata enterprise SMS gateway (eSMS). Endpoint differs per account; set DIALOG_SMS_URL.
      const r = await fetch(config.sms.dialogUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: config.sms.dialogUser, password: config.sms.dialogPass, from: config.sms.senderId, to: phone, text: body }),
      });
      detail = await r.text(); if (!r.ok) status = "failed";
    } else if (p === "http") {
      const r = await fetch(config.sms.httpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(config.sms.httpAuth ? { Authorization: config.sms.httpAuth } : {}) },
        body: JSON.stringify({ to: phone, from: config.sms.senderId, message: body }),
      });
      detail = await r.text(); if (!r.ok) status = "failed";
    } else {
      status = "failed"; detail = `unknown provider ${p}`;
    }
  } catch (e) {
    status = "failed"; detail = String(e?.message || e);
  }
  log.run(phone, body, p, status, detail.slice(0, 500), kind);
  if (status === "failed") console.warn("SMS failed:", phone, detail);
  return { status, detail };
}

// Message templates (keep under ~2 SMS segments; Sinhala/Tamil are UCS-2, 70 chars/segment,
// so the code + link go first and are repeated in English).
export function templates(lang) {
  const t = {
    en: {
      otp: (code) => `${code} is your Wendy Fest code. It expires in 2 minutes. Never share it.`,
      welcome: (name, code, link) => `Hi ${name}, welcome to Wendy Fest! Your code is ${code}. Show it at the Scream & Win or Roast Me kiosk. Your profile: ${link}`,
      win: (name, coupon, label, link) => `${name}, you screamed it right! Your Wendy's reward: ${label}. Code: ${coupon}. Show this code at the Wendy's counter, 5th floor, One Galle Face (OGF). Your pass: ${link}`,
      lose: (name, link) => `${name}, close one! Not quite loud enough this time. Your profile: ${link}`,
      roast: (name, link) => `${name}, you've been roasted by Wendy's. See it, save it, share it: ${link}`,
    },
    si: {
      otp: (code) => `${code} ඔබේ Wendy Fest කේතයයි. මිනිත්තු 2කින් කල් ඉකුත් වේ. කිසිවෙකුට දෙන්න එපා.`,
      welcome: (name, code, link) => `${name}, Wendy Fest වෙත සාදරයෙන් පිළිගනිමු! ඔබේ කේතය ${code}. Scream & Win / Roast Me කියෝස්ක් එකේදී පෙන්වන්න. ${link}`,
      win: (name, coupon, label, link) => `${name}, ඔබ දිනුම්! Wendy's ත්‍යාග කේතය: ${coupon} (${label}). Show this code at the Wendy's counter, 5th floor, One Galle Face (OGF). ${link}`,
      lose: (name, link) => `${name}, ආසන්නයි! මේ පාර ටිකක් අඩුයි. ${link}`,
      roast: (name, link) => `${name}, Wendy's ඔබව roast කළා. බලන්න, බාගන්න, බෙදාගන්න: ${link}`,
    },
    ta: {
      otp: (code) => `${code} உங்கள் Wendy Fest குறியீடு. 2 நிமிடத்தில் காலாவதியாகும். யாருடனும் பகிர வேண்டாம்.`,
      welcome: (name, code, link) => `${name}, Wendy Fest-க்கு வரவேற்கிறோம்! உங்கள் குறியீடு ${code}. Scream & Win / Roast Me கியோஸ்கில் காட்டுங்கள். ${link}`,
      win: (name, coupon, label, link) => `${name}, நீங்கள் வென்றீர்கள்! Wendy's பரிசு குறியீடு: ${coupon} (${label}). Show this code at the Wendy's counter, 5th floor, One Galle Face (OGF). ${link}`,
      lose: (name, link) => `${name}, கிட்டத்தட்ட! இந்த முறை சற்று குறைவு. ${link}`,
      roast: (name, link) => `${name}, Wendy's உங்களை roast செய்தது. பாருங்கள், சேமியுங்கள், பகிருங்கள்: ${link}`,
    },
  };
  return t[lang] || t.en;
}
