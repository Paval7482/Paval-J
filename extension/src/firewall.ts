/**
 * 🛡️ SLI CRM Customer Eligibility Firewall (Browser-Level Isolation Engine)
 *
 * Enforces strict compliance rules client-side:
 * 1. Groups (@g.us) -> ALWAYS BLOCKED (0 Network Requests)
 * 2. Company Staff Numbers -> ALWAYS BLOCKED (0 Network Requests)
 * 3. Personal / Blacklisted Contacts -> ALWAYS BLOCKED (0 Network Requests)
 * 4. Official Business Number (+91 99447 75513) -> PROTECTED (0 Network Requests)
 * 5. Existing CRM Customer/Lead -> ELIGIBLE FOR MANUAL 1-CLICK SYNC
 * 6. Unknown Number -> QUARANTINED (No auto-sync / No auto-lead)
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
 * Guarantees that if a conversation is blocked, no network sync request can ever proceed.
 */
export function evaluateChatEligibility(
  chatId: string,
  rawPhone: string,
  context: FirewallContext
): FirewallDecision {
  const cleanPhone = (rawPhone || "").replace(/\D/g, "");

  // 1. Group Chat Rule
  if (chatId.includes("@g.us") || chatId.includes("-") || !cleanPhone) {
    return {
      eligibility: "BLOCKED_GROUP",
      isAllowedToSync: false,
      reason: "🚫 WhatsApp Group chats are strictly blocked from CRM sync.",
    };
  }

  // 2. Official Meta Cloud API Business Number Protection (+91 99447 75513)
  if (cleanPhone === context.officialBusinessNumber.replace(/\D/g, "")) {
    return {
      eligibility: "BLOCKED_OFFICIAL_NUMBER",
      isAllowedToSync: false,
      reason: "🛡️ Official Meta Cloud API number is protected and managed via Central Webhooks.",
    };
  }

  // 3. Company Staff / Colleague Filter
  if (context.staffPhones.has(cleanPhone)) {
    return {
      eligibility: "BLOCKED_STAFF",
      isAllowedToSync: false,
      reason: "👤 Internal company staff/colleague chat - automatically excluded from CRM sync.",
    };
  }

  // 4. Personal Contact Blacklist (Explicitly blocked by executive)
  if (context.personalBlacklist.has(cleanPhone)) {
    return {
      eligibility: "BLOCKED_PERSONAL",
      isAllowedToSync: false,
      reason: "🔒 Contact marked as Personal/Private by executive - excluded from CRM.",
    };
  }

  // 5. Existing CRM Customer / Lead Check
  const matchedCustomer = context.customerPhoneMap[cleanPhone];
  if (matchedCustomer) {
    return {
      eligibility: "ELIGIBLE_CUSTOMER",
      isAllowedToSync: true,
      reason: `🟢 Existing CRM Customer: ${matchedCustomer.name}`,
      customerName: matchedCustomer.name,
      contactId: matchedCustomer.contactId,
    };
  }

  // 6. Unknown Number -> Quarantine Rule
  return {
    eligibility: "QUARANTINED_UNKNOWN",
    isAllowedToSync: false,
    reason: "🟡 Unknown number. Quarantined - click [+ Add as Lead] to promote to CRM before syncing.",
  };
}
