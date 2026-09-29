import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json({ error: 'Access Token is required' }, { status: 400 });
    }

    const token = accessToken.trim();

    // 1. Inspect Token Scopes & Target IDs
    let wabaIds: string[] = [];
    try {
      const debugRes = await fetch(
        `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`
      );
      const debugData = await debugRes.json();
      const granularScopes = debugData?.data?.granular_scopes || [];
      const wabaScope = granularScopes.find(
        (s: { scope: string; target_ids?: string[] }) => s.scope === 'whatsapp_business_management'
      );
      if (wabaScope?.target_ids) {
        wabaIds = wabaScope.target_ids;
      }
    } catch (err) {
      console.warn('[auto-discover] debug_token warning:', err);
    }

    // 2. Fetch User Businesses if WABA IDs not found directly
    if (wabaIds.length === 0) {
      try {
        const bizRes = await fetch(
          `https://graph.facebook.com/v21.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name}&access_token=${token}`
        );
        const bizData = await bizRes.json();
        if (bizData?.data) {
          for (const biz of bizData.data) {
            if (biz.owned_whatsapp_business_accounts?.data) {
              for (const waba of biz.owned_whatsapp_business_accounts.data) {
                if (!wabaIds.includes(waba.id)) {
                  wabaIds.push(waba.id);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[auto-discover] businesses warning:', err);
      }
    }

    // 3. For each WABA ID, fetch Phone Numbers
    const discoveredNumbers: Array<{
      phoneNumberId: string;
      wabaId: string;
      displayPhoneNumber: string;
      verifiedName: string;
      qualityRating?: string;
    }> = [];

    for (const wabaId of wabaIds) {
      try {
        const phonesRes = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status&access_token=${token}`
        );
        const phonesData = await phonesRes.json();
        if (phonesData?.data) {
          for (const phone of phonesData.data) {
            discoveredNumbers.push({
              phoneNumberId: phone.id,
              wabaId: wabaId,
              displayPhoneNumber: phone.display_phone_number || phone.id,
              verifiedName: phone.verified_name || 'WhatsApp Business',
              qualityRating: phone.quality_rating,
            });
          }
        }
      } catch (err) {
        console.warn(`[auto-discover] phone_numbers for waba ${wabaId} warning:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      wabaIds,
      phones: discoveredNumbers,
    });
  } catch (err: unknown) {
    console.error('[auto-discover] error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to discover WhatsApp numbers';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
