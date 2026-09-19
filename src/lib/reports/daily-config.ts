import { supabaseAdmin } from "@/lib/automations/admin-client";

export interface ReportRecipient {
  id: string;
  name: string;
  phone: string;
  language: "ta" | "en";
}

export interface DailyReportConfig {
  enabled: boolean;
  triggerTime: string; // "18:05" (HH:MM in 24h format IST)
  timezone: string;
  recipients: ReportRecipient[];
  lastSentDate?: string;
}

const DEFAULT_CONFIG: DailyReportConfig = {
  enabled: true,
  triggerTime: "18:05",
  timezone: "Asia/Kolkata",
  recipients: [
    {
      id: "md-1",
      name: "MD Sir",
      phone: "919994440905",
      language: "ta",
    },
    {
      id: "paval-1",
      name: "Paval J",
      phone: "919994440905",
      language: "ta",
    },
  ],
};

const CONFIG_TAG_NAME = "__daily_report_config__";

export async function getDailyReportConfig(): Promise<DailyReportConfig> {
  try {
    const admin = supabaseAdmin();
    const { data } = await admin
      .from("tags")
      .select("color")
      .eq("name", CONFIG_TAG_NAME)
      .maybeSingle();

    if (data?.color) {
      const parsed = JSON.parse(data.color);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error("[daily-report] Error loading config:", err);
  }
  return DEFAULT_CONFIG;
}

export async function saveDailyReportConfig(
  config: Partial<DailyReportConfig>
): Promise<DailyReportConfig> {
  const current = await getDailyReportConfig();
  const updated: DailyReportConfig = {
    ...current,
    ...config,
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
      const { data: acc } = await admin.from("accounts").select("id").limit(1).maybeSingle();
      if (acc) {
        await admin.from("tags").insert({
          account_id: acc.id,
          name: CONFIG_TAG_NAME,
          color: configJson,
        });
      }
    }
  } catch (err) {
    console.error("[daily-report] Error saving config:", err);
  }

  return updated;
}
