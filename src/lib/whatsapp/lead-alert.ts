import { sendTextMessage } from "@/lib/whatsapp/meta-api";

export interface SalesExecutive {
  name: string;
  tamilName?: string;
  phone: string;
  profile_id: string;
  user_id: string;
}

export const SALES_EXECUTIVES: SalesExecutive[] = [
  {
    name: "SATHEESH",
    tamilName: "சதீஷ்",
    phone: "919786390479",
    profile_id: "fac4a28c-d56f-4f22-979c-b288cbdddaae",
    user_id: "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1",
  },
  {
    name: "SUBASH",
    tamilName: "சுபாஷ்",
    phone: "919384225223",
    profile_id: "7467ba31-21e8-4983-b475-c7a273486411",
    user_id: "b8db6f80-377c-41b9-bc79-458ed7733230",
  },
  {
    name: "BASKAR",
    tamilName: "பாஸ்கர்",
    phone: "918925964470",
    profile_id: "8b6f940b-e148-4261-a300-af35e8426bf2",
    user_id: "a909751b-7022-4e47-aaed-c7cfc5acd526",
  },
  {
    name: "BALA",
    tamilName: "பாலா",
    phone: "918925964469",
    profile_id: "1c245b47-b1d2-4de4-a717-03ff249a308d",
    user_id: "35760e9c-b82a-40d0-a6ee-ca1804d72a90",
  },
  {
    name: "NALLAKAMAN",
    tamilName: "நல்லகாமன்",
    phone: "918925965837",
    profile_id: "012ae00b-7f53-4c82-b5e9-fbed4ffb8c6d",
    user_id: "bc6a28a6-7f3c-4ba2-974e-072b192e6c02",
  },
  {
    name: "KARTHICK",
    tamilName: "கார்த்திக்",
    phone: "919994440905",
    profile_id: "85f11697-ecc9-4447-ab69-8296421f144a",
    user_id: "944ed513-3b24-4daf-a159-66b37b63a967",
  },
];

export const MD_SIR_PHONE = "919994440905";

export function getNextRoundRobinExecutive(indexSeed?: number): SalesExecutive {
  const idx = typeof indexSeed === "number" && !isNaN(indexSeed)
    ? Math.abs(indexSeed) % SALES_EXECUTIVES.length
    : Math.floor(Date.now() / 1000) % SALES_EXECUTIVES.length;
  return SALES_EXECUTIVES[idx];
}

export function findExecutiveByUserId(userId?: string | null): SalesExecutive | null {
  if (!userId) return null;
  return SALES_EXECUTIVES.find((e) => e.user_id === userId) || null;
}

export function findExecutiveByProfileId(profileId?: string | null): SalesExecutive | null {
  if (!profileId) return null;
  return SALES_EXECUTIVES.find((e) => e.profile_id === profileId) || null;
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
  const cleanCustomerPhone = customerPhone.replace(/\D/g, "");
  const nowStr = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // 1. Management Alert to MD Sir
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
    `🔗 *CRM Inbox:* https://sli-crm-rho.vercel.app/inbox`;

  try {
    await sendTextMessage({
      phoneNumberId,
      accessToken,
      to: MD_SIR_PHONE,
      text: mdMsg,
    });
    console.info(`[LeadAlert] Management summary sent to MD Sir (${MD_SIR_PHONE})`);
  } catch (err) {
    console.error("[LeadAlert] Failed to send alert to MD Sir:", err);
  }

  // 2. Bilingual Urgent Action Alert to Assigned Executive
  if (assignedExec.phone && assignedExec.phone !== cleanCustomerPhone) {
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
      `தயவுசெய்து இந்த வாடிக்கையாளரை அடுத்த 5 நிமிடங்களுக்குள் WhatsApp அல்லது Call செய்து பேசவும்!\n` +
      `(Please contact this customer within 5 minutes without delay!)\n\n` +
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
        to: assignedExec.phone,
        text: execMsg,
      });
      console.info(`[LeadAlert] Urgent lead alert sent to executive ${assignedExec.name} (${assignedExec.phone})`);
    } catch (err) {
      console.error(`[LeadAlert] Failed to send alert to executive ${assignedExec.name}:`, err);
    }
  }
}
