// ============================================================
// /api/account/members/[userId]
//
//   PATCH  — change a member's role.   Admin+.
//   DELETE — remove a member.          Admin+.
//
// Both delegate to SECURITY DEFINER RPCs from migration 018:
//   - set_member_role(p_user_id, p_new_role)
//   - remove_account_member(p_user_id)
//
// The RPCs do the *real* authorisation work — caller must be
// admin+, target must be in caller's account, target can't be the
// owner, can't be self. The TS layer here only forwards the call
// and maps Postgres SQLSTATEs back to HTTP statuses.
// ============================================================

import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { isAccountRole } from "@/lib/auth/roles";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// Map known SQLSTATEs from the RPCs (see migration 018) onto HTTP
// statuses. The `error.code` field is the SQLSTATE; the `message`
// is the human-readable RAISE message we put in the migration.
function rpcErrorToResponse(err: PostgrestError): NextResponse {
  if (err.code === "42501") {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err.code === "22023") {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error("[members route] unexpected RPC error:", err);
  return NextResponse.json(
    { error: "Failed to update member" },
    { status: 500 },
  );
}

import { supabaseAdmin } from "@/lib/flows/admin-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");
    const { userId } = await params;

    const { data: profile, error } = await ctx.supabase
      .from("profiles")
      .select("user_id, full_name, email, avatar_url, account_role, created_at")
      .eq("user_id", userId)
      .eq("account_id", ctx.accountId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    let phone: string | null = null;
    try {
      const admin = supabaseAdmin();
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      phone = (authUser?.user?.user_metadata?.phone as string) || null;
    } catch {
      // Ignore admin auth fetch error for phone
    }

    return NextResponse.json({
      member: {
        ...profile,
        phone,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:memberRole:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { userId } = await params;

    const body = (await request.json().catch(() => null)) as
      | {
          role?: unknown;
          fullName?: string;
          email?: string;
          password?: string;
          phone?: string;
        }
      | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { role, fullName, email, password, phone } = body;

    // Verify member belongs to this account
    const { data: currentProfile, error: profileFetchErr } = await ctx.supabase
      .from("profiles")
      .select("user_id, account_role, email, full_name")
      .eq("user_id", userId)
      .eq("account_id", ctx.accountId)
      .single();

    if (profileFetchErr || !currentProfile) {
      return NextResponse.json(
        { error: "Member not found in your account" },
        { status: 404 },
      );
    }

    const admin = supabaseAdmin();
    const updatesToAuth: {
      password?: string;
      email?: string;
      email_confirm?: boolean;
      user_metadata?: Record<string, unknown>;
    } = {};

    const updatesToProfile: {
      full_name?: string;
      email?: string;
    } = {};

    // 1. Password change
    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 },
        );
      }
      updatesToAuth.password = password.trim();
    }

    // 2. Full Name change
    if (typeof fullName === "string" && fullName.trim().length > 0) {
      updatesToProfile.full_name = fullName.trim();
      updatesToAuth.user_metadata = {
        ...(updatesToAuth.user_metadata || {}),
        full_name: fullName.trim(),
      };
    }

    // 3. Phone change
    if (typeof phone === "string") {
      updatesToAuth.user_metadata = {
        ...(updatesToAuth.user_metadata || {}),
        phone: phone.trim() || null,
      };
    }

    // 4. Email / Login ID change
    let cleanEmail: string | undefined;
    if (typeof email === "string" && email.trim().length > 0) {
      const raw = email.trim().toLowerCase();
      cleanEmail = raw.includes("@")
        ? raw
        : `${raw.replace(/[^a-z0-9._-]/g, "")}@srilakshmiindustries.co.in`;
      
      if (cleanEmail !== currentProfile.email) {
        updatesToAuth.email = cleanEmail;
        updatesToAuth.email_confirm = true;
        updatesToProfile.email = cleanEmail;
      }
    }

    // Apply Supabase Auth updates if any
    if (Object.keys(updatesToAuth).length > 0) {
      const { error: authErr } = await admin.auth.admin.updateUserById(
        userId,
        updatesToAuth,
      );
      if (authErr) {
        console.error("[members PATCH] Auth update error:", authErr);
        return NextResponse.json(
          { error: `Failed to update credentials: ${authErr.message}` },
          { status: 400 },
        );
      }
    }

    // Apply Profile table updates if any
    if (Object.keys(updatesToProfile).length > 0) {
      const { error: profileUpdateErr } = await admin
        .from("profiles")
        .update(updatesToProfile)
        .eq("user_id", userId)
        .eq("account_id", ctx.accountId);

      if (profileUpdateErr) {
        console.error("[members PATCH] Profile update error:", profileUpdateErr);
      }
    }

    // 5. Role change (if provided and different)
    if (role !== undefined && role !== currentProfile.account_role) {
      if (!isAccountRole(role)) {
        return NextResponse.json(
          { error: "'role' must be one of owner, admin, agent, viewer" },
          { status: 400 },
        );
      }

      if (role === "owner") {
        return NextResponse.json(
          {
            error:
              "Use POST /api/account/transfer-ownership to promote a member to owner",
          },
          { status: 400 },
        );
      }

      const { error: roleErr } = await ctx.supabase.rpc("set_member_role", {
        p_user_id: userId,
        p_new_role: role,
      });

      if (roleErr) return rpcErrorToResponse(roleErr);
    }

    return NextResponse.json({
      ok: true,
      member: {
        user_id: userId,
        full_name: updatesToProfile.full_name ?? currentProfile.full_name,
        email: cleanEmail ?? currentProfile.email,
        role: (role as string) ?? currentProfile.account_role,
        phone: phone?.trim() || null,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:memberRemove:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { userId } = await params;

    if (userId === ctx.userId) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the account" },
        { status: 400 },
      );
    }

    // Verify target belongs to caller's account
    const { data: targetProfile, error: profileErr } = await ctx.supabase
      .from("profiles")
      .select("id, user_id, account_role, full_name, email")
      .eq("user_id", userId)
      .eq("account_id", ctx.accountId)
      .single();

    if (profileErr || !targetProfile) {
      return NextResponse.json(
        { error: "Member not found in your account" },
        { status: 404 },
      );
    }

    if (targetProfile.account_role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the account owner" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();

    // 1. Unassign references so foreign keys don't block
    await Promise.allSettled([
      admin.from("deals").update({ assigned_to: null }).eq("assigned_to", targetProfile.id),
      admin.from("deals").update({ user_id: ctx.userId }).eq("user_id", userId),
      admin.from("conversations").update({ assigned_to: null }).eq("account_id", ctx.accountId).eq("assigned_to", userId),
      admin.from("call_logs").update({ assigned_to: null }).eq("assigned_to", userId),
    ]);

    // 2. Delete the profile record for this account
    const { error: delProfileErr } = await admin
      .from("profiles")
      .delete()
      .eq("user_id", userId)
      .eq("account_id", ctx.accountId);

    if (delProfileErr) {
      console.warn("[members DELETE] Profile delete failed, falling back to RPC:", delProfileErr);
      const { error: rpcErr } = await ctx.supabase.rpc("remove_account_member", {
        p_user_id: userId,
      });
      if (rpcErr) {
        console.error("[members DELETE] RPC fallback failed:", rpcErr);
        return NextResponse.json(
          { error: rpcErr.message || "Failed to remove member from account" },
          { status: 500 },
        );
      }
    }

    // 3. Delete the Auth User completely so credentials cannot be reused
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch (authDelErr) {
      console.warn("[members DELETE] Auth user delete error (non-fatal):", authDelErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
