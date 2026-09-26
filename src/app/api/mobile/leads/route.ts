import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const search = url.searchParams.get("search") || "";

    let query = admin
      .from("contacts")
      .select("id, name, phone, stage, source, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: contacts, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: contacts || [],
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
