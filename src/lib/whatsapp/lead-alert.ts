import { sendTextMessage } from "@/lib/whatsapp/meta-api";
import { supabaseAdmin } from "@/lib/automations/admin-client";

export interface SalesExecutive {
  id: string;
  name: string;
  tamilName?: string;
  phone: string;
  profile_id?: string;
  user_id?: string;
  active: boolean;
  role?: string;
}

export interface AdminRecipient {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

export interface LeadRoutingConfig {
  enabled: boolean;
  assignmentMethod: "round_robin" | "direct";
  notifyAdmin: boolean;
  notifyExecutive: boolean;
  adminRecipients: AdminRecipient[];
  executives: SalesExecutive[];
  slaMinutes: number;
  lastAssignedIndex: number;
}

export const DEFAULT_SALES_EXECUTIVES: SalesExecutive[] = [
  {
    id: "exec-satheesh",
    name: "SATHEESH",
    tamilName: "சதீஷ்",
    phone: "919786390479",
    profile_id: "fac4a28c-d56f-4f22-979c-b288cbdddaae",
    user_id: "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1",
    active: true,
    role: "Sales Executive",
  },
  {
    id: "exec-subash",
    name: "SUBASH",
    tamilName: "சுபாஷ்",
    phone: "919384225223",
    profile_id: "7467ba31-21e8-4983-b475-c7a273486411",
    user_id: "b8db6f80-377c-41b9-bc79-458ed7733230",
    active: true,
    role: "Sales Executive",
  },
  {
    id: "exec-baskar",
    name: "BASKAR",
    tamilName: "பாஸ்கர்",
    phone: "918925964470",
    profile_id: "8b6f940b-e148-4261-a300-af35e8426bf2",
    user_id: "a909751b-7022-4e47-aaed-c7cfc5acd526",
    active: true,
    role: "Sales Executive",
  },
  {
    id: "exec-bala",
    name: "BALA",
    tamilName: "பாலா",
    phone: "918925964469",
    profile_id: "1c245b47-b1d2-4de4-a717-03ff249a308d",
    user_id: "35760e9c-b82a-40d0-a6ee-ca1804d72a90",
    active: true,
    role: "Sales Executive",
  },
  {
    id: "exec-nallakaman",
    name: "NALLAKAMAN",
    tamilName: "நல்லகாமன்",
    phone: "918925965837",
    profile_id: "012ae00b-7f53-4c82-b5e9-fbed4ffb8c6d",
    user_id: "bc6a28a6-7f3c-4ba2-974e-072b192e6c02",
    active: true,
    role: "Sales Executive",
  },
  {
    id: "exec-karthick",
    name: "KARTHICK",
    tamilName: "கார்த்திக்",
    phone: "919994440905",
    profile_id: "85f11697-ecc9-4447-ab69-8296421f144a",
    user_id: "944ed513-3b24-4daf-a159-66b37b63a967",
    active: true,
    role: "Sales Executive",
  },
];

export const DEFAULT_ADMIN_RECIPIENTS: AdminRecipient[] = [
  {
    id: "admin-md-sir",
    name: "MD Sir",
    phone: "919994440905",
    active: true,
  },
];

export const DEFAULT_ROUTING_CONFIG: LeadRoutingConfig = {
  enabled: true,
  assignmentMethod: "round_robin",
  notifyAdmin: true,
  notifyExecutive: true,
  adminRecipients: DEFAULT_ADMIN_RECIPIENTS,
  executives: DEFAULT_SALES_EXECUTIVES,
  slaMinutes: 5,
  lastAssignedIndex: 0,
};

export const MD_SIR_PHONE = "919994440905";
export const SALES_EXECUTIVES = DEFAULT_SALES_EXECUTIVES;

const CONFIG_TAG_NAME = "__lead_routing_config__";
let cachedConfig: LeadRoutingConfig = { ...DEFAULT_ROUTING_CONFIG };
let lastCacheTime = 0;

export async function getLeadRoutingConfig(): Promise<LeadRoutingConfig> {
  const now = Date.now();
  if (now - lastCacheTime < 30000 && cachedConfig) {
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
      const parsed = JSON.parse(data.color);
      cachedConfig = {
        ...DEFAULT_ROUTING_CONFIG,
        ...parsed,
        executives: parsed.executives || DEFAULT_SALES_EXECUTIVES,
        adminRecipients: parsed.adminRecipients || DEFAULT_ADMIN_RECIPIENTS,
      };
      lastCacheTime = now;
      return cachedConfig;
    }
  } catch (err) {
    console.error("[lead-alert] Error loading routing config:", err);
  }

  return cachedConfig || DEFAULT_ROUTING_CONFIG;
}

export async function saveLeadRoutingConfig(
  partial: Partial<LeadRoutingConfig>
): Promise<LeadRoutingConfig> {
  const current = await getLeadRoutingConfig();
  const updated: LeadRoutingConfig = {
    ...current,
    ...partial,
  };

  try {
    const admin = supabaseAdmin();
    const { data: existing } = await admin
      .from("tags")
      .select("id")
      .eq("name", CONFIG_TAG_NAME)
      .maybeSingle();

    const configJson = JSON.stringify(updated);

    if (existing) {
      await admin
        .from("tags")
        .update({ color: configJson })
        .eq("id", existing.id);
    } else {
      const { data: acc } = await admin
        .from("accounts")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (acc) {
        await admin.from("tags").insert({
          account_id: acc.id,
          name: CONFIG_TAG_NAME,
          color: configJson,
        });
      }
    }

    cachedConfig = updated;
    lastCacheTime = Date.now();
  } catch (err) {
    console.error("[lead-alert] Error saving routing config:", err);
  }

  return updated;
}

