import { getLeadRoutingConfig } from "@/lib/whatsapp/lead-alert";

export type BridgeEligibility =
  | "ELIGIBLE_CUSTOMER"
  | "BLOCKED_GROUP"
  | "BLOCKED_STAFF"
  | "BLOCKED_PERSONAL"
  | "BLOCKED_OFFICIAL_NUMBER"
  | "QUARANTINED_UNKNOWN";

export interface BridgeDecision {
  eligibility: BridgeEligibility;
  isAllowedToSync: boolean;
  reason: string;
}

export async function evaluateBridgeMessage(
  fromJid: string,
  rawPhone: string,
  personalBlacklist: Set<string> = new Set()
): Promise<BridgeDecision> {
  const cleanPhone = (rawPhone || "").replace(/\D/g, "");

  // 1. Block WhatsApp Group chats
  if (fromJid.includes("@g.us") || fromJid.includes("-")) {
    return {
      eligibility: "BLOCKED_GROUP",
      isAllowedToSync: false,
      reason: "🚫 WhatsApp Group chats are strictly blocked from CRM sync.",
    };
  }

  // 2. Minimum 10-digit phone requirement
  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      eligibility: "QUARANTINED_UNKNOWN",
      isAllowedToSync: false,
      reason: "🟡 Invalid phone number.",
    };
  }

  // 3. Protect Official Meta Cloud API Business Number (+91 99447 75513)
  if (cleanPhone === "919944775513") {
    return {
      eligibility: "BLOCKED_OFFICIAL_NUMBER",
      isAllowedToSync: false,
      reason: "🛡️ Official Meta Cloud API number is protected and managed via central webhooks.",
    };
  }

  // 4. Company Staff / Colleague Filter
  const routingConfig = await getLeadRoutingConfig();
  const staffPhones = new Set<string>();
  (routingConfig.executives || []).forEach((e) => {
    if (e.phone) staffPhones.add(e.phone.replace(/\D/g, ""));
  });
  (routingConfig.adminRecipients || []).forEach((a) => {
    if (a.phone) staffPhones.add(a.phone.replace(/\D/g, ""));
  });

  const tenDigits = cleanPhone.slice(-10);
  const twelveDigits = `91${tenDigits}`;

  if (staffPhones.has(cleanPhone) || staffPhones.has(tenDigits) || staffPhones.has(twelveDigits)) {
    return {
      eligibility: "BLOCKED_STAFF",
      isAllowedToSync: false,
      reason: "👤 Internal company staff/colleague chat - automatically excluded from CRM sync.",
    };
  }

  // 5. Personal Contact Blacklist
  if (personalBlacklist.has(cleanPhone) || personalBlacklist.has(tenDigits)) {
    return {
      eligibility: "BLOCKED_PERSONAL",
      isAllowedToSync: false,
      reason: "🔒 Contact marked as Personal/Private by executive - excluded from CRM.",
    };
  }

  return {
    eligibility: "ELIGIBLE_CUSTOMER",
    isAllowedToSync: true,
    reason: "🟢 Eligible Customer chat for CRM sync.",
  };
}
