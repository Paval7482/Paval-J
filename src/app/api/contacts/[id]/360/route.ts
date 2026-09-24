import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { getCustomerProfile } from '@/lib/contacts/customer-profile';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getCurrentAccount();
    const admin = supabaseAdmin();
    const { id: contactId } = await params;

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID required' }, { status: 400 });
    }

    // 1. Fetch contact row
    const { data: contact } = await admin
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const customerPhone = contact.phone ? contact.phone.replace(/^\+/g, '') : '';
    const phoneClean = customerPhone.slice(-10);

    // 2. Fetch all related contact IDs matching this 10-digit phone number
    let relatedContactIds = [contactId];
    if (phoneClean && phoneClean.length >= 10) {
      const { data: allRelated } = await admin
        .from('contacts')
        .select('id')
        .ilike('phone', `%${phoneClean}%`);
      if (allRelated && allRelated.length > 0) {
        relatedContactIds = Array.from(new Set([...relatedContactIds, ...allRelated.map((c) => c.id)]));
      }
    }

    // 3. Parallel queries
    const [profile, callsRes, conversationsRes, notesRes, dealsRes] = await Promise.all([
      getCustomerProfile(admin, contactId),
      admin
        .from('call_logs')
        .select('*')
        .or(`customer_number.ilike.%${customerPhone}%,customer_number.ilike.%${phoneClean}%`)
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('conversations')
        .select('id, status, updated_at')
        .in('contact_id', relatedContactIds)
        .order('updated_at', { ascending: false }),
      admin
        .from('contact_notes')
        .select('*')
        .in('contact_id', relatedContactIds)
        .order('created_at', { ascending: false }),
      admin
        .from('deals')
        .select('title, notes, created_at')
        .in('contact_id', relatedContactIds)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    // 4. Fetch all messages from all conversations associated with this customer
    let messages: any[] = [];
    const conversationIds = (conversationsRes.data || []).map((c) => c.id);
    if (conversationIds.length > 0) {
      const { data: msgsData } = await admin
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true })
        .limit(200);
      messages = msgsData || [];
    }

    // 4. Determine Source
    let source = profile?.source || 'Direct Inquiry';
    let sourceCampaign = profile?.sourceCampaign || '';
    let sourceForm = profile?.sourceForm || '';

    const deal = dealsRes.data && dealsRes.data.length > 0 ? dealsRes.data[0] : null;
    if (deal) {
      const text = (deal.title || '') + ' ' + (deal.notes || '');
      if (/Meta Lead|Meta Ad|Facebook|Instagram/i.test(text)) {
        source = 'Meta Lead Ads';
        const mCamp = text.match(/Campaign:\s*([^\n]+)/i);
        if (mCamp) sourceCampaign = mCamp[1].trim();
        const mForm = text.match(/Form:\s*([^\n]+)/i);
        if (mForm) sourceForm = mForm[1].trim();
      } else if (/MyTelly|Inbound Call/i.test(text)) {
        source = 'Inbound Phone Call';
      }
    } else if (callsRes.data && callsRes.data.length > 0) {
      source = 'Inbound Phone Call (MyTelly)';
    } else if (messages.length > 0) {
      source = 'WhatsApp Inquiry';
    }

    return NextResponse.json({
      ok: true,
      contact,
      profile: {
        ...profile,
        source,
        sourceCampaign,
        sourceForm,
        inboundDate: contact.created_at,
      },
      calls: callsRes.data || [],
      messages,
      notes: notesRes.data || [],
      conversationId: conversationsRes.data?.[0]?.id || null,
    });
  } catch (err: unknown) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
