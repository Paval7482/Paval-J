import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Pool } = pg;

const SUPABASE_URL = 'https://lapltmrlzysvblrygaic.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhcGx0bXJsenlzdmJscnlnYWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODYwMzEyOSwiZXhwIjoyMTA0MTc5MTI5fQ.kOKm5Mh0KO9i5D8zH5pbZzXzALQvkqxRIJt0YPQiZr8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'srilakshmi_crm',
  user: 'postgres',
  password: 'Sli@2026',
});

async function migrateData() {
  console.log('🚀 Starting Data Migration from Cloud to Local 8TB Server...');
  const client = await pool.connect();

  try {
    // Disable FK checks during initial data sync
    await client.query(`SET session_replication_role = 'replica';`);

    // 1. Accounts
    console.log('[1/8] Migrating Accounts...');
    const { data: accounts } = await supabase.from('accounts').select('*');
    if (accounts && accounts.length > 0) {
      for (const a of accounts) {
        await client.query(
          `INSERT INTO accounts (id, name, created_at, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at`,
          [a.id, a.name, a.created_at, a.updated_at]
        );
      }
      console.log(`✅ ${accounts.length} Accounts migrated.`);
    }

    // 2. Profiles
    console.log('[2/8] Migrating Profiles...');
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        await client.query(
          `INSERT INTO profiles (id, account_id, email, full_name, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = EXCLUDED.updated_at`,
          [p.id, p.account_id, p.email, p.full_name, p.role, p.created_at, p.updated_at]
        );
      }
      console.log(`✅ ${profiles.length} Profiles migrated.`);
    }

    // 3. Contacts
    console.log('[3/8] Migrating Contacts...');
    const { data: contacts } = await supabase.from('contacts').select('*').limit(10000);
    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        await client.query(
          `INSERT INTO contacts (id, account_id, user_id, name, phone, phone_normalized, email, company, avatar_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, updated_at = EXCLUDED.updated_at`,
          [c.id, c.account_id, c.user_id, c.name, c.phone, c.phone_normalized, c.email, c.company, c.avatar_url, c.created_at, c.updated_at]
        );
      }
      console.log(`✅ ${contacts.length} Contacts migrated.`);
    }

    // 4. Tags
    console.log('[4/8] Migrating Tags...');
    const { data: tags } = await supabase.from('tags').select('*');
    if (tags && tags.length > 0) {
      for (const t of tags) {
        await client.query(
          `INSERT INTO tags (id, account_id, name, color, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color`,
          [t.id, t.account_id, t.name, t.color, t.created_at]
        );
      }
      console.log(`✅ ${tags.length} Tags migrated.`);
    }

    // 5. Contact Tags
    console.log('[5/8] Migrating Contact Tags...');
    const { data: contactTags } = await supabase.from('contact_tags').select('*').limit(10000);
    if (contactTags && contactTags.length > 0) {
      for (const ct of contactTags) {
        await client.query(
          `INSERT INTO contact_tags (id, contact_id, tag_id, created_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [ct.id, ct.contact_id, ct.tag_id, ct.created_at]
        );
      }
      console.log(`✅ ${contactTags.length} Contact Tags migrated.`);
    }

    // 6. Contact Notes
    console.log('[6/8] Migrating Contact Notes...');
    const { data: notes } = await supabase.from('contact_notes').select('*').limit(10000);
    if (notes && notes.length > 0) {
      for (const n of notes) {
        await client.query(
          `INSERT INTO contact_notes (id, account_id, contact_id, user_id, note_text, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET note_text = EXCLUDED.note_text`,
          [n.id, n.account_id, n.contact_id, n.user_id, n.note_text, n.created_at]
        );
      }
      console.log(`✅ ${notes.length} Contact Notes migrated.`);
    }

    // 7. Call Logs
    console.log('[7/8] Migrating Call Logs...');
    const { data: callLogs } = await supabase.from('call_logs').select('*').limit(10000);
    if (callLogs && callLogs.length > 0) {
      for (const cl of callLogs) {
        await client.query(
          `INSERT INTO call_logs (id, account_id, customer_number, agent_name, agent_phone, call_type, call_status, call_duration, recording_url, call_date, source, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [cl.id, cl.account_id, cl.customer_number, cl.agent_name, cl.agent_phone, cl.call_type, cl.call_status, cl.call_duration, cl.recording_url, cl.call_date, cl.source, cl.created_at]
        );
      }
      console.log(`✅ ${callLogs.length} Call Logs migrated.`);
    }

    // 8. Deals
    console.log('[8/8] Migrating Deals...');
    const { data: deals } = await supabase.from('deals').select('*').limit(10000);
    if (deals && deals.length > 0) {
      for (const d of deals) {
        await client.query(
          `INSERT INTO deals (id, account_id, contact_id, user_id, title, value, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, value = EXCLUDED.value, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
          [d.id, d.account_id, d.contact_id, d.user_id, d.title, d.value, d.status, d.created_at, d.updated_at]
        );
      }
      console.log(`✅ ${deals.length} Deals migrated.`);
    }

    // 9. Conversations & Messages
    console.log('[9/9] Migrating Conversations & Messages...');
    const { data: convs } = await supabase.from('conversations').select('*').limit(10000);
    if (convs && convs.length > 0) {
      for (const c of convs) {
        await client.query(
          `INSERT INTO conversations (id, account_id, contact_id, user_id, status, assigned_agent_id, last_message_text, last_message_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [c.id, c.account_id, c.contact_id, c.user_id, c.status, c.assigned_agent_id, c.last_message_text, c.last_message_at, c.created_at, c.updated_at]
        );
      }
      console.log(`✅ ${convs.length} Conversations migrated.`);
    }

    const { data: msgs } = await supabase.from('messages').select('*').limit(10000);
    if (msgs && msgs.length > 0) {
      for (const m of msgs) {
        await client.query(
          `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content_type, content_text, media_url, media_type, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [m.id, m.conversation_id, m.sender_type, m.sender_id, m.content_type || 'text', m.content_text || '', m.media_url, m.media_type, m.status || 'delivered', m.created_at]
        );
      }
      console.log(`✅ ${msgs.length} Messages migrated.`);
    }

    // Re-enable FK checks
    await client.query(`SET session_replication_role = 'origin';`);

    console.log('\n🎉 ALL 10 TABLES SUCCESSFULLY POPULATED ON LOCAL 8TB SERVER DATABASE!');
  } catch (err) {
    console.error('❌ Migration Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateData();
