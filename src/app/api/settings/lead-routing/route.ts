import { NextResponse } from "next/server";
import {
  getLeadRoutingConfig,
  saveLeadRoutingConfig,
} from "@/lib/whatsapp/lead-alert";
import { supabaseAdmin } from "@/lib/automations/admin-client";

export async function GET() {
  try {
    const config = await getLeadRoutingConfig();
    const admin = supabaseAdmin();

    let profiles: any[] = [];
    if (admin) {
      const { data } = await admin
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      profiles = data || [];
    }

    return NextResponse.json({
      ok: true,
      config,
      teamMembers: profiles,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const updated = await saveLeadRoutingConfig(body);
    return NextResponse.json({ ok: true, config: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

