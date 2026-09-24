import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export async function POST(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { identifier, passKey } = await req.json();

    const cleanInput = String(identifier || "").trim().toLowerCase();
    const cleanPhone = cleanInput.replace(/\D/g, "");

    // 1. Search profiles
    let query = admin.from("profiles").select("id, full_name, email, account_id, account_role");
    
    if (cleanPhone.length >= 10) {
      query = query.ilike("email", `%${cleanPhone.slice(-10)}%`);
    } else {
      query = query.or(`email.ilike.%${cleanInput}%,full_name.ilike.%${cleanInput}%`);
    }

    const { data: profiles } = await query.limit(1);
    const profile = profiles?.[0];

    if (!profile) {
      // Fallback matching by name
      const { data: allProfiles } = await admin
        .from("profiles")
        .select("id, full_name, email, account_id, account_role")
        .limit(20);

      const matched = (allProfiles || []).find((p) => {
        const fn = (p.full_name || "").toLowerCase();
        return fn.includes(cleanInput) || cleanInput.includes(fn);
      });

      if (matched) {
        return NextResponse.json({
          ok: true,
          user: {
            id: matched.id,
            name: matched.full_name || "Sales Executive",
            email: matched.email,
            role: matched.account_role || "agent",
            accountId: matched.account_id,
          },
        });
      }

      return NextResponse.json({
        ok: false,
        error: "Executive profile not found. Check name or phone number.",
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: profile.id,
        name: profile.full_name || "Sales Executive",
        email: profile.email,
        role: profile.account_role || "agent",
        accountId: profile.account_id,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
