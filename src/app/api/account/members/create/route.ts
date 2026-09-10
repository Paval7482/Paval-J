import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { canManageMembers, isAccountRole } from "@/lib/auth/roles";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();

    if (!canManageMembers(ctx.role)) {
      return NextResponse.json(
        { error: "Only admins and owners can create team members" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { fullName, email, password, role, phone } = body as {
      fullName?: string;
      email?: string;
      password?: string;
      role?: string;
      phone?: string;
    };

    if (!fullName || fullName.trim().length === 0) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    if (!email || email.trim().length === 0) {
      return NextResponse.json({ error: "Username or Email is required" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const assignedRole = role && isAccountRole(role) ? role : "agent";
    if (assignedRole === "owner") {
      return NextResponse.json(
        { error: "Cannot assign owner role directly" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();
    const rawInput = email.trim().toLowerCase();
    const cleanEmail = rawInput.includes("@")
      ? rawInput
      : `${rawInput.replace(/[^a-z0-9._-]/g, "")}@srilakshmiindustries.co.in`;

    // Create the Auth User in Supabase Auth
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
      },
    });

    if (authErr) {
      console.error("[Create Member] Auth user creation failed:", authErr);
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const newUser = authData.user;
    if (!newUser) {
      return NextResponse.json(
        { error: "Failed to initialize new user account" },
        { status: 500 },
      );
    }

    // Upsert the Profile record linked to this Account
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        user_id: newUser.id,
        account_id: ctx.accountId,
        full_name: fullName.trim(),
        email: cleanEmail,
        account_role: assignedRole,
        role: "user",
      },
      { onConflict: "user_id" },
    );

    if (profileErr) {
      console.error("[Create Member] Profile upsert failed:", profileErr);
      return NextResponse.json(
        { error: "User created in Auth but failed to link to organization profile" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      member: {
        user_id: newUser.id,
        full_name: fullName.trim(),
        email: cleanEmail,
        role: assignedRole,
        phone: phone?.trim() || null,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
