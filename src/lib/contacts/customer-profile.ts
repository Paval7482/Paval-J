import type { SupabaseClient } from '@supabase/supabase-js';

export interface CustomerProfileData {
  contactId?: string;
  name?: string;
  phone?: string;
  altPhone?: string;
  state?: string;
  district?: string;
  pincode?: string;
  address?: string;
  companyName?: string;
  businessType?: string;
  capacity?: string;
  leadStatus?: string;
  email?: string;
  company?: string;
  notes?: string;

  // Machine Master Links
  selectedMachineId?: string;
  selectedMachineName?: string;
  machinePrice?: number;
  machineModel?: string;
  machineNotes?: string;

  // Inbound Source Tracking
  source?: string;
  sourceCampaign?: string;
  sourceForm?: string;
  inboundDate?: string;

  // Assigned Team Member
  assignedExecutive?: string;

  // Follow-up scheduling
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  nextFollowUpMode?: string;
  followUpNote?: string;
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
  'new',
  'follow_up',
  'quoted',
  'closed_won',
  'closed_lost',
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

export function formatCustomerDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function formatDuration(durationStr?: string | null): string {
  if (!durationStr) return '00:00';
  return durationStr;
}

const FIELD_NAME_MAP: Record<string, keyof CustomerProfileData> = {
  'Alternative Phone': 'altPhone',
  'State': 'state',
  'District': 'district',
  'Pincode': 'pincode',
  'Address': 'address',
  'Business Type': 'businessType',
  'Production Capacity': 'capacity',
  'Lead Status': 'leadStatus',
  'Selected Machine': 'selectedMachineName',
  'Machine Model': 'machineModel',
  'Machine Price': 'machinePrice',
  'Machine Notes': 'machineNotes',
  'Lead Source': 'source',
  'Source Campaign': 'sourceCampaign',
  'Source Form': 'sourceForm',
  'Assigned Executive': 'assignedExecutive',
  'Next Followup Date': 'nextFollowUpDate',
  'Next Followup Time': 'nextFollowUpTime',
  'Follow Up Note': 'followUpNote',
};

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
    contactId,
    name: contact.name || '',
    phone: contact.phone || '',
    email: contact.email || '',
    company: contact.company || '',
    companyName: contact.company || '',
    inboundDate: contact.created_at || '',
    leadStatus: contact.status || 'new',
    assignedExecutive: contact.assigned_to || '',
  };

  valuesRes.data?.forEach((v) => {
    const fName = fieldIdToName[v.custom_field_id];
    if (fName && FIELD_NAME_MAP[fName]) {
      const key = FIELD_NAME_MAP[fName];
      if (key === 'machinePrice') {
        profile[key] = v.value ? parseInt(v.value, 10) : 0;
      } else {
        (profile as any)[key] = v.value || '';
      }
    }
  });

  return profile;
}

export async function saveCustomerProfile(
  supabase: SupabaseClient,
  contactId: string,
  arg3: string | CustomerProfileData,
  arg4?: string | CustomerProfileData,
  arg5?: CustomerProfileData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    let data: CustomerProfileData;
    let accountId: string | undefined;
    let userId: string | undefined;

    if (typeof arg3 === 'object' && arg3 !== null) {
      data = arg3;
      accountId = typeof arg4 === 'string' ? arg4 : undefined;
    } else {
      accountId = typeof arg3 === 'string' ? arg3 : undefined;
      userId = typeof arg4 === 'string' ? arg4 : undefined;
      data = arg5 || {};
    }
    // 1. Update contact basic fields if present
    const updateObj: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (data.name) updateObj.name = data.name.trim();
    if (data.phone) updateObj.phone = data.phone.trim();
    if (data.email !== undefined) updateObj.email = data.email?.trim() || null;
    if (data.companyName || data.company) updateObj.company = (data.companyName || data.company || '').trim();
    if (data.leadStatus) updateObj.status = data.leadStatus;
    if (data.assignedExecutive) updateObj.assigned_to = data.assignedExecutive;

    await supabase
      .from('contacts')
      .update(updateObj)
      .eq('id', contactId);

    // 2. Fetch custom fields
    const { data: fields } = await supabase
      .from('custom_fields')
      .select('id, field_name');

    if (fields && fields.length > 0) {
      const nameToFieldId: Record<string, string> = {};
      fields.forEach((f) => {
        nameToFieldId[f.field_name] = f.id;
      });

      const updates: { custom_field_id: string; value: string }[] = [];

      Object.entries(FIELD_NAME_MAP).forEach(([fName, proKey]) => {
        const fId = nameToFieldId[fName];
        if (fId) {
          const val = (data as any)[proKey];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            updates.push({
              custom_field_id: fId,
              value: String(val).trim(),
            });
          }
        }
      });

      for (const u of updates) {
        await supabase
          .from('contact_custom_values')
          .upsert(
            {
              contact_id: contactId,
              custom_field_id: u.custom_field_id,
              value: u.value,
            },
            { onConflict: 'contact_id,custom_field_id' }
          );
      }
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error saving customer profile:', err);
    return { ok: false, error: err?.message || 'Failed to save profile' };
  }
}
