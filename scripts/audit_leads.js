const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/SLI/wacrm/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fullAudit() {
  const { data: profiles } = await supabase.from('profiles').select('id, user_id, full_name, email, role');
  const profileMap = {};
  profiles?.forEach(p => {
    profileMap[p.id] = p;
    if (p.user_id) profileMap[p.user_id] = p;
  });

  const { data: contacts } = await supabase.from('contacts').select('id, name, phone, user_id, source, stage, created_at');
  const { data: deals } = await supabase.from('deals').select('id, title, user_id, assigned_to, contact_id, status, created_at');

  console.log('Total Profiles:', profiles?.length || 0);
  console.log('Total Contacts:', contacts ? contacts.length : 0);
  console.log('Total Deals:', deals ? deals.length : 0);

  // 1. Duplicate Contacts Analysis
  const phoneMap = {};
  contacts?.forEach(c => {
    const clean = (c.phone || '').replace(/\D/g, '').slice(-10);
    if (!clean) return;
    if (!phoneMap[clean]) phoneMap[clean] = [];
    phoneMap[clean].push(c);
  });

  const duplicates = Object.entries(phoneMap).filter(([k, v]) => v.length > 1);
  console.log('\n=== DUPLICATE PHONE NUMBERS IN CONTACTS ===');
  console.log('Duplicate numbers count:', duplicates.length);
  duplicates.forEach(([num, list]) => {
    console.log(`\nPhone: +91${num} (Found in ${list.length} contacts):`);
    list.forEach(c => {
      const owner = profileMap[c.user_id]?.full_name || 'Unassigned';
      console.log(`  - Contact ID: ${c.id} | Name: ${c.name} | Owner: ${owner} | Created: ${c.created_at}`);
    });
  });

  // 2. Deals assigned to Admin / Management
  const adminDeals = [];
  const execDeals = {};

  deals?.forEach(d => {
    const assignedProfile = profileMap[d.assigned_to] || profileMap[d.user_id];
    const name = assignedProfile ? assignedProfile.full_name : 'Unassigned';
    if (assignedProfile && (assignedProfile.email.includes('mdsir') || assignedProfile.email.includes('admin@') || assignedProfile.role === 'admin')) {
      adminDeals.push({ deal: d, assignedProfile });
    } else {
      execDeals[name] = (execDeals[name] || 0) + 1;
    }
  });

  console.log('\n=== DEALS ASSIGNED TO MANAGEMENT/ADMIN ===');
  console.log('Total Management Deals:', adminDeals.length);
  adminDeals.forEach(ad => {
    console.log(`- Deal ID: ${ad.deal.id} | Title: ${ad.deal.title} | Assigned To: ${ad.assignedProfile.full_name} (${ad.assignedProfile.email}) | Created: ${ad.deal.created_at}`);
  });

  console.log('\n=== DEALS BREAKDOWN PER SALES EXECUTIVE ===');
  console.table(execDeals);

  // 3. Contacts assigned to Management/Admin
  const adminContacts = [];
  const execContacts = {};
  contacts?.forEach(c => {
    const owner = profileMap[c.user_id];
    const name = owner ? owner.full_name : 'Unassigned';
    if (owner && (owner.email.includes('mdsir') || owner.email.includes('admin@') || owner.role === 'admin')) {
      adminContacts.push({ contact: c, owner });
    } else {
      execContacts[name] = (execContacts[name] || 0) + 1;
    }
  });

  console.log('\n=== CONTACTS ASSIGNED TO MANAGEMENT/ADMIN ===');
  console.log('Total Management Contacts:', adminContacts.length);
  adminContacts.slice(0, 10).forEach(ac => {
    console.log(`- Contact ID: ${ac.contact.id} | Name: ${ac.contact.name} | Phone: ${ac.contact.phone} | Owner: ${ac.owner.full_name}`);
  });

  console.log('\n=== CONTACTS BREAKDOWN PER SALES EXECUTIVE ===');
  console.table(execContacts);
}

fullAudit();
