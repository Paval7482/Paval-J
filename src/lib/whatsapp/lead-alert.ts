import { sendTextMessage, sendTemplateMessage } from "@/lib/whatsapp/meta-api";
import { supabaseAdmin } from "@/lib/automations/admin-client";

export type SupportedLanguage = "all_in_one" | "ta" | "en" | "hi" | "kn" | "ml" | "te";

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  native: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "all_in_one", label: "All-in-One Multi-Language", native: "✨ 2nd Greeting (All-in-One)", flag: "🌟" },
  { code: "ta", label: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "en", label: "English", native: "English", flag: "🌐" },
  { code: "hi", label: "Hindi", native: "हिंदी", flag: "🇮🇳" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", flag: "🇮🇳" },
  { code: "te", label: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
];

export type LeadAssignmentMethod =
  | "round_robin"
  | "priority_sequence"
  | "language_match"
  | "workload_balanced";

export interface SalesExecutive {
  id: string;
  name: string;
  tamilName?: string;
  phone: string;
  profile_id?: string;
  user_id?: string;
  active: boolean;
  role?: string;
  languages?: SupportedLanguage[];
  priority?: number;
}

export interface AdminRecipient {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

export const DEFAULT_ALL_IN_ONE_WELCOME_TEMPLATE = `வணக்கம்! 🙏 *Sri Lakshmi Industries*-க்கு தங்களை அன்போடு வரவேற்கிறோம்! 🌾
(முன்னணி வணிக ரீதியான முறுக்கு மெஷின் தயாரிப்பாளர்)
🏆 20+ வருடங்களின் தயாரிப்பு அனுபவம்
💎 4,000+ திருப்திகரமான வாடிக்கையாளர்கள்
🚀 1,000+ புதிய உணவுத் தொழில் முனைவோர்கள் (Startups)!
───────────────────
Welcome to *Sri Lakshmi Industries*! 🙏🌾
(Leading Manufacturer of Commercial Murukku Machines)
🏆 20+ Years of Manufacturing Excellence
💎 4,000+ Happy Customers Worldwide
🚀 1,000+ Successful Food Startups Created!
───────────────────
నమస్కారం! *శ్రీ లక్ష్మి ఇండస్ట్రీస్ (Sri Lakshmi Industries)* కు స్వాగతం! 🙏🌾
(కమర్షియల్ మురుకు తయారీ మెషీన్ల ప్రముఖ తయారీదారు)
🏆 20+ సంవత్సరాల తయారీ అనుభవం
💎 4,000+ పైగా సంతృప్తి చెందిన కస్టమర్లు
🚀 1,000+ పైగా విజయవంతమైన కొత్త స్టార్టప్‌లు!
───────────────────
നമസ്കാരം! *ശ്രീ ലക്ഷ്മി ഇൻഡസ്ട്രീസിലേക്ക് (Sri Lakshmi Industries)* സ്വാഗതം! 🙏🌾
(കൊമേഴ്സ്യൽ മുറുക്ക് നിർമ്മാണ മെഷീനുകളുടെ പ്രമുഖ നിർമ്മാതാക്കൾ)
🏆 20+ വർഷത്തെ നിർമ്മാണ പരിചയം
💎 4,000+ സംതൃപ്തരായ ഉപഭോക്താക്കൾ
🚀 1,000+ വിജയകരമായ പുതിയ സംരംഭങ്ങൾ!
───────────────────
नमस्ते! *श्री लक्ष्मी इंडस्ट्रीज (Sri Lakshmi Industries)* में आपका स्वागत है! 🙏🌾
(कमर्शियल मुरुक्कू मेकिंग मशीन के अग्रणी निर्माता)
🏆 20+ वर्षों का निर्माण अनुभव
💎 4,000+ संतुष्ट ग्राहक
🚀 1,000+ सफल नए फूड स्टार्टअप्स!
───────────────────
🌐 *Official Website:* https://www.srilakshmiindustries.com
📺 *YouTube Demo Videos:* https://youtube.com/@murukkumachineprakashsrila833
📞 *Direct Helpline / Assigned Executive:* +{{executive_phone}} ({{executive_name}})

Our sales executive will call you directly in a few minutes! / எங்கள் விற்பனை பிரதிநிதி விரைவில் உங்களை நேரடி அழைப்பில் தொடர்பு கொள்வார்! 🙏`;

export interface LeadRoutingConfig {
  enabled: boolean;
  assignmentMethod: LeadAssignmentMethod;
  welcomeGreetingMode?: "all_in_one" | "language_specific";
  notifyAdmin: boolean;
  notifyExecutive: boolean;
  notifyCustomer?: boolean;
  adminRecipients: AdminRecipient[];
  executives: SalesExecutive[];
  slaMinutes: number;
  lastAssignedIndex: number;
  executiveAlertTemplate?: string;
  adminAlertTemplate?: string;
  customerWelcomeTemplate?: string;
  multilingualCustomerTemplates?: Record<SupportedLanguage, string>;
}

export const MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES: Record<SupportedLanguage, string> = {
  all_in_one: DEFAULT_ALL_IN_ONE_WELCOME_TEMPLATE,

  ta: `வணக்கம் {{customer_name}}! 🙏✨
*ஸ்ரீ லக்ஷ்மி இண்டஸ்ட்ரீஸ் (Sri Lakshmi Industries)*-க்கு தங்களை அன்புடன் வரவேற்கிறோம்! 🏭🌾

முறுக்கு மெஷின் சம்மந்தமாக உங்கள் அனைத்து கேள்விகளுக்கும் எங்கள் விற்பனை பிரதிநிதி *{{executive_name}}* நியமிக்கப்பட்டுள்ளார். உங்களை விரைவில் தொடர்பு கொள்வார் அல்லது இப்போது அவரை அழைக்க கீழே உள்ள பட்டனை / லிங்கை கிளிக் செய்யவும்:

👤 விற்பனை பிரதிநிதி: {{executive_name}}
📞 தொடர்பு எண்: +{{executive_phone}}
💬 WhatsApp: https://wa.me/{{executive_phone}}
📞 Direct Call: tel:+{{executive_phone}}

- *ஸ்ரீ லக்ஷ்மி இண்டஸ்ட்ரீஸ், மதுரை*`,

  en: `Hello {{customer_name}}! 🙏✨
Welcome to *Sri Lakshmi Industries*! 🏭🌾

Our sales executive *{{executive_name}}* has been assigned to assist you with all your queries regarding Murukku & Food Processing Machines. They will contact you shortly, or click below to connect right away:

👤 Sales Executive: {{executive_name}}
📞 Contact Number: +{{executive_phone}}
💬 WhatsApp Chat: https://wa.me/{{executive_phone}}
📞 Direct Call: tel:+{{executive_phone}}

- *Sri Lakshmi Industries, Madurai*`,

  hi: `नमस्ते {{customer_name}}! 🙏✨
*श्री लक्ष्मी इंडस्ट्रीज (Sri Lakshmi Industries)* में आपका हार्दिक स्वागत है! 🏭🌾

मुरुक्कु और खाद्य प्रसंस्करण मशीनों से संबंधित आपके सभी प्रश्नों में सहायता के लिए हमारे बिक्री प्रतिनिधि *{{executive_name}}* को नियुक्त किया गया है। वह शीघ्र ही आपसे संपर्क करेंगे या अभी बात करने के लिए नीचे क्लिक करें:

👤 बिक्री प्रतिनिधि: {{executive_name}}
📞 संपर्क नंबर: +{{executive_phone}}
💬 WhatsApp: https://wa.me/{{executive_phone}}
📞 अभी कॉल करें: tel:+{{executive_phone}}

- *श्री लक्ष्मी इंडस्ट्रीज, मदुरै*`,

  kn: `ನಮಸ್ಕಾರ {{customer_name}}! 🙏✨
*ಶ್ರೀ ಲಕ್ಷ್ಮಿ ಇಂಡಸ್ಟ್ರೀಸ್ (Sri Lakshmi Industries)* ಗೆ ಆತ್ಮೀಯ ಸ್ವಾಗತ! 🏭🌾

ಮುರುಕ್ಕು ಮತ್ತು ಆಹಾರ ಸಂಸ್ಕರಣಾ ಯಂತ್ರಗಳಿಗೆ ಸಂಬಂಧಿಸಿದ ನಿಮ್ಮ ಎಲ್ಲಾ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಲು ನಮ್ಮ ಮಾರಾಟ ಪ್ರತಿನಿಧಿ *{{executive_name}}* ಅವರನ್ನು ನಿಯೋಜಿಸಲಾಗಿದೆ. ಅವರು ಶೀಘ್ರದಲ್ಲೇ ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸುತ್ತಾರೆ ಅಥವಾ ಈಗಲೇ ಮಾತನಾಡಲು ಕೆಳಗಿನ ಲಿಂಕ್ ಕ್ಲಿಕ್ ಮಾಡಿ:

👤 ಮಾರಾಟ ಪ್ರತಿನಿಧಿ: {{executive_name}}
📞 ಸಂಪರ್ಕ ಸಂಖ್ಯೆ: +{{executive_phone}}
💬 WhatsApp: https://wa.me/{{executive_phone}}
📞 ಕರೆ ಮಾಡಿ: tel:+{{executive_phone}}

- *ಶ್ರೀ ಲಕ್ಷ್ಮಿ ಇಂಡಸ್ಟ್ರೀಸ್, ಮಧುರೈ*`,

  ml: `നമസ്കാരം {{customer_name}}! 🙏✨
*ശ്രീ ലക്ഷ്മി ഇൻഡസ്ട്രീസിലേക്ക് (Sri Lakshmi Industries)* സ്വാഗതം! 🏭🌾

മുറുക്ക് & ഫുഡ് പ്രോസസ്സിംഗ് മെഷീനുകളുമായി ബന്ധപ്പെട്ട നിങ്ങളുടെ എല്ലാ സംശയങ്ങൾക്കും സഹായിക്കാൻ ഞങ്ങളുടെ സെയിൽസ് എക്സിക്യൂട്ടീവ് *{{executive_name}}* നിയോഗിക്കപ്പെട്ടിരിക്കുന്നു. അവർ ഉടൻ നിങ്ങളെ ബന്ധപ്പെടും അല്ലെങ്കിൽ ഇപ്പോൾ വിളിക്കാൻ താഴെയുള്ള ലിങ്കിൽ ക്ലിക്ക് ചെയ്യുക:

👤 സെയിൽസ് എക്സിക്യൂട്ടീവ്: {{executive_name}}
📞 ഫോൺ നമ്പർ: +{{executive_phone}}
💬 WhatsApp: https://wa.me/{{executive_phone}}
📞 ഇപ്പോൾ വിളിക്കുക: tel:+{{executive_phone}}

- *ശ്രീ ലക്ഷ്മി ഇൻഡസ്ട്രീസ്, മധുര*`,

  te: `నమస్కారం {{customer_name}}! 🙏✨
*శ్రీ లక్ష్మి ఇండస్ట్రీస్ (Sri Lakshmi Industries)* కు స్వాగతం! 🏭🌾

మురుక్కు మరియు ఫుడ్ ప్రాసెసింగ్ మెషీన్లకు సంబంధించిన మీ అన్ని ప్రశ్నలకు సహాయం చేయడానికి మా సేల్స్ ఎగ్జిక్యూటివ్ *{{executive_name}}* కేటాయించబడ్డారు. వారు త్వరలోనే మిమ్మల్ని సంప్రదిస్తారు లేదా ఇప్పుడే మాట్లాడటానికి క్రింది లింక్ క్లిక్ చేయండి:

👤 సేల్స్ ఎగ్జిక్యూటివ్: {{executive_name}}
📞 ఫోన్ నంబర్: +{{executive_phone}}
💬 WhatsApp: https://wa.me/{{executive_phone}}
📞 కాల్ చేయండి: tel:+{{executive_phone}}

- *శ్రీ లక్ష్మి ఇండస్ట్రీస్, మధురై*`,
};

export const DEFAULT_CUSTOMER_WELCOME_TEMPLATE = `Hello {{customer_name}}! 🙏✨
Welcome to *Sri Lakshmi Industries*! 🏭🌾
(Leading Manufacturer of Commercial Murukku Machines)

Our sales executive *{{executive_name}}* has been assigned to assist you with all your queries regarding Murukku & Food Processing Machines. They will contact you shortly, or connect right away:

👤 Sales Executive: {{executive_name}}
📞 Contact Number: +{{executive_phone}}
💬 WhatsApp Chat: https://wa.me/{{executive_phone}}
📞 Direct Call: tel:+{{executive_phone}}

🌐 Website: https://www.srilakshmiindustries.com
📺 YouTube Demo: https://youtube.com/@murukkumachineprakashsrila833

- *Sri Lakshmi Industries, Madurai*`;

export const DEFAULT_EXECUTIVE_TEMPLATE = `🚨 *NEW LEAD ASSIGNED TO YOU! | புதிய லீட் உங்களுக்கு ஒதுக்கப்பட்டுள்ளது!*
━━━━━━━━━━━━━━━━━━━━━━
👤 *Customer / வாடிக்கையாளர்:* {{customer_name}}
📱 *Phone / எண்:* +{{customer_phone}}
🏭 *Requirement / தேவை:* {{requirement}}
📍 *Location / இடம்:* {{location}}
💬 *Message / தகவல்:* "{{customer_message}}"
⏰ *Time:* {{time}}
━━━━━━━━━━━━━━━━━━━━━━
⚡ *URGENT ACTION REQUIRED | உடனடி நடவடிக்கை தேவை:*
தயவுசெய்து இந்த வாடிக்கையாளரை அடுத்த {{sla_minutes}} நிமிடங்களுக்குள் WhatsApp அல்லது Call செய்து பேசவும்!
(Please contact this customer within {{sla_minutes}} minutes without delay!)

👉 *Click to WhatsApp / வாட்ஸ்அப் செய்ய:*
https://wa.me/{{customer_phone}}

📞 *Click to Call / போன் செய்ய:*
tel:+{{customer_phone}}

💻 *Open in CRM Portal:*
{{crm_inbox_link}}
━━━━━━━━━━━━━━━━━━━━━━
- *Sri Lakshmi Industries Sales Management*`;

export const DEFAULT_ADMIN_TEMPLATE = `📢 *MANAGEMENT NOTIFICATION — New Lead Received*
━━━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* {{customer_name}}
📱 *Phone:* +{{customer_phone}}
🏭 *Requirement:* {{requirement}}
📍 *Location:* {{location}}
💬 *Message:* "{{customer_message}}"
━━━━━━━━━━━━━━━━━━━━━━
🎯 *Assigned Executive:* *{{executive_name}}* (+{{executive_phone}})
⚡ *Action:* Executive *{{executive_name}}* will contact this customer within {{sla_minutes}} minutes.
⏰ *Received Time:* {{time}} (IST)
🔗 *CRM Inbox:* {{crm_inbox_link}}`;

export function renderLeadTemplate(
  template: string,
  vars: Record<string, string | number | undefined>
): string {
  let rendered = template;
  for (const [key, val] of Object.entries(vars)) {
    const stringVal = val !== undefined && val !== null ? String(val) : "";
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(regex, stringVal);
  }
  return rendered;
}

export const DEFAULT_SALES_EXECUTIVES: SalesExecutive[] = [
  {
    id: "exec-subash",
    name: "SUBASH",
    tamilName: "சுபாஷ்",
    phone: "919384225223",
    profile_id: "7467ba31-21e8-4983-b475-c7a273486411",
    user_id: "b8db6f80-377c-41b9-bc79-458ed7733230",
    active: true,
    role: "Sales Executive",
    languages: ["ta", "ml", "en"],
    priority: 1,
  },
  {
    id: "exec-satheesh",
    name: "SATHEESH",
    tamilName: "சதீஷ்",
    phone: "919786390479",
    profile_id: "fac4a28c-d56f-4f22-979c-b288cbdddaae",
    user_id: "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1",
    active: true,
    role: "Sales Executive",
    languages: ["ta", "en"],
    priority: 2,
  },
  {
    id: "exec-bala",
    name: "BALA",
    tamilName: "பாலா",
    phone: "919345232209",
    profile_id: "1c245b47-b1d2-4de4-a717-03ff249a308d",
    user_id: "35760e9c-b82a-40d0-a6ee-ca1804d72a90",
    active: true,
    role: "Sales Executive",
    languages: ["ta", "kn", "en"],
    priority: 3,
  },
  {
    id: "exec-nallakaman",
    name: "NALLAKAMAN",
    tamilName: "நல்லகாமன்",
    phone: "918925865837",
    profile_id: "012ae00b-7f53-4c82-b5e9-fbed4ffb8c6d",
    user_id: "bc6a28a6-7f3c-4ba2-974e-072b192e6c02",
    active: true,
    role: "Sales Executive",
    languages: ["ta", "hi", "en"],
    priority: 4,
  },
  {
    id: "exec-baskar",
    name: "BASKAR",
    tamilName: "பாஸ்கர்",
    phone: "919043978194",
    profile_id: "8b6f940b-e148-4261-a300-af35e8426bf2",
    user_id: "a909751b-7022-4e47-aaed-c7cfc5acd526",
    active: true,
    role: "Sales Executive",
    languages: ["ta", "te", "en"],
    priority: 5,
  },
  {
    id: "exec-karthick",
    name: "KARTHICK",
    tamilName: "கார்த்திக்",
    phone: "917603830507",
    profile_id: "85f11697-ecc9-4447-ab69-8296421f144a",
    user_id: "944ed513-3b24-4daf-a159-66b37b63a967",
    active: true,
    role: "Sales Executive",
    languages: ["ta", "hi", "en"],
    priority: 6,
  },
];

export const DEFAULT_ADMIN_RECIPIENTS: AdminRecipient[] = [
  {
    id: "admin-md-sir",
    name: "MD",
    phone: "917010469614",
    active: true,
  },
  {
    id: "admin-gm-mam",
    name: "GM",
    phone: "916382624058",
    active: true,
  },
  {
    id: "admin-agm-sir",
    name: "AGM",
    phone: "919994440905",
    active: true,
  },
];

export const DEFAULT_ROUTING_CONFIG: LeadRoutingConfig = {
  enabled: true,
  assignmentMethod: "round_robin",
  notifyAdmin: true,
  notifyExecutive: true,
  notifyCustomer: true,
  adminRecipients: DEFAULT_ADMIN_RECIPIENTS,
  executives: DEFAULT_SALES_EXECUTIVES,
  slaMinutes: 5,
  lastAssignedIndex: 0,
  executiveAlertTemplate: DEFAULT_EXECUTIVE_TEMPLATE,
  adminAlertTemplate: DEFAULT_ADMIN_TEMPLATE,
  customerWelcomeTemplate: DEFAULT_CUSTOMER_WELCOME_TEMPLATE,
  multilingualCustomerTemplates: MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES,
};

export const MD_SIR_PHONE = "919994440905";
export const SALES_EXECUTIVES = DEFAULT_SALES_EXECUTIVES;

const CONFIG_TAG_NAME = "__lead_routing_config__";
let cachedConfig: LeadRoutingConfig = { ...DEFAULT_ROUTING_CONFIG };
let lastCacheTime = 0;

export async function getLeadRoutingConfig(): Promise<LeadRoutingConfig> {
  const now = Date.now();
  if (now - lastCacheTime < 5000 && cachedConfig) {
    return cachedConfig;
  }

  try {
    const admin = supabaseAdmin();
    const { data } = await admin
      .from("tags")
      .select("color")
      .eq("name", CONFIG_TAG_NAME)
      .maybeSingle();

    if (data?.color) {
      try {
        const parsed = JSON.parse(data.color);
        const resolved: LeadRoutingConfig = {
          ...DEFAULT_ROUTING_CONFIG,
          ...parsed,
          executives: parsed.executives || DEFAULT_SALES_EXECUTIVES,
          adminRecipients: parsed.adminRecipients || DEFAULT_ADMIN_RECIPIENTS,
        };
        cachedConfig = resolved;
        lastCacheTime = now;
        return resolved;
      } catch (e) {
        console.error("[lead-alert] Error parsing routing config JSON:", e);
      }
    }
  } catch (err) {
    console.error("[lead-alert] Error loading routing config from DB:", err);
  }

  if (!cachedConfig) {
    cachedConfig = { ...DEFAULT_ROUTING_CONFIG };
  }
  lastCacheTime = now;
  return cachedConfig;
}

export async function saveLeadRoutingConfig(
  partial: Partial<LeadRoutingConfig>
): Promise<LeadRoutingConfig> {
  const current = await getLeadRoutingConfig();
  const updated: LeadRoutingConfig = {
    ...current,
    ...partial,
  };

  cachedConfig = updated;
  lastCacheTime = Date.now();

  try {
    const admin = supabaseAdmin();
    const { data: existing } = await admin
      .from("tags")
      .select("id")
      .eq("name", CONFIG_TAG_NAME)
      .maybeSingle();

    const configJson = JSON.stringify(updated);

    if (existing) {
      const { error: updateErr } = await admin
        .from("tags")
        .update({ color: configJson })
        .eq("id", existing.id);
      if (updateErr) {
        console.error("[lead-alert] Error updating config in DB:", updateErr);
      }
    } else {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, user_id, account_id")
        .limit(1)
        .maybeSingle();

      const { data: acc } = await admin
        .from("accounts")
        .select("id")
        .limit(1)
        .maybeSingle();

      const insertPayload: any = {
        name: CONFIG_TAG_NAME,
        color: configJson,
      };
      if (profile?.user_id) insertPayload.user_id = profile.user_id;
      if (acc?.id || profile?.account_id) insertPayload.account_id = acc?.id || profile?.account_id;

      const { error: insertErr } = await admin.from("tags").insert(insertPayload);
      if (insertErr) {
        console.error("[lead-alert] Error inserting config in DB:", insertErr);
      }
    }
  } catch (err) {
    console.error("[lead-alert] Error saving routing config to DB:", err);
  }

  return updated;
}

export function detectLanguageFromLead({
  location,
  messageText,
  language,
}: {
  location?: string;
  messageText?: string;
  language?: string;
}): SupportedLanguage {
  if (language && (["ta", "en", "hi", "kn", "ml", "te"] as string[]).includes(language.toLowerCase())) {
    return language.toLowerCase() as SupportedLanguage;
  }

  const loc = (location || "").toLowerCase();
  const msg = (messageText || "").toLowerCase();

  // Malayalam / Kerala
  if (loc.includes("kerala") || loc.includes("kochi") || loc.includes("calicut") || loc.includes("trivandrum") || loc.includes("thrissur") || loc.includes("kollam") || loc.includes("palakkad") || loc.includes("malappuram") || loc.includes("kannur") || /[\u0D00-\u0D7F]/.test(msg)) {
    return "ml";
  }

  // Kannada / Karnataka
  if (loc.includes("karnataka") || loc.includes("bangalore") || loc.includes("bengaluru") || loc.includes("mysore") || loc.includes("hubli") || loc.includes("belgaum") || loc.includes("mangalore") || loc.includes("tumkur") || /[\u0C80-\u0CFF]/.test(msg)) {
    return "kn";
  }

  // Telugu / AP / Telangana
  if (loc.includes("andhra") || loc.includes("telangana") || loc.includes("hyderabad") || loc.includes("vijayawada") || loc.includes("visakhapatnam") || loc.includes("guntur") || loc.includes("tirupati") || loc.includes("warangal") || /[\u0C00-\u0C7F]/.test(msg)) {
    return "te";
  }

  // Hindi / North India
  if (
    loc.includes("delhi") || loc.includes("mumbai") || loc.includes("maharashtra") || loc.includes("gujarat") || loc.includes("uttar pradesh") || loc.includes("up") || loc.includes("bihar") || loc.includes("rajasthan") || loc.includes("madhya pradesh") || loc.includes("mp") || loc.includes("punjab") || loc.includes("haryana") || loc.includes("kolkata") || loc.includes("west bengal") || /[\u0900-\u097F]/.test(msg)
  ) {
    return "hi";
  }

  // Explicit Tamil Script
  if (loc.includes("tamil") || loc.includes("tamil nadu") || loc.includes("chennai") || loc.includes("madurai") || loc.includes("coimbatore") || /[\u0B80-\u0BFF]/.test(msg)) {
    return "ta";
  }

  // Default to English as requested
  return "en";
}

export function getNextRoundRobinExecutive(
  indexSeed?: number,
  targetLanguage?: SupportedLanguage
): SalesExecutive {
  const config = cachedConfig || DEFAULT_ROUTING_CONFIG;
  const activeExecs = (config.executives && config.executives.length > 0 ? config.executives : DEFAULT_SALES_EXECUTIVES).filter(
    (e) => e.active !== false
  );

  if (activeExecs.length === 0) return DEFAULT_SALES_EXECUTIVES[0];

  const method = config.assignmentMethod || "round_robin";
  let pool = activeExecs;

  // 1. Custom Priority Sequence Order (1st, 2nd, 3rd Lead Sequence)
  if (method === "priority_sequence") {
    // Strictly sort by custom sequence priority rank 1, 2, 3...
    pool = [...activeExecs].sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }
  // 2. Language Wise Match
  else if (method === "language_match" && targetLanguage) {
    const matching = activeExecs.filter((e) => e.languages && e.languages.includes(targetLanguage));
    if (matching.length > 0) {
      pool = matching;
    }
  }
  // 3. Strict Round Robin (Equal Rotation among all active executives)
  else {
    pool = activeExecs;
  }

  if (pool.length === 0) pool = activeExecs;

  let idx = 0;
  if (typeof indexSeed === "number" && !isNaN(indexSeed)) {
    idx = Math.abs(indexSeed) % pool.length;
  } else {
    idx = ((typeof config.lastAssignedIndex === "number" ? config.lastAssignedIndex : 0) + 1) % pool.length;
    config.lastAssignedIndex = idx;
    // Async save updated index in background without blocking
    saveLeadRoutingConfig({ lastAssignedIndex: idx }).catch(() => {});
  }

  return pool[idx] || activeExecs[0] || DEFAULT_SALES_EXECUTIVES[0];
}

export async function getNextRoundRobinExecutiveAsync(
  indexSeed?: number,
  targetLanguage?: SupportedLanguage
): Promise<SalesExecutive> {
  const config = await getLeadRoutingConfig();
  const activeExecs = (config.executives && config.executives.length > 0 ? config.executives : DEFAULT_SALES_EXECUTIVES).filter(
    (e) => e.active !== false
  );

  if (activeExecs.length === 0) return DEFAULT_SALES_EXECUTIVES[0];

  const method = config.assignmentMethod || "round_robin";
  let pool = activeExecs;

  // 1. Custom Priority Sequence Order (1st, 2nd, 3rd Sequence)
  if (method === "priority_sequence") {
    pool = [...activeExecs].sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }
  // 2. Language Wise Match
  else if (method === "language_match" && targetLanguage) {
    const matching = activeExecs.filter((e) => e.languages && e.languages.includes(targetLanguage));
    if (matching.length > 0) {
      pool = matching;
    }
  }
  // 3. Workload Balanced (Lowest Open Leads Count)
  else if (method === "workload_balanced") {
    try {
      const admin = supabaseAdmin();
      const { data: deals } = await admin
        .from("deals")
        .select("user_id, assigned_to, status")
        .in("status", ["open", "enquiry", "pending", "in_progress"]);

      const loadMap: Record<string, number> = {};
      activeExecs.forEach((e) => {
        loadMap[e.id] = 0;
      });

      if (deals) {
        deals.forEach((d: any) => {
          const matched = activeExecs.find(
            (e) => e.user_id === d.user_id || e.profile_id === d.assigned_to
          );
          if (matched) {
            loadMap[matched.id] = (loadMap[matched.id] || 0) + 1;
          }
        });
      }

      pool = [...activeExecs].sort((a, b) => (loadMap[a.id] || 0) - (loadMap[b.id] || 0));
      return pool[0] || activeExecs[0];
    } catch (e) {
      console.warn("[lead-alert] Workload balancing query error:", e);
    }
  }
  // 4. Strict Round Robin (Equal Rotation among all active executives)
  else {
    pool = activeExecs;
  }

  if (pool.length === 0) pool = activeExecs;

  let idx = 0;
  if (typeof indexSeed === "number" && !isNaN(indexSeed)) {
    idx = Math.abs(indexSeed) % pool.length;
  } else {
    idx = ((typeof config.lastAssignedIndex === "number" ? config.lastAssignedIndex : 0) + 1) % pool.length;
    await saveLeadRoutingConfig({ lastAssignedIndex: idx });
  }

  return pool[idx] || activeExecs[0] || DEFAULT_SALES_EXECUTIVES[0];
}

export function findExecutiveByUserId(userId?: string | null): SalesExecutive | null {
  if (!userId) return null;
  const config = cachedConfig || DEFAULT_ROUTING_CONFIG;
  return config.executives.find((e) => e.user_id === userId) || null;
}

export function findExecutiveByProfileId(profileId?: string | null): SalesExecutive | null {
  if (!profileId) return null;
  const config = cachedConfig || DEFAULT_ROUTING_CONFIG;
  return config.executives.find((e) => e.profile_id === profileId) || null;
}

export function getCustomerWelcomeTemplateForLang(
  lang: SupportedLanguage,
  config?: LeadRoutingConfig
): string {
  // If greeting mode is explicitly set to all_in_one
  if (config?.welcomeGreetingMode === "all_in_one" || lang === "all_in_one") {
    return (
      config?.multilingualCustomerTemplates?.all_in_one ||
      config?.customerWelcomeTemplate ||
      DEFAULT_ALL_IN_ONE_WELCOME_TEMPLATE
    );
  }

  const customDict = config?.multilingualCustomerTemplates;
  if (customDict && customDict[lang]) {
    return customDict[lang];
  }
  if (MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES[lang]) {
    return MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES[lang];
  }
  return (
    customDict?.en ||
    MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES.en ||
    DEFAULT_CUSTOMER_WELCOME_TEMPLATE
  );
}

export async function sendLeadAlerts({
  customerName,
  customerPhone,
  messageText,
  requirement,
  location,
  language,
  assignedExec,
  accessToken,
  phoneNumberId,
}: {
  customerName: string;
  customerPhone: string;
  messageText?: string;
  requirement?: string;
  location?: string;
  language?: string;
  assignedExec: SalesExecutive;
  accessToken: string;
  phoneNumberId: string;
}) {
  const config = await getLeadRoutingConfig();
  if (!config.enabled) {
    console.info("[LeadAlert] Lead routing alerts are currently disabled in settings.");
    return;
  }

  const cleanCustomerPhone = customerPhone.replace(/\D/g, "");
  const formattedCustomerPhone = cleanCustomerPhone.startsWith("91") && cleanCustomerPhone.length === 12
    ? `+${cleanCustomerPhone}`
    : cleanCustomerPhone.length === 10
    ? `+91${cleanCustomerPhone}`
    : `+${cleanCustomerPhone}`;

  const nowStr = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const sla = config.slaMinutes || 5;

  const templateVars = {
    customer_name: customerName,
    customer_phone: cleanCustomerPhone,
    requirement: requirement || "Murukku Machine Enquiry",
    location: location || "Tamil Nadu",
    customer_message: messageText ? messageText.slice(0, 300) : "Murukku machine price & catalogue enquiry",
    executive_name: assignedExec.name,
    executive_tamil_name: assignedExec.tamilName || assignedExec.name,
    executive_phone: assignedExec.phone.replace(/\D/g, ""),
    time: nowStr,
    sla_minutes: sla,
    crm_inbox_link: "https://sli-crm-rho.vercel.app/inbox",
    quick_call_link: `https://wa.me/${cleanCustomerPhone}`,
  };

  // 1. Management Alerts to All Active Admin Recipients (STRICTLY sli_mgmt_lead_summary only)
  if (config.notifyAdmin) {
    const activeAdmins = (config.adminRecipients || DEFAULT_ADMIN_RECIPIENTS).filter(
      (a) => a.active !== false && a.phone
    );

    const adminTemplate = config.adminAlertTemplate || DEFAULT_ADMIN_TEMPLATE;
    const mdMsg = renderLeadTemplate(adminTemplate, templateVars);

    for (const admin of activeAdmins) {
      const cleanAdminPhone = admin.phone.replace(/\D/g, "");
      try {
        let adminTmplDelivered = false;
        try {
          // Use officially approved Meta Management Template sli_mgmt_lead_summary
          await sendTemplateMessage({
            phoneNumberId,
            accessToken,
            to: cleanAdminPhone,
            templateName: "sli_mgmt_lead_summary",
            language: "en_US",
            params: [
              customerName || "New Lead",
              formattedCustomerPhone,
              requirement || "Murukku Machine",
              location || "Tamil Nadu",
              `${assignedExec.name} (+${assignedExec.phone.replace(/\D/g, "")})`,
              String(sla || 5),
            ],
          });
          adminTmplDelivered = true;
          console.info(
            `[LeadAlert] Management summary delivered via approved Meta Template sli_mgmt_lead_summary (en_US) to ${admin.name} (${cleanAdminPhone})`
          );
        } catch (templateErr1: any) {
          console.warn(
            `[LeadAlert] Meta Template sli_mgmt_lead_summary (en_US) error for admin ${admin.name}: ${templateErr1.message}, trying direct text fallback...`
          );
        }

        if (!adminTmplDelivered) {
          await sendTextMessage({
            phoneNumberId,
            accessToken,
            to: cleanAdminPhone,
            text: mdMsg,
          });
          console.info(
            `[LeadAlert] Management summary sent via text fallback to ${admin.name} (${cleanAdminPhone})`
          );
        }
      } catch (err) {
        console.error(
          `[LeadAlert] Failed to send alert to admin ${admin.name} (${cleanAdminPhone}):`,
          err
        );
      }
    }
  }

  // 2. Bilingual Urgent Action Alert to Assigned Executive (STRICTLY Sales Executive Only)
  if (
    config.notifyExecutive &&
    assignedExec.phone &&
    assignedExec.phone.replace(/\D/g, "") !== cleanCustomerPhone
  ) {
    const cleanExecPhone = assignedExec.phone.replace(/\D/g, "");
    const execTemplate = config.executiveAlertTemplate || DEFAULT_EXECUTIVE_TEMPLATE;
    const execMsg = renderLeadTemplate(execTemplate, templateVars);

    try {
      // First try approved Meta Utility template (Delivers 24/7 without needing recipient to send 'HI')
      let execTmplDelivered = false;
      try {
        await sendTemplateMessage({
          phoneNumberId,
          accessToken,
          to: cleanExecPhone,
          templateName: "sli_sales_lead_alert_v2",
          language: "en_US",
          params: [
            customerName || "New Lead",
            formattedCustomerPhone,
            requirement || "Murukku Machine",
            location || "Tamil Nadu",
            nowStr,
            String(sla || 5),
          ],
        });
        execTmplDelivered = true;
        console.info(
          `[LeadAlert] Urgent lead alert delivered via approved Meta Template sli_sales_lead_alert_v2 (en_US) to ${assignedExec.name} (${cleanExecPhone})`
        );
      } catch (templateErr1: any) {
        console.warn(
          `[LeadAlert] Meta Template sli_sales_lead_alert_v2 (en_US) failed for executive ${assignedExec.name}: ${templateErr1.message}, trying fallback to v1...`
        );
        try {
          await sendTemplateMessage({
            phoneNumberId,
            accessToken,
            to: cleanExecPhone,
            templateName: "sli_sales_lead_alert",
            language: "en_US",
            params: [
              customerName || "New Lead",
              formattedCustomerPhone,
              requirement || "Murukku Machine",
              location || "Tamil Nadu",
              nowStr,
              String(sla || 5),
            ],
          });
          execTmplDelivered = true;
          console.info(
            `[LeadAlert] Urgent lead alert delivered via approved Meta Template sli_sales_lead_alert (en_US) to ${assignedExec.name} (${cleanExecPhone})`
          );
        } catch (templateErr2: any) {
          console.warn(
            `[LeadAlert] Meta Template dispatch fallback to text message for ${assignedExec.name}:`,
            templateErr2.message
          );
        }
      }

      if (!execTmplDelivered) {
        await sendTextMessage({
          phoneNumberId,
          accessToken,
          to: cleanExecPhone,
          text: execMsg,
        });
        console.info(
          `[LeadAlert] Urgent lead alert sent via text to executive ${assignedExec.name} (${cleanExecPhone})`
        );
      }
    } catch (err) {
      console.error(
        `[LeadAlert] Failed to send alert to executive ${assignedExec.name}:`,
        err
      );
    }
  }

  // 3. Customer Auto-Welcome Greeting Message (Dispatched directly to lead in their detected language)
  if (config.notifyCustomer !== false && cleanCustomerPhone) {
    const detectedLang = detectLanguageFromLead({ location, messageText, language });
    const custTemplate = getCustomerWelcomeTemplateForLang(detectedLang, config);
    const custMsg = renderLeadTemplate(custTemplate, templateVars);

    try {
      await sendTextMessage({
        phoneNumberId,
        accessToken,
        to: cleanCustomerPhone,
        text: custMsg,
      });
      console.info(
        `[LeadAlert] Auto-welcome greeting (${detectedLang}) successfully sent to customer ${customerName} (+${cleanCustomerPhone})`
      );

      // Record this outbound message in Supabase so it appears in CRM Inbox
      try {
        const admin = supabaseAdmin();
        const { data: contact } = await admin
          .from("contacts")
          .select("id")
          .eq("phone", cleanCustomerPhone)
          .maybeSingle();

        if (contact?.id) {
          const { data: conv } = await admin
            .from("conversations")
            .select("id")
            .eq("contact_id", contact.id)
            .maybeSingle();

          if (conv?.id) {
            await admin.from("messages").insert({
              conversation_id: conv.id,
              sender_type: "agent",
              content_type: "text",
              content_text: custMsg,
              status: "sent",
            });
            await admin
              .from("conversations")
              .update({
                last_message_at: new Date().toISOString(),
                last_message_text: custMsg.slice(0, 100),
                assigned_to: assignedExec.user_id || undefined,
              })
              .eq("id", conv.id);
          }
        }
      } catch (dbErr) {
        console.warn("[LeadAlert] Error logging customer welcome to DB:", dbErr);
      }
    } catch (err) {
      console.error(
        `[LeadAlert] Failed to send auto-welcome to customer (+${cleanCustomerPhone}):`,
        err
      );
    }
  }
}
