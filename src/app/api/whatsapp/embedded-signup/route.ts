import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/whatsapp/encryption';
import { verifyPhoneNumber, subscribeWabaToApp, registerPhoneNumber } from '@/lib/whatsapp/meta-api';

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.account_id) {
      return NextResponse.json({ error: 'No account linked to profile' }, { status: 400 });
    }

    const body = await req.json();
    const { code, accessToken: directAccessToken, phoneNumberId: directPhoneId, wabaId: directWabaId } = body;

    let accessToken = directAccessToken;
    let phoneNumberId = directPhoneId;
    let wabaId = directWabaId;

    // If code is returned, exchange it for a System User / User Access Token via Graph API
    if (code) {
      const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;

      if (appId && appSecret) {
        const tokenRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`
        );
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
        } else {
          console.warn('[embedded-signup] Code exchange failed:', tokenData);
        }
      }
    }

    if (!accessToken && !phoneNumberId) {
      return NextResponse.json(
        { error: 'Could not obtain valid access token or phone number from Meta login' },
        { status: 400 }
      );
    }

    // If we have an accessToken and need to discover or verify the WABA/Phone
    if (accessToken && (!phoneNumberId || !wabaId)) {
      try {
        const meRes = await fetch(
          `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`
        );
        const meData = await meRes.json();
        
        // Fetch phone numbers for the debugged token / businesses
        const debugRes = await fetch(
          `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
        );
        const debugData = await debugRes.json();
        const granularScopes = debugData?.data?.granular_scopes || [];
        const wabaScope = granularScopes.find((s: { scope: string; target_ids?: string[] }) => s.scope === 'whatsapp_business_management');
        if (wabaScope?.target_ids?.[0]) {
          wabaId = wabaId || wabaScope.target_ids[0];
        }

        if (wabaId && !phoneNumberId) {
          const phonesRes = await fetch(
            `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`
          );
          const phonesData = await phonesRes.json();
          if (phonesData?.data?.[0]?.id) {
            phoneNumberId = phonesData.data[0].id;
          }
        }
      } catch (discErr) {
        console.warn('[embedded-signup] Discovery warning:', discErr);
      }
    }

    // If we have both, encrypt and save
    if (phoneNumberId && accessToken) {
      const encryptedToken = encrypt(accessToken);

      // Verify phone number with Meta
      try {
        await verifyPhoneNumber({
          phoneNumberId,
          accessToken,
        });
      } catch (verifyErr) {
        console.warn('[embedded-signup] Verify phone error:', verifyErr);
      }

      // Auto-subscribe WABA to CRM app webhooks
      let subscribedAt: string | null = null;
      if (wabaId) {
        try {
          await subscribeWabaToApp({
            wabaId,
            accessToken,
          });
          subscribedAt = new Date().toISOString();
        } catch (subErr) {
          console.warn('[embedded-signup] WABA subscription warning:', subErr);
        }
      }

      const admin = supabaseAdmin();
      const { error: upsertError } = await admin.from('whatsapp_config').upsert(
        {
          account_id: profile.account_id,
          user_id: user.id,
          phone_number_id: phoneNumberId,
          waba_id: wabaId || null,
          access_token: encryptedToken,
          status: 'connected',
          registered_at: new Date().toISOString(),
          subscribed_apps_at: subscribedAt,
          last_registration_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id' }
      );

      if (upsertError) {
        console.error('[embedded-signup] DB upsert error:', upsertError);
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        phoneNumberId,
        wabaId,
        message: 'WhatsApp Business API connected successfully via Meta 1-Click Fast Connect!',
      });
    }

    return NextResponse.json({
      success: true,
      phoneNumberId,
      wabaId,
      message: 'Details captured. Please confirm credentials.',
    });
  } catch (err: unknown) {
    console.error('[embedded-signup] Internal error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
