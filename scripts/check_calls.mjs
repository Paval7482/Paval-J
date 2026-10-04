import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function main() {
  console.log('=== LATEST 10 CALL LOGS ===');
  const { data: calls, error: cErr } = await supabase
    .from('call_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log(JSON.stringify(calls, null, 2));

  console.log('=== LATEST 10 CONTACT NOTES ===');
  const { data: notes, error: nErr } = await supabase
    .from('contact_notes')
    .select('id, contact_id, note_text, created_at, contacts(id, name, phone)')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log(JSON.stringify(notes, null, 2));

  console.log('=== CALL RECORDINGS STORAGE ===');
  const { data: files, error: fErr } = await supabase.storage.from('call-recordings').list('', { limit: 10, sortBy: { column: 'created_at', order: 'desc' } });
  console.log(JSON.stringify(files, null, 2));
}

main();
