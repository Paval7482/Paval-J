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
    const [profile, conversationsRes, notesRes, dealsRes] = await Promise.all([
      getCustomerProfile(admin, contactId),
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

    // 4. Fetch all messages
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

    // 5. Parse calls from contact_notes
    const callsFromNotes: any[] = [];
    (notesRes.data || []).forEach((n: any) => {
      const text = n.note_text || '';
      const isCall =
        text.includes('📞') ||
        text.includes('📲') ||
        text.toLowerCase().includes('call status') ||
        text.toLowerCase().includes('audio recording') ||
        text.toLowerCase().includes('duration:');

      if (isCall) {
        const isIncoming = text.toLowerCase().includes('incoming') || text.toLowerCase().includes('inbound');
        const isMissed = text.toLowerCase().includes('missed') || text.toLowerCase().includes('unanswered');
        const execMatch = text.match(/(?:👤\s*Executive|Executive):\s*([^|\n]+)/i);
        const durMatch = text.match(/(?:⏱️\s*Duration|Duration):\s*([^|\n]+)/i);
        const audioMatch = text.match(/(?:🎙️\s*Audio Recording|Audio Recording|Audio|Recording):\s*([^|\n]+)/i);
        const timeMatch = text.match(/(?:📅\s*Time|Time):\s*([^|\n]+)/i);

        let audioUrl: string | null = null;
        if (audioMatch) {
          const raw = audioMatch[1].trim();
          if (raw.startsWith('http')) audioUrl = raw;
        }

        callsFromNotes.push({
          id: n.id,
          customer_number: contact.phone || '',
          agent_name: execMatch ? execMatch[1].trim() : 'Executive',
          call_type: isIncoming ? 'inbound' : 'outbound',
          call_status: isMissed ? 'missed' : 'connected',
          call_duration: durMatch ? durMatch[1].trim() : '01:00',
          recording_url: audioUrl,
          call_date: timeMatch ? timeMatch[1].trim() : n.created_at,
          created_at: n.created_at,
        });
      }
    });

    // 6. Determine Source
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
    } else if (callsFromNotes.length > 0) {
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
      calls: callsFromNotes,
      messages,
      notes: notesRes.data || [],
      conversationId: conversationsRes.data?.[0]?.id || null,
    });
  } catch (err: unknown) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
