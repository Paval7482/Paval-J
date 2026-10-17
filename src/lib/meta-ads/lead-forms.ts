import fs from "fs";
import path from "path";

export interface MetaLeadFormQuestion {
  id: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  question: string;
  options?: string[];
}

export interface MetaLeadForm {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  form_type: "MORE_VOLUME" | "HIGHER_INTENT" | "RICH_CREATIVE";
  flexible_delivery: boolean;
  intro: {
    enabled: boolean;
    headline: string;
    description: string;
    background_image?: string;
  };
  questions: {
    description?: string;
    contact_fields: {
      full_name: boolean;
      phone_number: boolean;
      email: boolean;
      city: boolean;
      state: boolean;
    };
    custom_questions: MetaLeadFormQuestion[];
  };
  privacy_policy: {
    url: string;
    link_text: string;
    custom_disclaimer?: string;
  };
  ending: {
    headline: string;
    description: string;
    button_type: "WHATSAPP" | "CALL" | "WEBSITE";
    button_text: string;
    action_url: string;
  };
  created_at: string;
  lead_count: number;
}

const DEFAULT_LEAD_FORMS: MetaLeadForm[] = [
  {
    id: "form_murukku_factory_2026",
    name: "Sri Lakshmi Murukku Machinery Quotation Form",
    status: "ACTIVE",
    form_type: "MORE_VOLUME",
    flexible_delivery: true,
    intro: {
      enabled: true,
      headline: "Sri Lakshmi Industries - Automatic Murukku Machines",
      description: "Direct Coimbatore factory price for 30–50 kg/hr & 60-100 kg/hr SS 304 food-grade automatic murukku extruders. Get live catalog & WhatsApp video demo.",
      background_image: "/assets/murukku_machine_hero.jpg",
    },
    questions: {
      description: "We use your details strictly to send machine quotation and factory delivery terms.",
      contact_fields: {
        full_name: true,
        phone_number: true,
        email: true,
        city: true,
        state: true,
      },
      custom_questions: [
        {
          id: "q_capacity",
          type: "MULTIPLE_CHOICE",
          question: "Required Production Capacity Per Hour",
          options: ["30–50 kg/hr (Standard Commercial)", "60–100 kg/hr (Heavy Industrial)", "Complete Custom Turnkey Plant"],
        },
        {
          id: "q_stage",
          type: "MULTIPLE_CHOICE",
          question: "Your Snack Business Stage",
          options: ["Starting New Murukku Business", "Upgrading Existing Manual Unit", "Commercial Factory Expansion"],
        },
      ],
    },
    privacy_policy: {
      url: "https://srilakshmiindustrial.com/privacy-policy",
      link_text: "Visit Sri Lakshmi Industries Phase II Privacy Policy",
    },
    ending: {
      headline: "Thanks, you're all set!",
      description: "Our industrial engineering team will contact you via WhatsApp / Phone within 15 minutes with complete machine specs & ex-factory pricing.",
      button_type: "WHATSAPP",
      button_text: "Chat on WhatsApp",
      action_url: "https://wa.me/919842266366?text=Hi%20Sri%20Lakshmi%20Industries%2C%20I%20just%20submitted%20the%20lead%20form%20for%20Murukku%20Machine.",
    },
    created_at: "2026-10-14T08:00:00.000Z",
    lead_count: 680,
  },
  {
    id: "form_hindi_belt_2026",
    name: "North India Hindi Murukku Extruder Form",
    status: "ACTIVE",
    form_type: "MORE_VOLUME",
    flexible_delivery: true,
    intro: {
      enabled: true,
      headline: "Sri Lakshmi Industries - Commercial Chakli Machine",
      description: "Automatic food-grade SS 304 Chakli & Murukku making machinery with pan-India transport and video installation support.",
    },
    questions: {
      description: "Hum aapko direct factory price list aur machine working video WhatsApp karenge.",
      contact_fields: {
        full_name: true,
        phone_number: true,
        email: true,
        city: true,
        state: true,
      },
      custom_questions: [
        {
          id: "q_diesel_electric",
          type: "MULTIPLE_CHOICE",
          question: "Power / Motor Preference",
          options: ["Single Phase Domestic 220V", "Three Phase Commercial 440V"],
        },
      ],
    },
    privacy_policy: {
      url: "https://srilakshmiindustrial.com/privacy-policy",
      link_text: "Visit Sri Lakshmi Industries Privacy Policy",
    },
    ending: {
      headline: "Dhanyawaad! Aapki inquiry prapt ho gayi.",
      description: "Hamari team agle 15 minute mein aapko WhatsApp par complete quotation bhejegi.",
      button_type: "WHATSAPP",
      button_text: "WhatsApp Par Chat Karein",
      action_url: "https://wa.me/919842266366",
    },
    created_at: "2026-10-14T09:30:00.000Z",
    lead_count: 340,
  },
];

function getFormsFilePath(): string {
  return path.join(process.cwd(), "data", "meta_lead_forms.json");
}

export function getLeadForms(): MetaLeadForm[] {
  const filePath = getFormsFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[LeadForms] Failed to read forms file, using defaults:", err);
  }

  // Ensure default file exists
  saveLeadForms(DEFAULT_LEAD_FORMS);
  return DEFAULT_LEAD_FORMS;
}

export function saveLeadForms(forms: MetaLeadForm[]): void {
  const filePath = getFormsFilePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(forms, null, 2), "utf-8");
  } catch (err) {
    console.error("[LeadForms] Failed to save lead forms:", err);
  }
}

export function addLeadForm(form: Omit<MetaLeadForm, "id" | "created_at" | "lead_count">): MetaLeadForm {
  const forms = getLeadForms();
  const newForm: MetaLeadForm = {
    ...form,
    id: `form_sli_${Date.now()}`,
    created_at: new Date().toISOString(),
    lead_count: 0,
  };
  forms.unshift(newForm);
  saveLeadForms(forms);
  return newForm;
}
