import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";
import { findExistingContact } from "@/lib/contacts/dedupe";
import { sendTextMessage } from "@/lib/whatsapp/meta-api";
import { decrypt } from "@/lib/whatsapp/encryption";

export const maxDuration = 60;

const DEFAULT_VERIFY_TOKEN = process.env.META_LEADGEN_VERIFY_TOKEN || "sli_meta_leads_2026";

/**
 * 1. Webhook Handshake Verification (Meta GET request)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const isValidToken =
    token === DEFAULT_VERIFY_TOKEN ||
    token === "sli_meta_leads_token_2026" ||
    token === "sli_meta_leads_2026";

  if (mode === "subscribe" && isValidToken) {
    console.log("[Meta Lead Ads Webhook] Handshake verified successfully");
    return new Response(challenge || "OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
}

/**
 * 2. Ingest Lead Data (Meta POST request / Test Simulator)
 */
export async function POST(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await req.json().catch(() => ({}));

    console.log("[Meta Lead Ads Webhook] Received payload:", JSON.stringify(body));

    // Resolve Account & Default Owner
    const { data: accounts } = await admin
      .from("accounts")
      .select("id, name, owner_user_id")
      .limit(1);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ ok: false, error: "No account found in system" }, { status: 500 });
    }

    const account = accounts[0];
    const accountId = account.id;
    const adminUserId = account.owner_user_id;

    // Resolve WhatsApp Config (if configured)
    const { data: waConfig } = await admin
      .from("whatsapp_config")
      .select("phone_number_id, access_token")
      .eq("account_id", accountId)
      .maybeSingle();

    let waAccessToken: string | null = null;
    if (waConfig?.access_token) {
      try {
        waAccessToken = decrypt(waConfig.access_token);
      } catch {
        waAccessToken = null;
      }
    }

    const pageAccessToken =
      process.env.META_PAGE_ACCESS_TOKEN ||
      "EAB5KO8OoxwIBSQo0Gs3fFHG1OUm1OpRjDsybvDNRU6FNaXtaOZAZCXgwGMjeBxgEpR4knLmid7Cj9vr4TFyJhF24CoNW34YqlE9P9sZCCnRij5mSZBuWoEpmCN7e0fV4623QOlpCG8a0tsdFZB8DLmc6lvkS9yB6NrxAcrTbHWQvS5ZCapdZBL5NbLZA1TI4v5TpFQ0fZBe3lgQcBZA8o85SddMZCC4Sh1oeu7SYGCvX6dXolgZD" ||
      waAccessToken ||
      process.env.WHATSAPP_API_TOKEN;

    const phoneNumberId =
      waConfig?.phone_number_id ||
      process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Fetch team profiles for language routing
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, user_id, full_name, email")
      .eq("account_id", accountId);

    const allProfiles = profiles || [];

    // Check if this is a direct test submission from CRM UI
    if (body.test || body.isSimulator) {
      const result = await processLeadEntry({
        admin,
        accountId,
        adminUserId,
        allProfiles,
        waAccessToken,
        phoneNumberId,
        leadName: body.name || "Test Lead",
        rawPhone: body.phone || "+919876543210",
        campaignName: body.campaign || "murukku machine tamil 09\\09/2026",
        formName: body.formName || "Tamil Lead Form",
        state: body.state || "Tamil Nadu",
        district: body.district || "Madurai",
        businessType: body.businessType || "Murukku Business",
        capacity: body.capacity || "50 - 100 Kg/Day",
        customAnswers: body.customAnswers || {},
      });
      return NextResponse.json({ ok: true, simulated: true, lead: result });
    }

    // Process Meta Leadgen Event
    const entries = body.entry || [];
    const results: any[] = [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === "leadgen") {
          const leadgenValue = change.value || {};
          const leadgenId = leadgenValue.leadgen_id;
          const formId = leadgenValue.form_id;
          const adId = leadgenValue.ad_id;
          const campaignId = leadgenValue.campaign_id;

          let leadName = "Meta Lead";
          let rawPhone = "";
          let state = "Tamil Nadu";
          let district = "";
          let businessType = "Murukku Business";
          let capacity = "50 - 100 Kg/Day";
          let campaignName = "Meta Lead Campaign";
          let formName = "Instant Form";
          const customAnswers: Record<string, string> = {};

          // Fetch full lead data from Meta Graph API if access token available
          if (leadgenId && pageAccessToken) {
            try {
              const graphUrl = `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${pageAccessToken}`;
              const graphRes = await fetch(graphUrl);
              const graphData = await graphRes.json();

              console.log("[Meta Lead Ads] Graph API Lead Data:", JSON.stringify(graphData));

              if (graphData && Array.isArray(graphData.field_data)) {
                campaignName = graphData.campaign_name || campaignName;
                formName = graphData.form_name || formName;

                for (const field of graphData.field_data) {
                  const fname = (field.name || "").toLowerCase();
                  const fval = Array.isArray(field.values) ? field.values[0] : field.values;
                  if (!fval) continue;

                  if (fname.includes("full_name") || fname.includes("name")) {
                    leadName = String(fval).trim();
                  } else if (fname.includes("phone") || fname.includes("number") || fname.includes("mobile")) {
                    rawPhone = String(fval).trim();
                  } else if (fname.includes("state")) {
                    state = String(fval).trim();
                  } else if (fname.includes("city") || fname.includes("district")) {
                    district = String(fval).trim();
                  } else if (fname.includes("business") || fname.includes("type")) {
                    businessType = String(fval).trim();
                  } else if (fname.includes("capacity") || fname.includes("production")) {
                    capacity = String(fval).trim();
                  } else {
                    customAnswers[field.name] = String(fval);
                  }
                }
              }
            } catch (graphErr) {
              console.error("[Meta Lead Ads] Graph API fetch error:", graphErr);
            }
          }

          if (rawPhone) {
            const processed = await processLeadEntry({
              admin,
              accountId,
              adminUserId,
              allProfiles,
              waAccessToken,
              phoneNumberId,
              leadName,
              rawPhone,
              campaignName,
              formName,
              state,
              district,
              businessType,
              capacity,
              customAnswers,
              metaMeta: { leadgenId, formId, adId, campaignId },
            });
            results.push(processed);
          }
        }
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (err: any) {
    console.error("[Meta Lead Ads Webhook] Internal Error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

/**
 * Helper to process, assign, create deal and auto-reply to incoming lead
 */
async function processLeadEntry({
  admin,
  accountId,
  adminUserId,
  allProfiles,
  waAccessToken,
  phoneNumberId,
  leadName,
  rawPhone,
  campaignName,
  formName,
  state,
  district,
  businessType,
  capacity,
  customAnswers,
  metaMeta,
}: {
  admin: any;
  accountId: string;
  adminUserId: string;
  allProfiles: any[];
  waAccessToken?: string | null;
  phoneNumberId?: string | null;
  leadName: string;
  rawPhone: string;
  campaignName: string;
  formName: string;
  state: string;
  district: string;
  businessType: string;
  capacity: string;
  customAnswers: Record<string, string>;
  metaMeta?: Record<string, any>;
}) {
  // 1. Normalize Phone (+91...)
  const cleanDigits = rawPhone.replace(/\D/g, "");
  const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`;

  // 2. Determine Language & Lead Source
  const combined = `${campaignName} ${formName} ${state}`.toLowerCase();
  const isTamil = combined.includes("tamil") || combined.includes("tn") || combined.includes("tamil nadu");
  const isHindi = combined.includes("hindi") || combined.includes("north") || combined.includes("up") || combined.includes("delhi") || combined.includes("bihar");

  let language = "English / General";
  let leadSourceTag: "meta_tamil" | "meta_hindi" | "meta" = "meta";
  if (isTamil) {
    language = "Tamil";
    leadSourceTag = "meta_tamil";
  } else if (isHindi) {
    language = "Hindi";
    leadSourceTag = "meta_hindi";
  }

  // 3. Smart Language-Based Executive Routing
  let assignedUserId = adminUserId;
  let assignedProfileId: string | null = null;

  if (allProfiles.length > 0) {
    if (isHindi) {
      // Hindi team priority: Paval, RK Prasad, Karthick, MD Sir
      const hindiMatched = allProfiles.find((p) => {
        const n = (p.full_name || "").toLowerCase();
        return n.includes("paval") || n.includes("prasad") || n.includes("rk") || n.includes("md");
      });
      if (hindiMatched) {
        assignedUserId = hindiMatched.user_id;
        assignedProfileId = hindiMatched.id;
      }
    } else {
      // Tamil team priority: Nallakaman, Bala, Satheesh, Subash, Baskar, Karthick V
      const tamilMatched = allProfiles.find((p) => {
        const n = (p.full_name || "").toLowerCase();
        return (
          n.includes("nallakaman") ||
          n.includes("bala") ||
          n.includes("satheesh") ||
          n.includes("subash") ||
          n.includes("baskar") ||
          n.includes("karthick v")
        );
      });
      if (tamilMatched) {
        assignedUserId = tamilMatched.user_id;
        assignedProfileId = tamilMatched.id;
      }
    }
  }

  if (!assignedProfileId && assignedUserId) {
    const p = allProfiles.find((pr) => pr.user_id === assignedUserId);
    if (p) assignedProfileId = p.id;
  }

  // 4. Contact Lookup or Create
  let contact = await findExistingContact(admin, accountId, formattedPhone);

  if (!contact) {
    const { data: newContact, error: contactErr } = await admin
      .from("contacts")
      .insert({
        account_id: accountId,
        user_id: assignedUserId,
        name: leadName,
        phone: formattedPhone,
      })
      .select("*")
      .single();

    if (!contactErr && newContact) {
      contact = newContact;
    }
  }

  const contactId = contact ? contact.id : null;

  // 5. Update Contact Custom Profile Fields
  if (contactId) {
    try {
      const { data: customFields } = await admin.from("custom_fields").select("id, field_name");
      if (customFields && customFields.length > 0) {
        const fieldMap: Record<string, string> = {};
        customFields.forEach((f: any) => {
          fieldMap[f.field_name] = f.id;
        });

        const updates: any[] = [];
        if (fieldMap["State"] && state) {
          updates.push({ contact_id: contactId, custom_field_id: fieldMap["State"], value: state });
        }
        if (fieldMap["District"] && district) {
          updates.push({ contact_id: contactId, custom_field_id: fieldMap["District"], value: district });
        }
        if (fieldMap["Business Type"] && businessType) {
          updates.push({ contact_id: contactId, custom_field_id: fieldMap["Business Type"], value: businessType });
        }
        if (fieldMap["Production Capacity"] && capacity) {
          updates.push({ contact_id: contactId, custom_field_id: fieldMap["Production Capacity"], value: capacity });
        }
        if (fieldMap["Lead Status"]) {
          updates.push({ contact_id: contactId, custom_field_id: fieldMap["Lead Status"], value: "Enquiry" });
        }

        if (updates.length > 0) {
          await admin
            .from("contact_custom_values")
            .upsert(updates, { onConflict: "contact_id,custom_field_id" });
        }
      }
    } catch (cfErr) {
      console.warn("[Meta Lead Ads] Could not sync custom values:", cfErr);
    }
  }

  // 6. Pipeline & Deal Creation in "Enquiry" Stage
  let dealId: string | null = null;
  const { data: pipelines } = await admin.from("pipelines").select("id").eq("account_id", accountId).limit(1);

  if (pipelines && pipelines.length > 0 && contactId) {
    const pipelineId = pipelines[0].id;
    const { data: stages } = await admin
      .from("pipeline_stages")
      .select("id, name")
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: true });

    const enquiryStage =
      (stages || []).find((s: any) => s.name.toLowerCase().includes("enquiry"))?.id || stages?.[0]?.id;

    if (enquiryStage) {
      const dealTitle = `📥 Meta Lead: ${leadName} (${language})`;
      const dealNotes = [
        `📥 Meta Lead Ads Ingestion`,
        `Campaign: ${campaignName}`,
        `Form: ${formName}`,
        `Language: ${language}`,
        `Location: ${district ? `${district}, ` : ""}${state}`,
        `Business: ${businessType} (${capacity})`,
        metaMeta?.leadgenId ? `Meta Leadgen ID: ${metaMeta.leadgenId}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      // Check if deal already exists for this contact in pipeline
      const { data: existingDeal } = await admin
        .from("deals")
        .select("id")
        .eq("pipeline_id", pipelineId)
        .eq("contact_id", contactId)
        .maybeSingle();

      if (!existingDeal) {
        const { data: newDeal } = await admin
          .from("deals")
          .insert({
            account_id: accountId,
            user_id: assignedUserId,
            assigned_to: assignedProfileId,
            pipeline_id: pipelineId,
            stage_id: enquiryStage,
            contact_id: contactId,
            title: dealTitle,
            value: 0,
            currency: "INR",
            status: "open",
            notes: dealNotes,
          })
          .select("id")
          .single();

        if (newDeal) dealId = newDeal.id;
      } else {
        dealId = existingDeal.id;
      }
    }
  }

  // 7. Record Form Answers in Contact Notes
  if (contactId) {
    const noteLines = [
      `📥 Meta Ad Lead Form Submission (${language})`,
      `📢 Campaign: ${campaignName}`,
      `📋 Form: ${formName}`,
      `📍 Location: ${district ? `${district}, ` : ""}${state}`,
      `🏭 Requirement: ${businessType} - ${capacity}`,
      ...Object.entries(customAnswers).map(([k, v]) => `• ${k}: ${v}`),
      `👤 Assigned Executive: ${allProfiles.find((p) => p.id === assignedProfileId)?.full_name || "Sales Admin"}`,
    ];

    await admin.from("contact_notes").insert({
      account_id: accountId,
      contact_id: contactId,
      note_text: noteLines.join("\n"),
    });
  }

  // 8. Trigger Instant WhatsApp Welcome Message (if configured)
  const token = waAccessToken || process.env.WHATSAPP_API_TOKEN;
  const waPhoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (token && waPhoneId && formattedPhone) {
    try {
      const welcomeText =
        isTamil
          ? `வணக்கம் ${leadName}! 🙏\n\nஸ்ரீ லக்ஷ்மி இண்டஸ்ட்ரீஸ் முறுக்கு மெஷின் விவரங்களை கேட்டதற்கு நன்றி!\n\nஎங்களின் எக்ஸிகியூட்டிவ் உங்களை விரைவில் தொடர்புகொள்வார். மெஷின் வீடியோ மற்றும் விலை விபரங்களை அறிய எங்களை தொடர்பு கொள்ளவும்.`
          : isHindi
          ? `नमस्ते ${leadName}! 🙏\n\nश्री लक्ष्मी इंडस्ट्रीज मुरुक्कु मशीन की जानकारी के लिए धन्यवाद!\n\nहमारे एग्जीक्यूटिव आपसे जल्द ही संपर्क करेंगे। मशीन वीडियो और मूल्य सूची के लिए हमसे संपर्क करें।`
          : `Hello ${leadName}! 🙏\n\nThank you for showing interest in Sri Lakshmi Industries Murukku Machines!\n\nOur executive will get in touch with you shortly.`;

      await sendTextMessage({
        phoneNumberId: waPhoneId,
        accessToken: token,
        to: formattedPhone.replace(/\D/g, ""),
        text: welcomeText,
      });
      console.log(`[Meta Lead Ads] WhatsApp Welcome message sent to ${formattedPhone}`);
    } catch (waErr) {
      console.warn(`[Meta Lead Ads] WhatsApp auto-send skipped/failed:`, waErr);
    }
  }

  return {
    contactId,
    dealId,
    leadName,
    formattedPhone,
    language,
    leadSourceTag,
    assignedExecutive: allProfiles.find((p) => p.id === assignedProfileId)?.full_name || "Sales Admin",
  };
}
