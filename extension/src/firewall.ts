/**
 * 🛡️ SLI CRM Customer Eligibility Firewall (Browser-Level Isolation Engine)
 */

export type FirewallEligibility =
  | "ELIGIBLE_CUSTOMER"
  | "BLOCKED_GROUP"
  | "BLOCKED_STAFF"
  | "BLOCKED_PERSONAL"
  | "BLOCKED_OFFICIAL_NUMBER"
  | "QUARANTINED_UNKNOWN";

export interface FirewallDecision {
  eligibility: FirewallEligibility;
  isAllowedToSync: boolean;
  reason: string;
  customerName?: string;
  contactId?: string;
}

export interface FirewallContext {
  staffPhones: Set<string>;
  customerPhoneMap: Record<string, { contactId: string; name: string }>;
  personalBlacklist: Set<string>;
  officialBusinessNumber: string;
}

/**
 * Pure, isolated firewall evaluator.
 */
export function evaluateChatEligibility(
  chatId: string,
  rawPhone: string,
  context: FirewallContext
): FirewallDecision {
  const cleanPhone = (rawPhone || "").replace(/\D/g, "");

  // 1. Group Chat Rule
  if (chatId.includes("@g.us") || chatId.includes("-")) {
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
      reason: "🟡 Missing valid phone number. Please enter/confirm the 10-digit mobile number.",
    };
  }

  // 3. Official Meta Cloud API Business Number Protection (+91 99447 75513)
  if (cleanPhone === context.officialBusinessNumber.replace(/\D/g, "")) {
    return {
      eligibility: "BLOCKED_OFFICIAL_NUMBER",
      isAllowedToSync: false,
      reason: "🛡️ Official Meta Cloud API number is protected and managed via Central Webhooks.",
    };
  }

  // 4. Company Staff / Colleague Filter
  if (context.staffPhones.has(cleanPhone)) {
    return {
      eligibility: "BLOCKED_STAFF",
      isAllowedToSync: false,
      reason: "👤 Internal company staff/colleague chat - automatically excluded from CRM sync.",
    };
  }

  // 5. Personal Contact Blacklist (Explicitly blocked by executive)
  if (context.personalBlacklist.has(cleanPhone)) {
    return {
      eligibility: "BLOCKED_PERSONAL",
      isAllowedToSync: false,
      reason: "🔒 Contact marked as Personal/Private by executive - excluded from CRM.",
    };
  }

  // 6. Existing CRM Customer / Lead Check
  const tenDigit = cleanPhone.length === 12 && cleanPhone.startsWith("91") ? cleanPhone.substring(2) : cleanPhone;
  const twelveDigit = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const matchedCustomer =
    context.customerPhoneMap[cleanPhone] ||
    context.customerPhoneMap[tenDigit] ||
    context.customerPhoneMap[twelveDigit];

  if (matchedCustomer) {
    return {
      eligibility: "ELIGIBLE_CUSTOMER",
      isAllowedToSync: true,
      reason: `🟢 Existing CRM Customer: ${matchedCustomer.name}`,
      customerName: matchedCustomer.name,
      contactId: matchedCustomer.contactId,
    };
  }

  // 7. Unknown Number -> Quarantine Rule
  return {
    eligibility: "QUARANTINED_UNKNOWN",
    isAllowedToSync: false,
    reason: "🟡 Unknown number. Quarantined - click [+ Add as Lead] to promote to CRM before syncing.",
  };
}
