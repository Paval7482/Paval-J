export interface LintResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  score: number; // 0 to 100
  suggestions: string[];
}

const FORBIDDEN_INCOME_REGEX = [
  /earn\s*(rs\.?|₹)?\s*[0-9,]+/i,
  /guaranteed\s*(profit|income|return|money)/i,
  /get\s*rich/i,
  /daily\s*income/i,
  /make\s*money\s*fast/i,
  /100%\s*(profit|guarantee)/i,
  /தினமும்\s*[0-9,]+\s*(சம்பாதிக்க|வருமானம்)/i,
  /உறுதியான\s*லாபம்/i,
  /रोजाना\s*[0-9,]+\s*कमाए/i,
  /गारंटीड\s*(मुनाफा|कमाई)/i,
];

const NON_MURUKKU_MACHINE_REGEX = [
  /chapati|chappathi|roti/i,
  /idiyappam|sevai/i,
  /parotta|paratha/i,
  /noodle|noodles/i,
  /biscuit|cookie/i,
];

export function lintAdCopy(headline: string, primaryText: string): LintResult {
  const combined = `${headline} ${primaryText}`;
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // 1. Income & Money Claims
  for (const regex of FORBIDDEN_INCOME_REGEX) {
    if (regex.test(combined)) {
      errors.push(
        "Meta Policy Violation (Prohibited Financial Claims): Do not state exact income promises or guaranteed profit. Meta will immediately reject the ad or restrict your account."
      );
      suggestions.push(
        "Replace income guarantees with commercial production output, e.g., 'Commercial capacity 30–50 kg/hour' or 'Fast return on snack business investment'."
      );
      break;
    }
  }

  // 2. Non-Murukku Machine Restriction
  for (const regex of NON_MURUKKU_MACHINE_REGEX) {
    if (regex.test(combined)) {
      errors.push(
        "Sri Lakshmi Business Restriction: Sri Lakshmi Industries manufactures ONLY Commercial Automatic Murukku Making Machines. Remove mentions of other food machinery."
      );
      suggestions.push(
        "Focus on Murukku varieties: Ring Murukku, Butter Murukku, Mullu Murukku, Ribbon Pakoda, Kai Murukku."
      );
      break;
    }
  }

  // 3. Operational Safety Warning
  if (!/safety|food grade|ss 304|stainless steel|patented/i.test(combined)) {
    warnings.push(
      "Safety & Quality Tip: Including 'SS 304 Food Grade Stainless Steel' and 'India's 1st Patented' significantly increases B2B factory buyer trust and complies with Meta manufacturing guidelines."
    );
  }

  // 4. Headline Length
  if (headline.length > 50) {
    warnings.push("Headline is too long (> 50 chars). It may be truncated on mobile feed previews.");
  } else if (headline.length < 10) {
    warnings.push("Headline is very short. Highlight machine capacity or patented technology.");
  }

  // Calculate score
  let score = 100;
  if (errors.length > 0) score -= errors.length * 40;
  if (warnings.length > 0) score -= warnings.length * 15;
  if (score < 0) score = 0;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score,
    suggestions,
  };
}

export const PRESET_MURUKKU_COPIES = {
  tamil_pas: {
    headline: "ஆட்டோமேட்டிக் முறுக்கு மெஷின் | 1 மணி நேரத்தில் 30-50 kg!",
    primaryText:
      "கைவலிக்க முறுக்கு பிழிய வேண்டாம்! ஸ்ரீ லக்ஷ்மி இண்டஸ்ட்ரீஸின் காப்புரிமை பெற்ற (Patented) ஃபுல் ஆட்டோமேட்டிக் முறுக்கு மெஷின் மூலம் 1 மணி நேரத்தில் 30 முதல் 50 கிலோ வரை எளிதாக முறுக்கு தயாரிக்கலாம்.\n\n✅ 100% ஃபுட் கிரேடு SS 304 ஸ்டெயின்லெஸ் ஸ்டீல்\n✅ ரிங் முறுக்கு, முள்ளு முறுக்கு, ரிப்பன் பக்கோடா டை மாற்றும் வசதி\n✅ இந்தியா முழுவதும் நேரடி டெலிவரி & சர்வீஸ்\n\nமெஷின் விலை மற்றும் நேரடி செயல்முறை வீடியோவிற்கு கீழே உள்ள லிங்கை கிளிக் செய்து வாட்ஸ்அப்பில் தொடர்பு கொள்ளவும்!",
  },
  hindi_expansion: {
    headline: "कमर्शियल मुरुक्कू मेकिंग मशीन | 30-50 kg/घंटा उत्पादन",
    primaryText:
      "अपने स्नैक और नमकीन बिज़नेस को बढ़ाएं! श्री लक्ष्मी इंडस्ट्रीज की पेटेंटेड ऑटोमैटिक मुरुक्कू मेकिंग मशीन।\n\n✅ पूरी तरह SS 304 फूड ग्रेड स्टेनलेस स्टील से निर्मित\n✅ 1 घंटे में 30 से 50 किलो उच्च उत्पादन\n✅ चकली, मुरुक्कू और रिबन पकोड़ा डाई की सुविधा\n✅ पूरे भारत में डिलीवरी और 1 साल की वारंटी\n\nमशीन की कीमत और लाइव वीडियो देखने के लिए अभी WhatsApp पर संपर्क करें!",
  },
  english_b2b: {
    headline: "Patented Commercial Murukku Machine | 30-50 Kg/Hr Output",
    primaryText:
      "Scale your snack manufacturing facility with India's 1st Patented Commercial Murukku Making Machine by Sri Lakshmi Industries.\n\nKey Highlights:\n- Robust Food Grade SS 304 Construction\n- High Output: 30 to 50 kg per hour with single operator\n- Multi-die support for Butter Murukku, Ring Murukku & Ribbon Pakoda\n- Fast ROI & low electricity consumption\n\nClick below to receive instant catalogue, video demo and factory price quotation on WhatsApp!",
  },
};
