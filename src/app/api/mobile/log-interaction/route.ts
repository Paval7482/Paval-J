import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";
import { findExistingContact } from "@/lib/contacts/dedupe";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await req.json();

    const {
      phone,
      contactName,
      outcome,
      notes,
      nextFollowUpDate,
      agentName,
      isNewLead = false,
    } = body;

    const cleanPhone = String(phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 6) {
      return NextResponse.json({ ok: false, error: "Valid phone number required" }, { status: 400 });
    }

    const last10 = cleanPhone.slice(-10);

    // 1. Fetch default account_id
    const { data: defaultProfile } = await admin
      .from("profiles")
      .select("account_id")
      .not("account_id", "is", null)
      .limit(1)
      .maybeSingle();

    const accountId = defaultProfile?.account_id || null;
    if (!accountId) {
      return NextResponse.json({ ok: false, error: "Account not configured" }, { status: 400 });
    }

    // 2. Find or Create Contact
    const existing = await findExistingContact(admin, accountId, cleanPhone);
    let contactId: string | null = existing?.id || null;

    if (!existing) {
      const { data: createdContact, error: createErr } = await admin
        .from("contacts")
        .insert({
          account_id: accountId,
          phone: cleanPhone,
          name: contactName || `Lead ${last10}`,
          source: "mobile_call_postpopup",
          stage: outcome === "won" ? "won" : outcome === "lost" ? "lost" : "lead",
        })
        .select("id, name, stage, phone")
        .maybeSingle();

      if (createErr) {
        console.error("[Log Interaction] Contact create error:", createErr);
      }
      if (createdContact) {
        contactId = createdContact.id;
      }
    } else {
      // Update existing contact stage if outcome is provided
      if (outcome) {
        let newStage = existing.stage;
        if (outcome === "won") newStage = "won";
        else if (outcome === "lost") newStage = "lost";
        else if (outcome === "quotation_sent") newStage = "proposal";
        else if (outcome === "interested") newStage = "qualified";

        await admin
          .from("contacts")
          .update({
            stage: newStage,
            ...(contactName ? { name: contactName } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    }

    // 3. Save detailed note in contact_notes
    if (contactId && (notes || outcome || nextFollowUpDate)) {
      const noteLines = [
        `📋 Post-Call Summary (${agentName || "Sales Executive"})`,
        outcome ? `🎯 Outcome: ${outcome.toUpperCase()}` : "",
        notes ? `📝 Notes: ${notes}` : "",
        nextFollowUpDate
          ? `📅 Next Follow-up: ${new Date(nextFollowUpDate).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      await admin.from("contact_notes").insert({
        account_id: accountId,
        contact_id: contactId,
        note_text: noteLines,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Call note and follow-up saved successfully",
      contactId,
    });
  } catch (error: any) {
    console.error("[Log Interaction] Exception:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
