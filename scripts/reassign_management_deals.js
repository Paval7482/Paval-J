const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/SLI/wacrm/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function reassignManagementLeads() {
  // 1. Fetch profiles
  const { data: profiles } = await supabase.from('profiles').select('id, user_id, full_name, email, role');
  
  // Find active 6 sales executives
  const execNames = ['subash', 'satheesh', 'bala', 'nallakaman', 'baskar', 'karthick'];
  const activeExecs = profiles.filter(p => {
    const fn = (p.full_name || '').toLowerCase();
    const em = (p.email || '').toLowerCase();
    return execNames.some(name => fn.includes(name) || em.includes(name));
  });

  console.log('Active Executives for reassignment:');
  activeExecs.forEach(e => console.log(`- ${e.full_name} (${e.email}) | ID: ${e.id} | UserID: ${e.user_id}`));

  if (activeExecs.length === 0) {
    console.error('No active executives found!');
    return;
  }

  // 2. Find all deals assigned to MD / Admin / Sales (unassigned)
  const { data: deals } = await supabase.from('deals').select('id, title, user_id, assigned_to, contact_id');

  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.id] = p;
    if (p.user_id) profileMap[p.user_id] = p;
  });

  const dealsToReassign = [];
  deals?.forEach(d => {
    const owner = profileMap[d.assigned_to] || profileMap[d.user_id];
    if (owner && (owner.email.includes('mdsir') || owner.email.includes('admin@') || owner.role === 'admin' || owner.full_name === 'Sales')) {
      dealsToReassign.push(d);
    }
  });

  console.log(`\nFound ${dealsToReassign.length} deals currently assigned to Management/Admin.`);

  // 3. Reassign them in round-robin fashion
  let execIdx = 0;
  const reassignmentSummary = {};
  activeExecs.forEach(e => reassignmentSummary[e.full_name] = 0);

  for (const deal of dealsToReassign) {
    const targetExec = activeExecs[execIdx % activeExecs.length];
    execIdx++;

    const { error: updateErr } = await supabase
      .from('deals')
      .update({
        assigned_to: targetExec.id,
        user_id: targetExec.user_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', deal.id);

    if (!updateErr) {
      reassignmentSummary[targetExec.full_name]++;
    } else {
      console.error(`Error updating deal ${deal.id}:`, updateErr.message);
    }
  }

  console.log('\n=== REASSIGNMENT COMPLETE ===');
  console.table(reassignmentSummary);

  // 4. Verify no remaining management deals
  const { data: verifyDeals } = await supabase.from('deals').select('id, user_id, assigned_to');
  let remainingAdmin = 0;
  verifyDeals?.forEach(d => {
    const owner = profileMap[d.assigned_to] || profileMap[d.user_id];
    if (owner && (owner.email.includes('mdsir') || owner.email.includes('admin@') || owner.role === 'admin' || owner.full_name === 'Sales')) {
      remainingAdmin++;
    }
  });

  console.log(`\nRemaining Management/Admin deals in DB: ${remainingAdmin}`);
}

reassignManagementLeads();
