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

    // 2. Parallel queries
    const [profile, callsRes, conversationRes, notesRes, dealsRes] = await Promise.all([
      getCustomerProfile(admin, contactId),
      admin
        .from('call_logs')
        .select('*')
        .or(`customer_number.ilike.%${customerPhone}%,customer_number.ilike.%${phoneClean}%`)
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('conversations')
        .select('id, status')
        .eq('contact_id', contactId)
        .maybeSingle(),
      admin
        .from('contact_notes')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false }),
      admin
        .from('deals')
        .select('title, notes, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    // 3. Fetch messages
    let messages: any[] = [];
    if (conversationRes.data?.id) {
      const { data: msgsData } = await admin
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationRes.data.id)
        .order('created_at', { ascending: true })
        .limit(100);
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
      conversationId: conversationRes.data?.id || null,
    });
  } catch (err: unknown) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
