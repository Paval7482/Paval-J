import { supabaseAdmin } from "@/lib/automations/admin-client";
import { getLeadRoutingConfig, DEFAULT_SALES_EXECUTIVES } from "@/lib/whatsapp/lead-alert";
import crypto from "crypto";

export interface ExecutiveSyncConfig {
  id: string;
  name: string;
  phone: string;
  userId: string;
  profileId?: string;
  syncMode: "leads_only" | "all";
  passKey: string;
  lastSyncAt: string | null;
  syncedMessagesCount: number;
  active: boolean;
}

const SYNC_CONFIG_TAG = "__sli_whatsapp_sync_config__";

export function generatePassKey(userId: string, phone: string, name: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const shortName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const rawHash = crypto.createHash("sha256").update(`${userId}:${cleanPhone}:sli_secret_sync_2026`).digest("hex").slice(0, 8);
  return `slicrm#${shortName}@${cleanPhone}&${rawHash}`;
}

export async function getWhatsAppSyncConfigs(): Promise<ExecutiveSyncConfig[]> {
  try {
    const admin = supabaseAdmin();
    const routingConfig = await getLeadRoutingConfig();
    const execs = routingConfig.executives || DEFAULT_SALES_EXECUTIVES;

    const { data } = await admin
      .from("tags")
      .select("color")
      .eq("name", SYNC_CONFIG_TAG)
      .maybeSingle();

    let savedMap: Record<string, Partial<ExecutiveSyncConfig>> = {};
    if (data?.color) {
      try {
        savedMap = JSON.parse(data.color);
      } catch (e) {
        console.warn("[sync-config] Parse error for sync configs:", e);
      }
    }

    const result: ExecutiveSyncConfig[] = execs.map((e) => {
      const saved = savedMap[e.id] || savedMap[e.user_id || ""] || {};
      const cleanPhone = (saved.phone || e.phone || "").replace(/\D/g, "");
      const userId = e.user_id || `user-${e.id}`;
      const passKey = saved.passKey || generatePassKey(userId, cleanPhone, e.name);

      return {
        id: e.id,
        name: e.name,
        phone: cleanPhone,
        userId: userId,
        profileId: e.profile_id,
        syncMode: saved.syncMode === "all" ? "all" : "leads_only",
        passKey,
        lastSyncAt: saved.lastSyncAt || null,
        syncedMessagesCount: saved.syncedMessagesCount || 0,
        active: e.active !== false,
      };
    });

    return result;
  } catch (err) {
    console.error("[sync-config] Error loading sync configs:", err);
    return DEFAULT_SALES_EXECUTIVES.map((e) => ({
      id: e.id,
      name: e.name,
      phone: e.phone.replace(/\D/g, ""),
      userId: e.user_id || `user-${e.id}`,
      profileId: e.profile_id,
      syncMode: "leads_only",
      passKey: generatePassKey(e.user_id || e.id, e.phone, e.name),
      lastSyncAt: null,
      syncedMessagesCount: 0,
      active: e.active !== false,
    }));
  }
}

export async function saveWhatsAppSyncConfigs(
  configs: ExecutiveSyncConfig[]
): Promise<boolean> {
  try {
    const admin = supabaseAdmin();
    const map: Record<string, ExecutiveSyncConfig> = {};
    configs.forEach((c) => {
      map[c.id] = c;
    });

    const jsonStr = JSON.stringify(map);

    const { data: existing } = await admin
      .from("tags")
      .select("id")
      .eq("name", SYNC_CONFIG_TAG)
      .maybeSingle();

    if (existing) {
      await admin
        .from("tags")
        .update({ color: jsonStr })
        .eq("id", existing.id);
    } else {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, user_id, account_id")
        .limit(1)
        .maybeSingle();

      const insertPayload: any = {
        name: SYNC_CONFIG_TAG,
        color: jsonStr,
      };
      if (profile?.user_id) insertPayload.user_id = profile.user_id;
      if (profile?.account_id) insertPayload.account_id = profile.account_id;

      await admin.from("tags").insert(insertPayload);
    }
    return true;
  } catch (err) {
    console.error("[sync-config] Error saving sync configs:", err);
    return false;
  }
}

export async function updateExecutiveSyncStats(
  userIdOrPhone: string,
  newMessagesCount: number
): Promise<void> {
  try {
    const cleanTarget = userIdOrPhone.replace(/\D/g, "");
    const configs = await getWhatsAppSyncConfigs();
    let updated = false;

    for (const c of configs) {
      if (
        c.userId === userIdOrPhone ||
        c.phone === cleanTarget ||
        (cleanTarget.length >= 10 && c.phone.endsWith(cleanTarget.slice(-10)))
      ) {
        c.lastSyncAt = new Date().toISOString();
        c.syncedMessagesCount = (c.syncedMessagesCount || 0) + newMessagesCount;
        updated = true;
      }
    }

    if (updated) {
      await saveWhatsAppSyncConfigs(configs);
    }
  } catch (e) {
    console.warn("[sync-config] Error updating sync stats:", e);
  }
}

export async function validatePassKey(passKey: string): Promise<ExecutiveSyncConfig | null> {
  if (!passKey) return null;
  const trimmedKey = passKey.trim();
  const configs = await getWhatsAppSyncConfigs();

  const found = configs.find(
    (c) => c.passKey.toLowerCase() === trimmedKey.toLowerCase()
  );

  if (found) return found;

  // Also support partial fallback if passkey is structured as slicrm#name@phone&token
  const match = trimmedKey.match(/^slicrm#([a-zA-Z0-9]+)@(\d+)&([a-zA-Z0-9]+)$/i);
  if (match) {
    const phone = match[2];
    const execByPhone = configs.find((c) => c.phone.endsWith(phone.slice(-10)));
    if (execByPhone) return execByPhone;
  }

  return null;
}
