import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { DEFAULT_MACHINES, type MachineItem } from '@/lib/machines/machine-master';

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const admin = supabaseAdmin();

    const { data: account } = await admin
      .from('accounts')
      .select('settings')
      .eq('id', ctx.accountId)
      .maybeSingle();

    const machines: MachineItem[] =
      account?.settings?.machineCatalog && Array.isArray(account.settings.machineCatalog) && account.settings.machineCatalog.length > 0
        ? account.settings.machineCatalog
        : DEFAULT_MACHINES;

    return NextResponse.json({ ok: true, machines });
  } catch (err: unknown) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    const admin = supabaseAdmin();
    const body = await req.json();

    if (!body || !Array.isArray(body.machines)) {
      return NextResponse.json(
        { error: 'Invalid payload: machines array required' },
        { status: 400 }
      );
    }

    const { data: account } = await admin
      .from('accounts')
      .select('settings')
      .eq('id', ctx.accountId)
      .maybeSingle();

    const currentSettings = account?.settings || {};
    const updatedSettings = {
      ...currentSettings,
      machineCatalog: body.machines,
    };

    const { error } = await admin
      .from('accounts')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ctx.accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, machines: body.machines });
  } catch (err: unknown) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
