import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lapltmrlzysvblrygaic.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhcGx0bXJsenlzdmJscnlnYWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODYwMzEyOSwiZXhwIjoyMTA0MTc5MTI5fQ.kOKm5Mh0KO9i5D8zH5pbZzXzALQvkqxRIJt0YPQiZr8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SERVER_URL = process.argv[2] || 'https://calculations-capacity-litigation-apt.trycloudflare.com';

async function pushData() {
  console.log(`🚀 Pushing Cloud CRM Data to Server: ${SERVER_URL}`);

  try {
    const [accounts, profiles, contacts, notes, deals] = await Promise.all([
      supabase.from('accounts').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('contacts').select('*').limit(2000),
      supabase.from('contact_notes').select('*').limit(2000),
      supabase.from('deals').select('*').limit(2000),
    ]);

    console.log(`📦 Loaded from Cloud:`);
    console.log(`   - Accounts: ${accounts.data?.length || 0}`);
    console.log(`   - Profiles: ${profiles.data?.length || 0}`);
    console.log(`   - Contacts: ${contacts.data?.length || 0}`);
    console.log(`   - Notes:    ${notes.data?.length || 0}`);
    console.log(`   - Deals:    ${deals.data?.length || 0}`);

    const res = await fetch(`${SERVER_URL}/api/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accounts: accounts.data || [],
        profiles: profiles.data || [],
        contacts: contacts.data || [],
        notes: notes.data || [],
        deals: deals.data || [],
      }),
    });

    const result = await res.json();
    console.log(`\n🎉 SERVER RESPONSE:`, result);
  } catch (err) {
    console.error('❌ Push Error:', err.message);
  }
}

pushData();