export function getNextRoundRobinExecutive(indexSeed?: number): SalesExecutive {
  const config = cachedConfig || DEFAULT_ROUTING_CONFIG;
  const activeExecs = config.executives.filter((e) => e.active !== false);
  const pool = activeExecs.length > 0 ? activeExecs : DEFAULT_SALES_EXECUTIVES;

  let idx = 0;
  if (typeof indexSeed === "number" && !isNaN(indexSeed)) {
    idx = Math.abs(indexSeed) % pool.length;
  } else {
    idx = (config.lastAssignedIndex + 1) % pool.length;
    config.lastAssignedIndex = idx;
    // Async save updated index in background without blocking
    saveLeadRoutingConfig({ lastAssignedIndex: idx }).catch(() => {});
  }

  return pool[idx];
}

export async function getNextRoundRobinExecutiveAsync(
  indexSeed?: number
): Promise<SalesExecutive> {
  const config = await getLeadRoutingConfig();
  const activeExecs = config.executives.filter((e) => e.active !== false);
  const pool = activeExecs.length > 0 ? activeExecs : DEFAULT_SALES_EXECUTIVES;

  let idx = 0;
  if (typeof indexSeed === "number" && !isNaN(indexSeed)) {
    idx = Math.abs(indexSeed) % pool.length;
  } else {
    idx = (config.lastAssignedIndex + 1) % pool.length;
    await saveLeadRoutingConfig({ lastAssignedIndex: idx });
  }

  return pool[idx];
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

export async function sendLeadAlerts({
  customerName,
  customerPhone,
  messageText,
  requirement,
  location,
  assignedExec,
  accessToken,
  phoneNumberId,
}: {
  customerName: string;
  customerPhone: string;
  messageText?: string;
  requirement?: string;
  location?: string;
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
  const nowStr = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const sla = config.slaMinutes || 5;

  // 1. Management Alerts to All Active Admin Recipients
  if (config.notifyAdmin) {
    const activeAdmins = (config.adminRecipients || DEFAULT_ADMIN_RECIPIENTS).filter(
      (a) => a.active !== false && a.phone
    );

    let mdMsg =
      `🔥 *NEW LEAD ALERT - Sri Lakshmi Industries*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Customer:* ${customerName}\n` +
      `📱 *Phone:* +${cleanCustomerPhone}\n`;
    if (requirement) mdMsg += `🏭 *Requirement:* ${requirement}\n`;
    if (location) mdMsg += `📍 *Location:* ${location}\n`;
    if (messageText) mdMsg += `💬 *Message:* "${messageText.slice(0, 200)}"\n`;
    mdMsg +=
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *Assigned Executive:* ${assignedExec.name} (+${assignedExec.phone})\n` +
      `⏰ *Time:* ${nowStr} (IST)\n` +
      `⚡ *SLA:* Call within ${sla} mins\n` +
      `🔗 *CRM Inbox:* https://sli-crm-rho.vercel.app/inbox`;

    for (const admin of activeAdmins) {
      const cleanAdminPhone = admin.phone.replace(/\D/g, "");
      try {
        await sendTextMessage({
          phoneNumberId,
          accessToken,
          to: cleanAdminPhone,
          text: mdMsg,
        });
        console.info(
          `[LeadAlert] Management summary sent to ${admin.name} (${cleanAdminPhone})`
        );
      } catch (err) {
        console.error(
          `[LeadAlert] Failed to send alert to admin ${admin.name} (${cleanAdminPhone}):`,
          err
        );
      }
    }
  }

  // 2. Bilingual Urgent Action Alert to Assigned Executive
  if (
    config.notifyExecutive &&
    assignedExec.phone &&
    assignedExec.phone.replace(/\D/g, "") !== cleanCustomerPhone
  ) {
    const cleanExecPhone = assignedExec.phone.replace(/\D/g, "");
    let execMsg =
      `🚨 *NEW LEAD ASSIGNED TO YOU! | புதிய லீட் உங்களுக்கு ஒதுக்கப்பட்டுள்ளது!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Customer / வாடிக்கையாளர்:* ${customerName}\n` +
      `📱 *Phone / எண்:* +${cleanCustomerPhone}\n`;
    if (requirement) execMsg += `🏭 *Requirement / தேவை:* ${requirement}\n`;
    if (location) execMsg += `📍 *Location / இடம்:* ${location}\n`;
    if (messageText) execMsg += `💬 *Message / தகவல்:* "${messageText.slice(0, 200)}"\n`;
    execMsg +=
      `⏰ *Time:* ${nowStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ *URGENT ACTION REQUIRED | உடனடி நடவடிக்கை தேவை:*\n` +
      `தயவுசெய்து இந்த வாடிக்கையாளரை அடுத்த ${sla} நிமிடங்களுக்குள் WhatsApp அல்லது Call செய்து பேசவும்!\n` +
      `(Please contact this customer within ${sla} minutes without delay!)\n\n` +
      `👉 *Click to WhatsApp / வாட்ஸ்அப் செய்ய:*\n` +
      `https://wa.me/${cleanCustomerPhone}\n\n` +
      `📞 *Click to Call / போன் செய்ய:*\n` +
      `tel:+${cleanCustomerPhone}\n\n` +
      `💻 *Open in CRM Portal:*\n` +
      `https://sli-crm-rho.vercel.app/inbox\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `- *Sri Lakshmi Industries Sales Management*`;

    try {
      await sendTextMessage({
        phoneNumberId,
        accessToken,
        to: cleanExecPhone,
        text: execMsg,
      });
      console.info(
        `[LeadAlert] Urgent lead alert sent to executive ${assignedExec.name} (${cleanExecPhone})`
      );
    } catch (err) {
      console.error(
        `[LeadAlert] Failed to send alert to executive ${assignedExec.name}:`,
        err
      );
    }
  }
}
