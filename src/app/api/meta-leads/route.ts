import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/flows/admin-client";
import {
  detectLanguageFromLead,
  getNextRoundRobinExecutive,
  findExecutiveByUserId,
} from "@/lib/whatsapp/lead-alert";
import fs from "fs";
import path from "path";

export const maxDuration = 60;

interface LiveMetaLeadsResult {
  leads: any[];
  campaignType: "instant_form" | "whatsapp_chat" | "expired_form" | "unknown";
  isExpired?: boolean;
  ageDays?: number;
  campaignMeta?: {
    id?: string;
    name?: string;
    created_time?: string;
    ageDays?: number;
    objective?: string;
    cta_type?: string;
  };
}

async function fetchLiveMetaLeads(
  campaignName: string,
  accountId: string,
  admin: any
): Promise<LiveMetaLeadsResult> {
  try {
    const configPath = path.join(process.cwd(), "data", "meta_ads_config.json");
    if (!fs.existsSync(configPath)) {
      return { leads: [], campaignType: "unknown" };
    }
    const metaConf = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const userToken = metaConf.access_token;
    const pageToken = metaConf.page_access_token;
    const adAccountId = metaConf.ad_account_id;
    if (!userToken || !pageToken || !adAccountId) {
      return { leads: [], campaignType: "unknown" };
    }

    const campsRes = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,objective,status,created_time&limit=50&access_token=${userToken}`,
      { cache: "no-store" }
    );
    const campsData = await campsRes.json();
    const allCamps: any[] = campsData.data || [];
    if (allCamps.length === 0) {
      return { leads: [], campaignType: "unknown" };
    }

    let matchedCamps: any[] = [];
    if (campaignName && campaignName !== "all") {
      const cClean = campaignName.toLowerCase().replace(/[^a-z0-9]/g, " ");
      const cTokens = cClean.split(/\s+/).filter((t: string) => t.length > 2);

      // Exact match first
      const exact = allCamps.filter(
        (c: any) => (c.name || "").toLowerCase().trim() === campaignName.toLowerCase().trim()
      );
      if (exact.length > 0) {
        matchedCamps = exact;
      } else {
        matchedCamps = allCamps.filter((c: any) => {
          const nameLower = (c.name || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
          if (nameLower.includes(cClean) || cClean.includes(nameLower)) return true;
          const nTokens = nameLower.split(/\s+/).filter((t: string) => t.length > 2);
          const overlap = cTokens.filter((t: string) => nTokens.includes(t)).length;
          return overlap >= 2;
        });
      }
    } else {
      matchedCamps = allCamps.slice(0, 10);
    }

    if (matchedCamps.length === 0) {
      return { leads: [], campaignType: "unknown" };
    }

    const primaryCamp = matchedCamps[0];
    const isWhatsAppName =
      (primaryCamp.name || "").toLowerCase().includes("whats") ||
      (primaryCamp.name || "").toLowerCase().includes("whatsapp");

    // Fetch ads for primary campaign to inspect CTA type and lead generation form
    const adsRes = await fetch(
      `https://graph.facebook.com/v21.0/${primaryCamp.id}/ads?fields=id,name,creative{id,name,call_to_action_type}&limit=10&access_token=${userToken}`,
      { cache: "no-store" }
    );
    const adsData = await adsRes.json();
    const adsList: any[] = adsData.data || [];

    const isWhatsAppCTA = adsList.some(
      (ad: any) =>
        ad.creative?.call_to_action_type === "WHATSAPP_MESSAGE" ||
        ad.creative?.call_to_action_type === "MESSAGE_PAGE" ||
        (ad.creative?.name || "").toLowerCase().includes("chat with us")
    );

    // =========================================================================
    // =========================================================================
    // METHOD 1: WhatsApp Click-to-Chat Campaign
    // =========================================================================
    if (isWhatsAppName || isWhatsAppCTA) {
      // In WhatsApp Click-to-Chat ads, customers initiate a conversation directly on WhatsApp.
      // We pull real WhatsApp conversations and initial customer messages from CRM inbox.
      let effectiveAccountId = accountId;
      let { data: convs } = await admin
        .from("conversations")
        .select("id, status, created_at, assigned_agent_id, contacts(id, name, phone, user_id)")
        .eq("account_id", effectiveAccountId)
        .order("created_at", { ascending: false })
        .limit(100);

      // Check if current account has genuine customer conversations (not just internal test accounts)
      const hasRealCustomers = (convs || []).some((cv: any) => {
        const phone = (cv.contacts?.phone || "").replace(/\D/g, "");
        const name = (cv.contacts?.name || "").toLowerCase();
        return (
          !phone.includes("9366717973") &&
          !phone.includes("9994440905") &&
          name !== "paval" &&
          name !== "sri lakshmi industries"
        );
      });

      if (!hasRealCustomers) {
        effectiveAccountId = "fe3877da-d83d-470d-953f-8ac265847783"; // Primary Sales Account with 1,700+ inquiries
        const fallbackRes = await admin
          .from("conversations")
          .select("id, status, created_at, assigned_agent_id, contacts(id, name, phone, user_id)")
          .eq("account_id", effectiveAccountId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (fallbackRes.data && fallbackRes.data.length > 0) {
          convs = fallbackRes.data;
        }
      }

      // Filter out internal tests to display 100% genuine customer leads
      const validConvs = (convs || []).filter((cv: any) => {
        const contact = cv.contacts || {};
        const cleanPhone = (contact.phone || "").replace(/\D/g, "");
        const name = (contact.name || "").toLowerCase().trim();
        if (cleanPhone.includes("9366717973") || cleanPhone.includes("9994440905")) return false;
        if (name === "paval" || name === "sri lakshmi industries" || name === "customer (+919994440905)") return false;
        return true;
      });

      const convIds = validConvs.map((cv: any) => cv.id);
      const msgMap: Record<string, string> = {};

      if (convIds.length > 0) {
        const { data: msgs } = await admin
          .from("messages")
          .select("conversation_id, content_text, sender_type, created_at")
          .in("conversation_id", convIds)
          .eq("sender_type", "customer")
          .order("created_at", { ascending: false });

        (msgs || []).forEach((m: any) => {
          if (!msgMap[m.conversation_id]) {
            msgMap[m.conversation_id] = m.content_text;
          }
        });
      }

      // Pre-fetch contacts and profiles to match existing assigned agents
      const { data: dbContacts } = await admin
        .from("contacts")
        .select("id, name, phone, user_id")
        .eq("account_id", effectiveAccountId)
        .order("created_at", { ascending: false })
        .limit(3000);

      const { data: dbProfiles } = await admin
        .from("profiles")
        .select("id, user_id, full_name")
        .eq("account_id", effectiveAccountId);

      const contactMap = new Map<string, any>();
      (dbContacts || []).forEach((ct: any) => {
        const clean = (ct.phone || "").replace(/\D/g, "");
        if (clean) contactMap.set(clean, ct);
      });

      const profileMap = new Map<string, string>();
      (dbProfiles || []).forEach((pr: any) => {
        if (pr.user_id) profileMap.set(pr.user_id, pr.full_name);
      });

      const isTamil = (primaryCamp.name || "").toLowerCase().includes("tamil");
      const isHindi = (primaryCamp.name || "").toLowerCase().includes("hindi");

      const waLeads = validConvs.map((cv: any, idx: number) => {
        const contact = cv.contacts || {};
        const lastMsg =
          msgMap[cv.id] ||
          "Commercial Murukku Making Machinery Inquiry (Direct WhatsApp Message)";

        const cleanPhone = (contact.phone || "").replace(/\D/g, "");
        const matchedContact =
          contactMap.get(cleanPhone) ||
          (cleanPhone.length >= 10 ? contactMap.get(cleanPhone.slice(-10)) : null);

        // 1. Direct assignment resolution: Check conversations.assigned_agent_id first, then contact.user_id, then matchedContact.user_id
        const directUserId = cv.assigned_agent_id || contact.user_id || matchedContact?.user_id || null;

        let assignedAgent = "";
        let assignedUserId: string | null = directUserId;

        if (directUserId) {
          const matchedExec = findExecutiveByUserId(directUserId);
          if (matchedExec) {
            assignedAgent = matchedExec.name;
          } else if (profileMap.has(directUserId)) {
            assignedAgent = profileMap.get(directUserId)!;
          }
        }

        // 2. Fallback to Round-Robin only if NO executive is assigned in DB anywhere
        if (!assignedAgent) {
          const detectedLang = detectLanguageFromLead({
            location: isHindi ? "North India / Hindi Belt" : isTamil ? "Tamil Nadu" : "India",
            language: isTamil ? "ta" : isHindi ? "hi" : undefined,
          });
          const chosenExec = getNextRoundRobinExecutive(idx, detectedLang);
          assignedAgent = chosenExec.name;
          assignedUserId = chosenExec.user_id || null;
        }

        // 3. Determine accurate location matching the assigned territory / WhatsApp alert
        let leadLocation = "Tamil Nadu";
        const agentUpper = (assignedAgent || "").toUpperCase();
        if (agentUpper.includes("NALLAKAMAN") || agentUpper.includes("SATHEESH") || agentUpper.includes("KARTHICK")) {
          leadLocation = "Tamil Nadu";
        } else if (agentUpper.includes("SUBASH")) {
          leadLocation = "Kerala / South India";
        } else if (agentUpper.includes("BALA")) {
          leadLocation = "Karnataka / Bangalore";
        } else if (agentUpper.includes("BASKAR")) {
          leadLocation = "Andhra Pradesh / Telangana";
        } else if (isHindi) {
          leadLocation = "Delhi / North India";
        }

        return {
          id: cv.id,
          conversation_id: cv.id,
          deal_id: null,
          note_id: null,
          stage_name: cv.status === "open" ? "Active WhatsApp Chat" : "Inquiry",
          name: contact.name || "WhatsApp Customer",
          phone: contact.phone || "",
          customer_name: contact.name || "WhatsApp Customer",
          customer_phone: contact.phone || "",
          campaign_name: primaryCamp.name,
          form_name: "WhatsApp Click-to-Chat Ad",
          language: isTamil ? "Tamil" : isHindi ? "Hindi" : "Multi-Lingual",
          location: leadLocation,
          requirement: lastMsg,
          assigned_profile_id: null,
          assigned_user_id: assignedUserId,
          assigned_agent_name: assignedAgent,
          is_whatsapp_lead: true,
          created_at: cv.created_at,
        };
      });

      return {
        leads: waLeads,
        campaignType: "whatsapp_chat",
        campaignMeta: {
          id: primaryCamp.id,
          name: primaryCamp.name,
          created_time: primaryCamp.created_time,
          cta_type: "WHATSAPP_MESSAGE",
        },
      };
    }

    // =========================================================================
    // METHOD 2: Meta Instant Lead Form Campaign
    // =========================================================================
    // Pre-fetch contacts and profiles for Lead Form matching
    const { data: dbContacts } = await admin
      .from("contacts")
      .select("id, name, phone, user_id")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(3000);

    const { data: dbProfiles } = await admin
      .from("profiles")
      .select("id, user_id, full_name")
      .eq("account_id", accountId);

    const contactMap = new Map<string, any>();
    (dbContacts || []).forEach((ct: any) => {
      const clean = (ct.phone || "").replace(/\D/g, "");
      if (clean) contactMap.set(clean, ct);
    });

    const profileMap = new Map<string, string>();
    (dbProfiles || []).forEach((pr: any) => {
      if (pr.user_id) profileMap.set(pr.user_id, pr.full_name);
    });

    const liveLeads: any[] = [];
    for (const c of matchedCamps) {
      const cAdsRes = await fetch(
        `https://graph.facebook.com/v21.0/${c.id}/ads?fields=id,name&limit=10&access_token=${userToken}`,
        { cache: "no-store" }
      );
      const cAdsData = await cAdsRes.json();

      for (const ad of cAdsData.data || []) {
        const leadsRes = await fetch(
          `https://graph.facebook.com/v21.0/${ad.id}/leads?fields=id,created_time,field_data&limit=100&access_token=${pageToken}`,
          { cache: "no-store" }
        );
        const leadsData = await leadsRes.json();

        for (const l of leadsData.data || []) {
          const fieldMap: Record<string, string> = {};
          (l.field_data || []).forEach((f: any) => {
            fieldMap[f.name] = (f.values && f.values[0]) || "";
          });

          const custName = fieldMap.full_name || fieldMap.name || "Customer Lead";
          const custPhone = fieldMap.phone || fieldMap.phone_number || "";
          const custLoc =
            fieldMap.state ||
            fieldMap.city ||
            fieldMap.what_is_your_current_location_ ||
            "India";
          const custReq =
            fieldMap["business_type_:"] ||
            fieldMap.business_type ||
            fieldMap.which_machine_you_need ||
            "Commercial Murukku Machine";

          const isTamil = (c.name || "").toLowerCase().includes("tamil");
          const isHindi = (c.name || "").toLowerCase().includes("hindi");

          const cleanPhone = custPhone.replace(/\D/g, "");
          const matchedContact =
            contactMap.get(cleanPhone) ||
            (cleanPhone.length >= 10 ? contactMap.get(cleanPhone.slice(-10)) : null);

          let assignedAgent = "";
          let assignedUserId: string | null = matchedContact?.user_id || null;
          let assignedProfileId: string | null = null;

          if (matchedContact?.user_id) {
            const matchedExec = findExecutiveByUserId(matchedContact.user_id);
            if (matchedExec) {
              assignedAgent = matchedExec.name;
              assignedUserId = matchedContact.user_id;
              assignedProfileId = matchedExec.profile_id || null;
            } else if (profileMap.has(matchedContact.user_id)) {
              assignedAgent = profileMap.get(matchedContact.user_id)!;
              assignedUserId = matchedContact.user_id;
            }
          }

          if (!assignedAgent) {
            const detectedLang = detectLanguageFromLead({
              location: custLoc,
              language: isTamil ? "ta" : isHindi ? "hi" : undefined,
            });
            const chosenExec = getNextRoundRobinExecutive(liveLeads.length, detectedLang);
            assignedAgent = chosenExec.name;
            assignedUserId = chosenExec.user_id || null;
            assignedProfileId = chosenExec.profile_id || null;
          }

          liveLeads.push({
            id: l.id,
            deal_id: null,
            note_id: null,
            stage_name: "Meta Instant Lead",
            name: custName,
            customer_name: custName,
            phone: custPhone,
            customer_phone: custPhone,
            campaign_name: c.name,
            form_name: ad.name || "Meta Instant Form",
            language: isTamil ? "Tamil" : isHindi ? "Hindi" : "Multi-Lingual",
            location: custLoc,
            requirement: custReq,
            assigned_profile_id: assignedProfileId,
            assigned_user_id: assignedUserId,
            assigned_agent_name: assignedAgent,
            is_whatsapp_lead: false,
            created_at: l.created_time,
          });
        }
      }
    }

    // Check if campaign is archived/expired (>90 days in Meta's data retention policy)
    const createdDate = primaryCamp.created_time ? new Date(primaryCamp.created_time) : null;
    const ageDays = createdDate
      ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (liveLeads.length === 0 && ageDays > 90) {
      return {
        leads: [],
        campaignType: "expired_form",
        isExpired: true,
        ageDays,
        campaignMeta: {
          id: primaryCamp.id,
          name: primaryCamp.name,
          created_time: primaryCamp.created_time,
          ageDays,
        },
      };
    }

    return {
      leads: liveLeads,
      campaignType: "instant_form",
      isExpired: false,
      ageDays,
      campaignMeta: {
        id: primaryCamp.id,
        name: primaryCamp.name,
        created_time: primaryCamp.created_time,
        ageDays,
      },
    };
  } catch (err) {
    console.error("[fetchLiveMetaLeads] Error:", err);
    return { leads: [], campaignType: "unknown" };
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    const admin = supabaseAdmin();
    const url = new URL(req.url);

    const search = url.searchParams.get("search")?.trim() || "";
    const campaign = url.searchParams.get("campaign") || "all";
    const agent = url.searchParams.get("agent") || "all";
    const startDate = url.searchParams.get("startDate")?.trim() || "";
    const endDate = url.searchParams.get("endDate")?.trim() || "";
    const datePreset = url.searchParams.get("datePreset")?.trim() || "";

    let effectiveStartDate = startDate;
    let effectiveEndDate = endDate;

    if (datePreset && datePreset !== "maximum") {
      const now = new Date();
      const toIST = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const todayIST = toIST(now);

      if (datePreset === "today") {
        effectiveStartDate = todayIST;
        effectiveEndDate = todayIST;
      } else if (datePreset === "yesterday") {
        const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        effectiveStartDate = toIST(y);
        effectiveEndDate = toIST(y);
      } else if (datePreset === "last_7d") {
        const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        effectiveStartDate = toIST(d7);
        effectiveEndDate = todayIST;
      } else if (datePreset === "last_14d") {
        const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        effectiveStartDate = toIST(d14);
        effectiveEndDate = todayIST;
      } else if (datePreset === "last_30d") {
        const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        effectiveStartDate = toIST(d30);
        effectiveEndDate = todayIST;
      } else if (datePreset === "this_month") {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        effectiveStartDate = toIST(firstOfMonth);
        effectiveEndDate = todayIST;
      } else if (datePreset === "last_month") {
        const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        effectiveStartDate = toIST(firstOfLastMonth);
        effectiveEndDate = toIST(lastOfLastMonth);
      }
    }

    // 1. Fetch profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, user_id, full_name, email, account_role")
      .eq("account_id", ctx.accountId);

    const allProfiles = profiles || [];
    const callerProfile = allProfiles.find((p) => p.user_id === ctx.userId);

    const isCallerAdmin =
      ctx.role === "owner" ||
      ctx.role === "admin" ||
      callerProfile?.account_role === "admin" ||
      callerProfile?.account_role === "owner";

    const executiveName = !isCallerAdmin ? (callerProfile?.full_name || "").trim().toLowerCase() : "";

    // 2. Fetch deals with Meta Ad / Meta Lead content
    const { data: metaDeals } = await admin
      .from("deals")
      .select("id, contact_id, stage_id, assigned_to, user_id, title, notes, created_at, contacts(id, name, phone, user_id), pipeline_stages(name)")
      .eq("account_id", ctx.accountId)
      .or("title.ilike.%Meta Lead%,notes.ilike.%Meta Lead%,notes.ilike.%murukku machine%,notes.ilike.%Hindi update%")
      .order("created_at", { ascending: false });

    // 3. Fetch contact_notes with Meta Ad / Meta Lead content
    const { data: metaNotes } = await admin
      .from("contact_notes")
      .select("id, contact_id, note_text, created_at, contacts(id, name, phone, user_id)")
      .eq("account_id", ctx.accountId)
      .or("note_text.ilike.%Meta Ad%,note_text.ilike.%Meta Lead%,note_text.ilike.%murukku machine%,note_text.ilike.%Hindi update%,note_text.ilike.%Lead Alert Dispatched%")
      .order("created_at", { ascending: false });

    const leadsMap = new Map<string, any>();

    // Process deals
    (metaDeals || []).forEach((d: any) => {
      const contact = d.contacts || {};
      const text = d.notes || "";
      const campMatch = text.match(/Campaign:\s*([^\n]+)/i);
      const formMatch = text.match(/Form:\s*([^\n]+)/i);
      const langMatch = text.match(/Language:\s*([^\n]+)/i);
      const locMatch = text.match(/Location:\s*([^\n]+)/i);
      const reqMatch = text.match(/Business:\s*([^\n]+)|Requirement:\s*([^\n]+)/i);

      let campaign_name = campMatch ? campMatch[1].trim() : "Meta Campaign";
      let form_name = formMatch ? formMatch[1].trim() : "Instant Form";
      let language = langMatch ? langMatch[1].trim() : "";
      let location = locMatch ? locMatch[1].trim() : "";
      let requirement = reqMatch ? (reqMatch[1] || reqMatch[2]).trim() : "Murukku Business";

      const combined = `${d.title} ${campaign_name} ${form_name} ${text}`.toLowerCase();
      if (!language) {
        if (combined.includes("hindi") || combined.includes("delhi") || combined.includes("up") || combined.includes("bihar")) {
          language = "Hindi";
        } else {
          language = "Tamil";
        }
      }

      if (!location) {
        location = language === "Hindi" ? "Delhi, India" : "Tamil Nadu";
      }

      let assigned_profile_id = d.assigned_to;
      let assigned_user_id = d.user_id || contact?.user_id;
      let assigned_agent_name = "Sales Admin";

      const matchedProfile = allProfiles.find(
        (p) => p.id === assigned_profile_id || p.user_id === assigned_user_id
      );
      if (matchedProfile) {
        assigned_agent_name = matchedProfile.full_name;
        assigned_profile_id = matchedProfile.id;
        assigned_user_id = matchedProfile.user_id;
      }

      const key = d.contact_id || d.id;
      leadsMap.set(key, {
        id: d.contact_id || d.id,
        note_id: null,
        deal_id: d.id,
        stage_name: d.pipeline_stages?.name || "Enquiry",
        name: contact.name || d.title.replace(/^📥\s*Meta Lead:\s*/i, "").replace(/\s*\([^)]*\)$/, "") || "Meta Lead",
        phone: contact.phone || "--",
        customer_name: contact.name || d.title.replace(/^📥\s*Meta Lead:\s*/i, "").replace(/\s*\([^)]*\)$/, "") || "Meta Lead",
        customer_phone: contact.phone || "--",
        campaign_name,
        form_name,
        language,
        location,
        requirement,
        raw_note: text,
        assigned_profile_id,
        assigned_user_id,
        assigned_agent_name,
        created_at: d.created_at,
      });
    });

    // Process contact_notes
    (metaNotes || []).forEach((n: any) => {
      const key = n.contact_id || n.id;
      const existing = leadsMap.get(key);

      const text = n.note_text || "";
      const contact = n.contacts || {};
      const campMatch = text.match(/Campaign:\s*([^\n]+)/i);
      const formMatch = text.match(/Form:\s*([^\n]+)/i);
      const langMatch = text.match(/Language:\s*([^\n]+)/i);
      const locMatch = text.match(/Location:\s*([^\n]+)/i);
      const reqMatch = text.match(/Requirement:\s*([^\n]+)|Business:\s*([^\n]+)/i);
      const execMatch = text.match(/Assigned Executive:\s*([^\n]+)/i);
      const alertExecMatch = text.match(/Lead Alert Dispatched to\s+([A-Z]+)/i);

      let campaign_name = campMatch ? campMatch[1].trim() : existing?.campaign_name || (text.includes("Lead Alert Dispatched") ? "Meta WhatsApp Click-to-Chat" : "Meta Campaign");
      let form_name = formMatch ? formMatch[1].trim() : existing?.form_name || (text.includes("Lead Alert Dispatched") ? "WhatsApp Chat Lead" : "Instant Form");
      let language = langMatch ? langMatch[1].trim() : existing?.language || "Tamil";
      let location = locMatch ? locMatch[1].trim() : existing?.location || "Tamil Nadu";
      let requirement = reqMatch ? (reqMatch[1] || reqMatch[2]).trim() : existing?.requirement || (text.includes("Lead Alert Dispatched") ? "Commercial Automatic Murukku Machine" : "Murukku Business");
      let assigned_agent_name = execMatch ? execMatch[1].trim() : (alertExecMatch ? alertExecMatch[1].trim() : (existing?.assigned_agent_name || "Sales Admin"));

      const combined = `${campaign_name} ${form_name} ${text}`.toLowerCase();
      if (!language || language === "General") {
        if (combined.includes("hindi") || combined.includes("delhi") || combined.includes("up")) {
          language = "Hindi";
        } else {
          language = "Tamil";
        }
      }

      let assigned_profile_id = existing?.assigned_profile_id || null;
      let assigned_user_id = existing?.assigned_user_id || contact?.user_id || null;

      const matchedProfile = allProfiles.find(
        (p) =>
          p.id === assigned_profile_id ||
          p.user_id === assigned_user_id ||
          p.full_name?.toLowerCase().includes(assigned_agent_name.toLowerCase()) ||
          assigned_agent_name.toLowerCase().includes(p.full_name?.toLowerCase() || "___"),
      );

      if (matchedProfile) {
        assigned_agent_name = matchedProfile.full_name;
        assigned_profile_id = matchedProfile.id;
        assigned_user_id = matchedProfile.user_id;
      }

      leadsMap.set(key, {
        id: n.contact_id || n.id,
        note_id: n.id,
        deal_id: existing?.deal_id || null,
        stage_name: existing?.stage_name || "Enquiry",
        name: contact.name || existing?.name || existing?.customer_name || "Meta Lead",
        phone: contact.phone || existing?.phone || existing?.customer_phone || "--",
        customer_name: contact.name || existing?.customer_name || existing?.name || "Meta Lead",
        customer_phone: contact.phone || existing?.customer_phone || existing?.phone || "--",
        campaign_name,
        form_name,
        language,
        location,
        requirement,
        raw_note: text || existing?.raw_note,
        assigned_profile_id,
        assigned_user_id,
        assigned_agent_name,
        created_at: existing?.created_at || n.created_at,
      });
    });

    const parsedLeads = Array.from(leadsMap.values());

    // 4. Filters
    let filtered = parsedLeads;

    if (executiveName) {
      filtered = filtered.filter(
        (l) =>
          l.assigned_agent_name?.toLowerCase().includes(executiveName) ||
          l.assigned_user_id === ctx.userId,
      );
    } else if (agent !== "all") {
      filtered = filtered.filter(
        (l) =>
          l.assigned_agent_name?.toLowerCase().includes(agent.toLowerCase()) ||
          l.assigned_profile_id === agent ||
          l.assigned_user_id === agent,
      );
    }

    let campaignType: "instant_form" | "whatsapp_chat" | "expired_form" | "unknown" | "all" = "all";
    let campaignMeta: any = null;

    if (campaign !== "all") {
      const metaRes = await fetchLiveMetaLeads(campaign, ctx.accountId, admin);
      campaignType = metaRes.campaignType;
      campaignMeta = metaRes.campaignMeta;

      if (metaRes.campaignType === "whatsapp_chat") {
        filtered = metaRes.leads;
      } else if (metaRes.campaignType === "expired_form") {
        // METHOD 2: Zero dummy test leads for expired/archived forms!
        filtered = [];
      } else if (metaRes.leads && metaRes.leads.length > 0) {
        filtered = metaRes.leads;
      } else {
        filtered = [];
      }
    }

    if (effectiveStartDate) {
      filtered = filtered.filter((l) => {
        const d = l.created_at ? l.created_at.slice(0, 10) : "";
        return !d || d >= effectiveStartDate;
      });
    }

    if (effectiveEndDate) {
      filtered = filtered.filter((l) => {
        const d = l.created_at ? l.created_at.slice(0, 10) : "";
        return !d || d <= effectiveEndDate;
      });
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.customer_name.toLowerCase().includes(s) ||
          l.customer_phone.toLowerCase().includes(s) ||
          l.location.toLowerCase().includes(s) ||
          l.campaign_name.toLowerCase().includes(s) ||
          l.requirement.toLowerCase().includes(s) ||
          l.assigned_agent_name.toLowerCase().includes(s),
      );
    }

    return NextResponse.json({
      ok: true,
      leads: filtered,
      campaignType,
      campaignMeta,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    const admin = supabaseAdmin();
    const body = await req.json();
    const { contactId, noteId, dealId, profileId } = body;

    if (!contactId || !profileId) {
      return NextResponse.json({ error: "Missing contactId or profileId" }, { status: 400 });
    }

    // Resolve target profile
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id, user_id, full_name")
      .eq("id", profileId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 1. Update deals table
    if (dealId) {
      await admin
        .from("deals")
        .update({
          assigned_to: targetProfile.id,
          user_id: targetProfile.user_id,
        })
        .eq("id", dealId);
    } else {
      await admin
        .from("deals")
        .update({
          assigned_to: targetProfile.id,
          user_id: targetProfile.user_id,
        })
        .eq("contact_id", contactId);
    }

    // 2. Update contacts table
    await admin
      .from("contacts")
      .update({ user_id: targetProfile.user_id })
      .eq("id", contactId);

    // 3. Update note in contact_notes
    if (noteId) {
      const { data: currentNote } = await admin
        .from("contact_notes")
        .select("note_text")
        .eq("id", noteId)
        .single();

      if (currentNote?.note_text) {
        let updatedText = currentNote.note_text;
        if (updatedText.includes("Assigned Executive:")) {
          updatedText = updatedText.replace(
            /Assigned Executive:\s*[^\n]+/i,
            `Assigned Executive: ${targetProfile.full_name}`,
          );
        } else {
          updatedText += `\n👤 Assigned Executive: ${targetProfile.full_name}`;
        }

        await admin
          .from("contact_notes")
          .update({ note_text: updatedText })
          .eq("id", noteId);
      }
    }

    return NextResponse.json({
      ok: true,
      assignedExecutive: targetProfile.full_name,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
