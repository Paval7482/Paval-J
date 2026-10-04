import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return val.toString();
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function exportFullDatabase() {
  let sql = `-- ==========================================================================\n`;
  sql += `-- SRI LAKSHMI INDUSTRIES CRM - COMPLETE LOCAL POSTGRESQL RESTORE\n`;
  sql += `-- ==========================================================================\n\n`;

  sql += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
  sql += `CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n`;

  // 1. ACCOUNTS TABLE
  sql += `CREATE TABLE IF NOT EXISTS public.accounts (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  name TEXT NOT NULL,\n`;
  sql += `  owner_user_id UUID,\n`;
  sql += `  default_currency TEXT DEFAULT 'INR',\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT now(),\n`;
  sql += `  updated_at TIMESTAMPTZ DEFAULT now()\n`;
  sql += `);\n\n`;

  // 2. PROFILES TABLE
  sql += `CREATE TABLE IF NOT EXISTS public.profiles (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  user_id UUID,\n`;
  sql += `  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,\n`;
  sql += `  full_name TEXT NOT NULL,\n`;
  sql += `  email TEXT,\n`;
  sql += `  phone TEXT,\n`;
  sql += `  avatar_url TEXT,\n`;
  sql += `  role TEXT DEFAULT 'agent',\n`;
  sql += `  account_role TEXT DEFAULT 'agent',\n`;
  sql += `  beta_features JSONB DEFAULT '{}'::jsonb,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT now(),\n`;
  sql += `  updated_at TIMESTAMPTZ DEFAULT now()\n`;
  sql += `);\n\n`;

  // 3. CONTACTS TABLE
  sql += `CREATE TABLE IF NOT EXISTS public.contacts (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,\n`;
  sql += `  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,\n`;
  sql += `  name TEXT NOT NULL,\n`;
  sql += `  phone TEXT NOT NULL,\n`;
  sql += `  phone_normalized TEXT,\n`;
  sql += `  email TEXT,\n`;
  sql += `  company TEXT,\n`;
  sql += `  avatar_url TEXT,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT now(),\n`;
  sql += `  updated_at TIMESTAMPTZ DEFAULT now()\n`;
  sql += `);\n\n`;

  // 4. TAGS TABLE
  sql += `CREATE TABLE IF NOT EXISTS public.tags (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,\n`;
  sql += `  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,\n`;
  sql += `  name TEXT NOT NULL,\n`;
  sql += `  color TEXT DEFAULT '#10B981',\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT now()\n`;
  sql += `);\n\n`;

  // 5. CONTACT_TAGS TABLE
  sql += `CREATE TABLE IF NOT EXISTS public.contact_tags (\n`;
  sql += `  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,\n`;
  sql += `  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,\n`;
  sql += `  PRIMARY KEY (contact_id, tag_id)\n`;
  sql += `);\n\n`;

  // 6. CONVERSATIONS TABLE
  sql += `CREATE TABLE IF NOT EXISTS public.conversations (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,\n`;
  sql += `  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,\n`;
  sql += `  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,\n`;
  sql += `  status TEXT DEFAULT 'open',\n`;
  sql += `  assigned_agent_id UUID,\n`;
  sql += `  last_message_text TEXT,\n`;
  sql += `  last_message_at TIMESTAMPTZ DEFAULT now(),\n`;
  sql += `  unread_count INT DEFAULT 0,\n`;
  sql += `  ai_autoreply_disabled BOOLEAN DEFAULT false,\n`;
  sql += `  ai_reply_count INT DEFAULT 0,\n`;
  sql += `  ai_handoff_summary TEXT,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT now(),\n`;
  sql += `  updated_at TIMESTAMPTZ DEFAULT now()\n`;
  sql += `);\n\n`;

  // 7. MESSAGES TABLE
  sql += `CREATE TABLE IF NOT EXISTS public.messages (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,\n`;
  sql += `  sender_type TEXT NOT NULL,\n`;
  sql += `  sender_id UUID,\n`;
  sql += `  content_type TEXT DEFAULT 'text',\n`;
  sql += `  content_text TEXT NOT NULL,\n`;
  sql += `  media_url TEXT,\n`;
  sql += `  media_type TEXT,\n`;
  sql += `  template_name TEXT,\n`;
  sql += `  message_id TEXT,\n`;
  sql += `  status TEXT DEFAULT 'delivered',\n`;
  sql += `  reply_to_message_id TEXT,\n`;
  sql += `  interactive_reply_id TEXT,\n`;
  sql += `  interactive_payload JSONB,\n`;
  sql += `  ai_generated BOOLEAN DEFAULT false,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT now()\n`;
  sql += `);\n\n`;

  // 8. CONTACT_NOTES TABLE
  sql += `CREATE TABLE IF NOT EXISTS public.contact_notes (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,\n`;
  sql += `  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,\n`;
  sql += `  user_id UUID,\n`;
  sql += `  note_text TEXT NOT NULL,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT now()\n`;
  sql += `);\n\n`;

  // 9. CALL_LOGS TABLE
  sql += `CREATE TABLE IF NOT EXISTS public.call_logs (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,\n`;
  sql += `  customer_number TEXT NOT NULL,\n`;
  sql += `  virtual_number TEXT,\n`;
  sql += `  agent_name TEXT,\n`;
  sql += `  agent_phone TEXT,\n`;
  sql += `  call_type TEXT DEFAULT 'outbound',\n`;
  sql += `  call_status TEXT DEFAULT 'connected',\n`;
  sql += `  call_duration TEXT DEFAULT '00:30',\n`;
  sql += `  recording_url TEXT,\n`;
  sql += `  call_date TIMESTAMPTZ DEFAULT now(),\n`;
  sql += `  outcome TEXT,\n`;
  sql += `  notes TEXT,\n`;
  sql += `  source TEXT DEFAULT 'sli_mobile_sync',\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT now()\n`;
  sql += `);\n\n`;

  // 10. DEALS TABLE
  sql += `CREATE TABLE IF NOT EXISTS public.deals (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,\n`;
  sql += `  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,\n`;
  sql += `  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,\n`;
  sql += `  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,\n`;
  sql += `  pipeline_id UUID,\n`;
  sql += `  stage_id UUID,\n`;
  sql += `  title TEXT NOT NULL,\n`;
  sql += `  value NUMERIC DEFAULT 0,\n`;
  sql += `  currency TEXT DEFAULT 'INR',\n`;
  sql += `  notes TEXT,\n`;
  sql += `  expected_close_date DATE,\n`;
  sql += `  status TEXT DEFAULT 'open',\n`;
  sql += `  assigned_to UUID,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT now(),\n`;
  sql += `  updated_at TIMESTAMPTZ DEFAULT now()\n`;
  sql += `);\n\n`;

  // Insert data
  const tables = ['accounts', 'profiles', 'contacts', 'tags', 'contact_tags', 'conversations', 'contact_notes', 'deals'];
  for (const tbl of tables) {
    const { data: rows } = await supabase.from(tbl).select('*').limit(1000);
    if (rows && rows.length > 0) {
      sql += `-- POPULATE ${tbl.toUpperCase()} (${rows.length} records)\n`;
      for (const row of rows) {
        const cols = Object.keys(row);
        const colList = cols.map(c => `"${c}"`).join(', ');
        const valList = cols.map(c => escapeSql(row[c])).join(', ');
        sql += `INSERT INTO public.${tbl} (${colList}) VALUES (${valList}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      sql += `\n`;
    }
  }

  const outPath = path.join(process.cwd(), 'public', 'srilakshmi_crm_server_init.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log('Successfully regenerated:', outPath);
}

exportFullDatabase();
