import { NextResponse } from "next/server";
import {
  getLeadRoutingConfig,
  sendLeadAlerts,
} from "@/lib/whatsapp/lead-alert";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import { decrypt } from "@/lib/whatsapp/encryption";
import { sendTextMessage, sendTemplateMessage } from "@/lib/whatsapp/meta-api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetType, targetExecutiveId, targetAdminPhone } = body;

    const config = await getLeadRoutingConfig();
    const admin = supabaseAdmin();

    const { data: wabaConfig } = await admin
      .from("whatsapp_config")
      .select("id, phone_number_id, access_token, status")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (!wabaConfig || !wabaConfig.phone_number_id) {
      return NextResponse.json(
        { ok: false, error: "WhatsApp Cloud API is not connected." },
        { status: 400 }
      );
    }

    let accessToken = "";
    try {
      accessToken = decrypt(wabaConfig.access_token);
    } catch (e) {
      accessToken = wabaConfig.access_token;
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Missing WhatsApp access token." },
        { status: 400 }
      );
    }

    const testLead = {
      customerName: "Sample Customer (Test Lead)",
      customerPhone: "919876543210",
      requirement: "Double Die Murukku Machine (Semi-Automatic)",
      location: "Madurai, Tamil Nadu",
      messageText: "Murukku machine price list and catalogue details thevai.",
    };

    if (targetType === "executive" && targetExecutiveId) {
      const exec = config.executives.find((e) => e.id === targetExecutiveId);
      if (!exec) {
        return NextResponse.json({ ok: false, error: "Executive not found" }, { status: 404 });
      }

      const cleanPhone = exec.phone.replace(/\D/g, "");
      const nowStr = new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const execMsg =
        `🧪 *TEST LEAD ALERT | சோதனை லீட் அறிவிப்பு*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Customer / வாடிக்கையாளர்:* ${testLead.customerName}\n` +
        `📱 *Phone / எண்:* +${testLead.customerPhone}\n` +
        `🏭 *Requirement / தேவை:* ${testLead.requirement}\n` +
        `📍 *Location / இடம்:* ${testLead.location}\n` +
        `💬 *Message / தகவல்:* "${testLead.messageText}"\n` +
        `⏰ *Time:* ${nowStr}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ *TEST VERIFICATION:* This is a test lead alert sent from CRM Lead Flow settings.\n` +
        `👉 *WhatsApp:* https://wa.me/${testLead.customerPhone}\n` +
        `📞 *Call:* tel:+${testLead.customerPhone}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `- *Sri Lakshmi Industries CRM Flow*`;

      try {
        await sendTemplateMessage({
          phoneNumberId: wabaConfig.phone_number_id,
          accessToken,
          to: cleanPhone,
          templateName: "sli_sales_lead_alert",
          language: "en_US",
          params: [
            testLead.customerName,
            testLead.customerPhone,
            testLead.requirement,
            testLead.location,
            nowStr,
          ],
        });
      } catch (tmplErr) {
        await sendTextMessage({
          phoneNumberId: wabaConfig.phone_number_id,
          accessToken,
          to: cleanPhone,
          text: execMsg,
        });
      }

      return NextResponse.json({
        ok: true,
        message: `Test alert sent successfully to Executive ${exec.name} (+${cleanPhone})!`,
      });
    }

    if (targetType === "admin" && targetAdminPhone) {
      const cleanPhone = targetAdminPhone.replace(/\D/g, "");
      const nowStr = new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const adminMsg =
        `🧪 *TEST MANAGEMENT ALERT - Sri Lakshmi Industries*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Customer:* ${testLead.customerName}\n` +
        `📱 *Phone:* +${testLead.customerPhone}\n` +
        `🏭 *Requirement:* ${testLead.requirement}\n` +
        `📍 *Location:* ${testLead.location}\n` +
        `💬 *Message:* "${testLead.messageText}"\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎯 *Assigned Executive:* Satheesh (+919786390479)\n` +
        `⏰ *Time:* ${nowStr} (IST)\n` +
        `⚡ *Note:* This is a test alert verifying management notifications.\n` +
        `🔗 *CRM:* https://sli-crm-rho.vercel.app/inbox`;

      try {
        await sendTemplateMessage({
          phoneNumberId: wabaConfig.phone_number_id,
          accessToken,
          to: cleanPhone,
          templateName: "sli_sales_lead_alert",
          language: "en_US",
          params: [
            testLead.customerName,
            testLead.customerPhone,
            testLead.requirement,
            testLead.location,
            nowStr,
          ],
        });
      } catch (tmplErr) {
        await sendTextMessage({
          phoneNumberId: wabaConfig.phone_number_id,
          accessToken,
          to: cleanPhone,
          text: adminMsg,
        });
      }

      return NextResponse.json({
        ok: true,
        message: `Test alert sent successfully to Management (+${cleanPhone})!`,
      });
    }

    // Full Flow Simulation
    const targetExec = config.executives.find((e) => e.active) || config.executives[0];
    await sendLeadAlerts({
      customerName: testLead.customerName,
      customerPhone: testLead.customerPhone,
      requirement: testLead.requirement,
      location: testLead.location,
      messageText: testLead.messageText,
      assignedExec: targetExec,
      accessToken,
      phoneNumberId: wabaConfig.phone_number_id,
    });

    return NextResponse.json({
      ok: true,
      message: `Full test lead alert dispatched to Management & ${targetExec.name}!`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

