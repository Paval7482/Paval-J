import type { SupabaseClient } from '@supabase/supabase-js';

export interface CustomerProfileData {
  name: string;
  phone: string;
  altPhone?: string;
  state?: string;
  district?: string;
  businessType?: string;
  capacity?: string;
  leadStatus?: string;
  email?: string;
  company?: string;
  notes?: string;
}

export const BUSINESS_TYPES = [
  'Murukku Business',
  'Bakery & Sweets',
  'New Startup',
  'Snacks Manufacturer',
  'Namkeen / Mixture',
  'Chips & Savories',
  'Catering & Hotel',
  'Export Business',
  'Other',
];

export const PRODUCTION_CAPACITIES = [
  '10 - 50 Kg/Day',
  '50 - 100 Kg/Day',
  '100 - 200 Kg/Day',
  '200 - 500 Kg/Day',
  '500+ Kg/Day (Industrial)',
  'Startup / Exploring',
  'Custom Capacity',
];

export const LEAD_STATUSES = [
  'Enquiry (New Enquiry)',
  'Lead (In Follow-up / Demo)',
  'Booking (Booking / Advance Paid)',
  'Retail (Retail / Delivery Completed)',
  'Lost / Not Interested',
];

export const INDIAN_STATES = [
  'Tamil Nadu',
  'Kerala',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
  'Maharashtra',
  'Gujarat',
  'Rajasthan',
  'Delhi',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'West Bengal',
  'Punjab',
  'Haryana',
  'Bihar',
  'Odisha',
  'Assam',
  'International / Other',
];

const FIELD_NAME_MAP: Record<string, keyof CustomerProfileData> = {
  'Alternative Phone': 'altPhone',
  'State': 'state',
  'District': 'district',
  'Business Type': 'businessType',
  'Production Capacity': 'capacity',
  'Lead Status': 'leadStatus',
};

const REVERSE_FIELD_MAP: Record<keyof CustomerProfileData, string> = {
  name: '',
  phone: '',
  altPhone: 'Alternative Phone',
  state: 'State',
  district: 'District',
  businessType: 'Business Type',
  capacity: 'Production Capacity',
  leadStatus: 'Lead Status',
  email: '',
  company: '',
  notes: '',
};

/**
 * Fetch customer profile fields for a given contact ID
 */
export async function getCustomerProfile(
  supabase: SupabaseClient,
  contactId: string,
): Promise<CustomerProfileData | null> {
  const [contactRes, fieldsRes, valuesRes] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', contactId).maybeSingle(),
    supabase.from('custom_fields').select('id, field_name'),
    supabase.from('contact_custom_values').select('*').eq('contact_id', contactId),
  ]);

  if (!contactRes.data) return null;
  const contact = contactRes.data;

  const fieldIdToName: Record<string, string> = {};
  fieldsRes.data?.forEach((f) => {
    fieldIdToName[f.id] = f.field_name;
  });

  const profile: CustomerProfileData = {
    name: contact.name || '',
    phone: contact.phone || '',
    email: contact.email || '',
    company: contact.company || '',
  };

  valuesRes.data?.forEach((v) => {
    const fName = fieldIdToName[v.custom_field_id];
    if (fName && FIELD_NAME_MAP[fName]) {
      const key = FIELD_NAME_MAP[fName];
      profile[key] = v.value || '';
    }
  });

  return profile;
}

/**
 * Save customer profile fields (updates contacts + custom values + notes)
 */
export async function saveCustomerProfile(
  supabase: SupabaseClient,
  contactId: string,
  accountId: string,
  userId: string,
  data: CustomerProfileData,
): Promise<void> {
  // 1. Update contact basic fields
  const { error: contactErr } = await supabase
    .from('contacts')
    .update({
      name: data.name.trim() || null,
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      company: data.company?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId);

  if (contactErr) throw contactErr;

  // 2. Fetch custom fields for this account
  const { data: fields } = await supabase
    .from('custom_fields')
    .select('id, field_name')
    .eq('account_id', accountId);

  if (fields && fields.length > 0) {
    const fieldNameToId: Record<string, string> = {};
    fields.forEach((f) => {
      fieldNameToId[f.field_name] = f.id;
    });

    const rowsToInsert: {
      contact_id: string;
      custom_field_id: string;
      value: string;
    }[] = [];

    const keys: (keyof CustomerProfileData)[] = [
      'altPhone',
      'state',
      'district',
      'businessType',
      'capacity',
      'leadStatus',
    ];

    for (const key of keys) {
      const fieldName = REVERSE_FIELD_MAP[key];
      const fieldId = fieldNameToId[fieldName];
      const val = data[key];
      if (fieldId && val && typeof val === 'string' && val.trim()) {
        rowsToInsert.push({
          contact_id: contactId,
          custom_field_id: fieldId,
          value: val.trim(),
        });
      }
    }

    // Delete existing custom values for this contact and reinsert
    await supabase
      .from('contact_custom_values')
      .delete()
      .eq('contact_id', contactId);

    if (rowsToInsert.length > 0) {
      const { error: insErr } = await supabase
        .from('contact_custom_values')
        .insert(rowsToInsert);
      if (insErr) throw insErr;
    }
  }

  // 3. Sync with Pipeline Deals
  if (data.leadStatus) {
    try {
      const { data: pipelines } = await supabase
        .from('pipelines')
        .select('id')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (pipelines && pipelines.length > 0) {
        const pipelineId = pipelines[0].id;
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('id, name, position')
          .eq('pipeline_id', pipelineId)
          .order('position', { ascending: true });

        if (stages && stages.length > 0) {
          const statusLower = data.leadStatus.toLowerCase();
          let targetStage = stages[0].id; // default Enquiry

          if (statusLower.includes('book') || statusLower.includes('won')) {
            targetStage = stages.find((s) => s.name.toLowerCase().includes('book'))?.id || targetStage;
          } else if (statusLower.includes('retail') || statusLower.includes('deliver')) {
            targetStage = stages.find((s) => s.name.toLowerCase().includes('retail'))?.id || targetStage;
          } else if (statusLower.includes('lead') || statusLower.includes('follow') || statusLower.includes('demo')) {
            targetStage = stages.find((s) => s.name.toLowerCase().includes('lead'))?.id || targetStage;
          } else if (statusLower.includes('enquiry')) {
            targetStage = stages.find((s) => s.name.toLowerCase().includes('enquiry'))?.id || targetStage;
          }

          const { data: existingDeal } = await supabase
            .from('deals')
            .select('id')
            .eq('contact_id', contactId)
            .eq('pipeline_id', pipelineId)
            .maybeSingle();

          if (existingDeal) {
            await supabase
              .from('deals')
              .update({ stage_id: targetStage, title: data.name || data.phone || 'Customer Deal', updated_at: new Date().toISOString() })
              .eq('id', existingDeal.id);
          } else {
            await supabase.from('deals').insert({
              title: data.name || data.phone || 'Customer Deal',
              contact_id: contactId,
              pipeline_id: pipelineId,
              user_id: userId,
              account_id: accountId,
              stage_id: targetStage,
              value: 0,
              currency: 'INR',
              status: 'open',
              assigned_to: userId,
            });
          }
        }
      }
    } catch {
      // Non-critical background sync
    }
  }

  // 4. Optional note
  if (data.notes && data.notes.trim()) {
    await supabase.from('contact_notes').insert({
      contact_id: contactId,
      account_id: accountId,
      user_id: userId,
      note_text: data.notes.trim(),
    });
  }
}
