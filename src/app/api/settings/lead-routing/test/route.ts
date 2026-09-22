import { NextResponse } from "next/server";
import {
  getLeadRoutingConfig,
  saveLeadRoutingConfig,
  sendLeadAlerts,
  detectLanguageFromLead,
  getCustomerWelcomeTemplateForLang,
  renderLeadTemplate,
  type SalesExecutive,
  type SupportedLanguage,
  type LeadAssignmentMethod,
  DEFAULT_EXECUTIVE_TEMPLATE,
  DEFAULT_ADMIN_TEMPLATE,
} from "@/lib/whatsapp/lead-alert";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import { decrypt } from "@/lib/whatsapp/encryption";
import { sendTextMessage, sendTemplateMessage } from "@/lib/whatsapp/meta-api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      targetType,
      targetExecutiveId,
      targetAdminPhone,
      method,
      testLanguage,
      testLocation,
      customerName = "Sample Customer (Live Test)",
      customerPhone = "919876543210",
      requirement = "Double Die Murukku Machine (Semi-Automatic)",
      sendActualWhatsApp = false,
    } = body;

    const config = await getLeadRoutingConfig();
    const admin = supabaseAdmin();
    const activeExecs = config.executives.filter((e) => e.active !== false);

    if (activeExecs.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No active sales executives configured." },
        { status: 400 }
      );
    }

    const nowStr = new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const activeMethod: LeadAssignmentMethod = method || config.assignmentMethod || "round_robin";

    // ─────────────────────────────────────────────────────────────
    // STRATEGY SIMULATION TESTER (Instant Testing for All 4 Options)
    // ─────────────────────────────────────────────────────────────
    if (targetType === "simulate_assignment") {
      let chosenExec: SalesExecutive = activeExecs[0];
      let reason = "";
      let matchedLang: SupportedLanguage = (testLanguage as SupportedLanguage) || "en";
      let workloadStats: { name: string; openLeads: number }[] = [];
      let queue: { name: string; isNext: boolean; rank?: number; phone: string; languages?: string[] }[] = [];

      if (activeMethod === "round_robin") {
        const nextIdx = (config.lastAssignedIndex + 1) % activeExecs.length;
        chosenExec = activeExecs[nextIdx] || activeExecs[0];
        reason = `Equal Round Robin turn: Lead assigned to ${chosenExec.name} (Position #${nextIdx + 1} of ${activeExecs.length} in rotation queue).`;
        
        // Advance the rotation index in settings so next test moves to next person
        await saveLeadRoutingConfig({ lastAssignedIndex: nextIdx });

        queue = activeExecs.map((e, idx) => ({
          name: e.name,
          phone: e.phone,
          languages: e.languages,
          isNext: idx === nextIdx,
          rank: idx + 1,
        }));
      } else if (activeMethod === "priority_sequence") {
        const sorted = [...activeExecs].sort((a, b) => (a.priority || 999) - (b.priority || 999));
        // In priority sequence, lead #1 goes to priority 1
        chosenExec = sorted[0];
        reason = `Priority Sequence: Lead routed to #${chosenExec.priority || 1} Primary Sales Executive (${chosenExec.name}) as configured in order.`;

        queue = sorted.map((e, idx) => ({
          name: e.name,
          phone: e.phone,
          languages: e.languages,
          isNext: idx === 0,
          rank: e.priority || idx + 1,
        }));
      } else if (activeMethod === "language_match") {
        const targetLang = (testLanguage as SupportedLanguage) || detectLanguageFromLead({ location: testLocation, language: testLanguage });
        matchedLang = targetLang;
        const matching = activeExecs.filter((e) => e.languages && e.languages.includes(targetLang));
        
        if (matching.length > 0) {
          chosenExec = matching[0];
          reason = `Language Match (${targetLang.toUpperCase()}): Lead from ${testLocation || targetLang.toUpperCase()} matched with specialist executive ${chosenExec.name} (${chosenExec.languages?.join(", ")}).`;
          queue = matching.map((e, idx) => ({
            name: e.name,
            phone: e.phone,
            languages: e.languages,
            isNext: idx === 0,
            rank: idx + 1,
          }));
        } else {
          chosenExec = activeExecs[0];
          reason = `Language Match fallback: No executive specialized exclusively in ${targetLang.toUpperCase()}; routed to primary executive ${chosenExec.name}.`;
          queue = activeExecs.map((e, idx) => ({
            name: e.name,
            phone: e.phone,
            languages: e.languages,
            isNext: idx === 0,
            rank: idx + 1,
          }));
        }
      } else if (activeMethod === "workload_balanced") {
        // Query open deals count per executive to find least loaded
        try {
          const { data: deals } = await admin
            .from("deals")
            .select("user_id, assigned_to, status")
            .in("status", ["open", "enquiry", "pending", "in_progress"]);

          const loadMap: Record<string, number> = {};
          activeExecs.forEach((e) => {
            loadMap[e.id] = 0;
          });

          if (deals) {
            deals.forEach((d: any) => {
              const matched = activeExecs.find(
                (e) => e.user_id === d.user_id || e.profile_id === d.assigned_to
              );
              if (matched) {
                loadMap[matched.id] = (loadMap[matched.id] || 0) + 1;
              }
            });
          }

          // Sort by lowest open deals
          const sortedByLoad = [...activeExecs].sort(
            (a, b) => (loadMap[a.id] || 0) - (loadMap[b.id] || 0)
          );

          chosenExec = sortedByLoad[0];
          workloadStats = sortedByLoad.map((e) => ({
            name: e.name,
            openLeads: loadMap[e.id] || 0,
          }));

          reason = `Workload Balanced: Assigned to ${chosenExec.name} with the lowest active lead volume (${loadMap[chosenExec.id] || 0} open leads).`;
          queue = sortedByLoad.map((e, idx) => ({
            name: `${e.name} (${loadMap[e.id] || 0} leads)`,
            phone: e.phone,
            languages: e.languages,
            isNext: idx === 0,
            rank: idx + 1,
          }));
        } catch {
          chosenExec = activeExecs[0];
          reason = `Workload Balanced default: Assigned to ${chosenExec.name}.`;
        }
      }

      // Generate rendered preview messages
      const templateVars = {
        customer_name: customerName,
        customer_phone: customerPhone,
        requirement,
        location: testLocation || "Madurai, Tamil Nadu",
        customer_message: "Murukku machine price list and catalogue details venum.",
        executive_name: chosenExec.name,
        executive_tamil_name: chosenExec.tamilName || chosenExec.name,
        executive_phone: chosenExec.phone.replace(/\D/g, ""),
        time: nowStr,
        sla_minutes: config.slaMinutes || 5,
        quick_call_link: `https://wa.me/${customerPhone}`,
        crm_inbox_link: "https://sli-crm-rho.vercel.app/inbox",
      };

      const custTemplate = getCustomerWelcomeTemplateForLang(matchedLang, config);
      const renderedCustomerMsg = renderLeadTemplate(custTemplate, templateVars);
      const renderedExecMsg = renderLeadTemplate(config.executiveAlertTemplate || DEFAULT_EXECUTIVE_TEMPLATE, templateVars);
      const renderedAdminMsg = renderLeadTemplate(config.adminAlertTemplate || DEFAULT_ADMIN_TEMPLATE, templateVars);

      let sentWhatsApp = false;
      if (sendActualWhatsApp) {
        try {
          const { data: wabaConfig } = await admin
            .from("whatsapp_config")
            .select("id, phone_number_id, access_token, status")
            .eq("status", "connected")
            .limit(1)
            .maybeSingle();

          if (wabaConfig?.phone_number_id) {
            let accessToken = "";
            try {
              accessToken = decrypt(wabaConfig.access_token);
            } catch {
              accessToken = wabaConfig.access_token;
            }

            if (accessToken) {
              await sendLeadAlerts({
                customerName,
                customerPhone,
                requirement,
                location: testLocation || "Tamil Nadu",
                messageText: "Test Lead Automation Simulation",
                assignedExec: chosenExec,
                accessToken,
                phoneNumberId: wabaConfig.phone_number_id,
              });
              sentWhatsApp = true;
            }
          }
        } catch (wErr) {
          console.warn("[test] Live WhatsApp alert dispatch during test simulation:", wErr);
        }
      }

      return NextResponse.json({
        ok: true,
        simulation: {
          method: activeMethod,
          assignedExecutive: chosenExec,
          reason,
          matchedLanguage: matchedLang,
          workloadStats,
          queue,
          renderedCustomerMsg,
          renderedExecMsg,
          renderedAdminMsg,
        },
        sentWhatsApp,
        message: `Simulation Success! Lead assigned to ${chosenExec.name} via ${activeMethod.replace(/_/g, " ").toUpperCase()}.${sentWhatsApp ? " Live WhatsApp alert sent!" : ""}`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // DIRECT TARGET ALERT DISPATCH (Single Exec or Admin Ping)
    // ─────────────────────────────────────────────────────────────
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
    } catch {
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
      } catch {
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
      } catch {
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


