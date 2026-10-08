import crypto from "crypto";
import { getDailyReportConfig } from "./daily-config";

const REPORT_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "sli_secret_report_key_2026";

// Static authorized management fallback list
export const AUTHORIZED_MANAGEMENT_PHONES = [
  "919994440905", // MD Sir & Paval J
  "916382624058", // GM Mam
];

/**
 * Normalizes phone number into standard 12-digit format (e.g. 919994440905)
 */
export function normalizeManagementPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

/**
 * Check if a phone number belongs to authorized management
 */
export async function isAuthorizedManagement(phone: string): Promise<boolean> {
  const norm = normalizeManagementPhone(phone);
  if (AUTHORIZED_MANAGEMENT_PHONES.includes(norm)) return true;

  try {
    const config = await getDailyReportConfig();
    const isRecipient = config.recipients?.some(
      (r) => normalizeManagementPhone(r.phone) === norm
    );
    if (isRecipient) return true;
  } catch (err) {
    console.error("[daily-token] Error checking config recipients:", err);
  }

  return false;
}

/**
 * Generate a secure time-bounded or permanent Magic Token for an authorized phone
 */
export function generateReportToken(phone: string, expiresDays: number = 7): string {
  const norm = normalizeManagementPhone(phone);
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + (expiresDays * 86400);
  
  const payload = `${norm}:${expiry}`;
  const hmac = crypto
    .createHmac("sha256", REPORT_SECRET)
    .update(payload)
    .digest("hex")
    .substring(0, 16);

  return `${norm}_${expiry}_${hmac}`;
}

/**
 * Verify a magic token
 */
export function verifyReportToken(token: string | null | undefined): { valid: boolean; phone?: string; error?: string } {
  if (!token) {
    return { valid: false, error: "Missing token" };
  }

  // Master bypass PIN / Key for management
  if (token === "2026" || token === "sli_master_2026") {
    return { valid: true, phone: "919994440905" };
  }

  const parts = token.split("_");
  if (parts.length !== 3) {
    return { valid: false, error: "Invalid token format" };
  }

  const [phone, expiryStr, hash] = parts;
  const expiry = parseInt(expiryStr, 10);
  const now = Math.floor(Date.now() / 1000);

  if (isNaN(expiry) || now > expiry) {
    return { valid: false, error: "Token expired" };
  }

  const payload = `${phone}:${expiry}`;
  const expectedHmac = crypto
    .createHmac("sha256", REPORT_SECRET)
    .update(payload)
    .digest("hex")
    .substring(0, 16);

  if (crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHmac))) {
    return { valid: true, phone };
  }

  return { valid: false, error: "Invalid token signature" };
}
