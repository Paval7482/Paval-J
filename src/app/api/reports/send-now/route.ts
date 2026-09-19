import { NextResponse } from "next/server";
import { getDailyReportConfig, saveDailyReportConfig } from "@/lib/reports/daily-config";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import { decrypt } from "@/lib/whatsapp/encryption";
import { sendTextMessage } from "@/lib/whatsapp/meta-api";

export async function POST(req: Request) {
  try {
    const config = await getDailyReportConfig();
    const admin = supabaseAdmin();

    const { data: wabaConfig } = await admin
      .from("whatsapp_config")
      .select("id, phone_number_id, access_token, status")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (!wabaConfig || !wabaConfig.phone_number_id) {
      return NextResponse.json({ ok: false, error: "WhatsApp Cloud API not connected." }, { status: 400 });
    }

    let accessToken = "";
    try {
      accessToken = decrypt(wabaConfig.access_token);
    } catch (e) {
      accessToken = wabaConfig.access_token;
    }

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Missing WhatsApp access token." }, { status: 400 });
    }

    const todayDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    const reportUrl = "https://sli-crm-rho.vercel.app/reports/daily";
    let sentCount = 0;
    const errors: string[] = [];

    for (const recipient of config.recipients) {
      const cleanPhone = recipient.phone.replace(/[^0-9]/g, "");
      if (!cleanPhone) continue;

      const isTamil = recipient.language === "ta";

      const messageText = isTamil
        ? `🔥 *ஸ்ரீ லக்ஷ்மி இண்டஸ்ட்ரீஸ் - தினசரி விற்பனை அறிக்கை*\n` +
          `📅 *தேதி:* ${todayDate}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `வணக்கம் ${recipient.name} Sir,\n\n` +
          `இன்றைய சேல்ஸ் டீம் My Telly அழைப்புகள், மெட்டா லீட்கள் மற்றும் வாட்ஸ்அப் என்குயரி அறிக்கை தயார்.\n\n` +
          `👉 *நேரலை மொபைல் அறிக்கையைப் பார்க்க கிளிக் செய்யவும்:*\n` +
          `🔗 ${reportUrl}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✅ *அறிக்கையில் உள்ளவை:*\n` +
          `• 📞 My Telly அழைப்புகள் & ஆடியோ ரெக்கார்டிங்\n` +
          `• 🎯 மெட்டா லீட்ஸ் & டீம் விநியோகம்\n` +
          `• 💬 வாட்ஸ்அப் ஃபாலோ-அப் நிலவரம்`
        : `🔥 *Sri Lakshmi Industries - Daily Sales Performance Report*\n` +
          `📅 *Date:* ${todayDate}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Hello ${recipient.name} Sir,\n\n` +
          `Today's Sales Team My Telly Calls, Meta Leads, and WhatsApp Enquiry Report is ready for review.\n\n` +
          `👉 *Click here to view the Live Mobile Report:*\n` +
          `🔗 ${reportUrl}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✅ *Report Highlights:*\n` +
          `• 📞 My Telly Calls & Audio Recordings\n` +
          `• 🎯 Meta Leads & Executive Distribution\n` +
          `• 💬 WhatsApp Follow-up Status`;

      try {
        await sendTextMessage({
          accessToken,
          phoneNumberId: wabaConfig.phone_number_id,
          to: cleanPhone,
          text: messageText,
        });
        sentCount++;
      } catch (err: any) {
        console.error(`Failed to send report to ${recipient.name} (${cleanPhone}):`, err);
        errors.push(`${recipient.name}: ${err.message || 'Send failed'}`);
      }
    }

    await saveDailyReportConfig({
      lastSentDate: new Date().toISOString().split("T")[0],
    });

    return NextResponse.json({
      ok: true,
      sentCount,
      totalRecipients: config.recipients.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
