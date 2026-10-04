import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const { Pool } = pg;

// Cloud Config
const CLOUD_URL = 'https://lapltmrlzysvblrygaic.supabase.co';
const CLOUD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhcGx0bXJsenlzdmJscnlnYWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg2Mzk0NywiZXhwIjoyMDg3NDM5OTQ3fQ.V88V04pZ2hYQ0e8-gQ7T8yGZkE4g6WbJ0v4m_j4L7k0';
const cloudClient = createClient(CLOUD_URL, CLOUD_KEY);

// Local PostgreSQL Config
const LOCAL_DB_CONFIG = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || '127.0.0.1',
  database: process.env.PGDATABASE || 'srilakshmi_crm',
  password: process.env.PGPASSWORD || 'SliAdmin@2026', // Can be customized
  port: parseInt(process.env.PGPORT || '5432', 10),
};

const pool = new Pool(LOCAL_DB_CONFIG);

const BASE_DIR = path.resolve('C:\\SLICRMDATA');
const AUDIOS_DIR = path.join(BASE_DIR, 'Audios');
const BACKUPS_DIR = path.join(BASE_DIR, 'Backups');

// Ensure base directories exist
if (!fs.existsSync(AUDIOS_DIR)) fs.mkdirSync(AUDIOS_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

function downloadFile(fileUrl, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) return resolve(destPath);
    const client = fileUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    client.get(fileUrl, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        fs.unlink(destPath, () => {});
        return reject(new Error(`Failed to download: Status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(destPath));
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function syncCycle() {
  console.log(`\n[${new Date().toLocaleTimeString('en-IN')}] 🔄 Starting Sync Cycle...`);

  // 1. Sync Contacts
  try {
    const { data: contacts } = await cloudClient.from('contacts').select('*').limit(1000);
    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        await pool.query(
          `INSERT INTO public.contacts (id, account_id, user_id, name, phone, phone_normalized, email, company, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, company = EXCLUDED.company, updated_at = EXCLUDED.updated_at`,
          [c.id, c.account_id, c.user_id, c.name, c.phone, c.phone_normalized, c.email, c.company, c.created_at, c.updated_at]
        );
      }
      console.log(`✅ Synced ${contacts.length} Contacts to Local PostgreSQL.`);
    }
  } catch (err) {
    console.error('⚠️ Contacts sync error:', err.message);
  }

  // 2. Sync Contact Notes & Audio Recordings
  try {
    const { data: notes } = await cloudClient.from('contact_notes').select('*, contacts(name, phone)').limit(1000);
    if (notes && notes.length > 0) {
      let audioCount = 0;
      for (const n of notes) {
        await pool.query(
          `INSERT INTO public.contact_notes (id, account_id, contact_id, user_id, note_text, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [n.id, n.account_id, n.contact_id, n.user_id, n.note_text, n.created_at]
        );

        // Check for Audio URL
        const audioMatch = (n.note_text || '').match(/(?:🎙️\s*Audio Recording|Audio|Recording):\s*(https?:\/\/[^\s\n]+)/i);
        if (audioMatch) {
          const audioUrl = audioMatch[1].trim();
          const cleanPhone = (n.contacts?.phone || 'unknown').replace(/\D/g, '').slice(-10);
          const execMatch = (n.note_text || '').match(/(?:👤\s*Executive|Executive):\s*([^|\n]+)/i);
          const execName = execMatch ? execMatch[1].trim().replace(/\s+/g, '_') : 'Sales';
          
          const dateStr = n.created_at ? n.created_at.slice(0, 10) : '2026-10-01';
          const dayFolder = path.join(AUDIOS_DIR, dateStr);
          if (!fs.existsSync(dayFolder)) fs.mkdirSync(dayFolder, { recursive: true });

          const ext = audioUrl.endsWith('.wav') ? 'wav' : audioUrl.endsWith('.mp3') ? 'mp3' : 'm4a';
          const fileName = `${execName}_${cleanPhone}_${n.id.slice(0, 8)}.${ext}`;
          const localFilePath = path.join(dayFolder, fileName);

          if (!fs.existsSync(localFilePath)) {
            try {
              await downloadFile(audioUrl, localFilePath);
              audioCount++;
              console.log(`🎙️ Downloaded audio to Local 8TB: ${fileName}`);
            } catch (dlErr) {
              // Ignore invalid/expired URLs
            }
          }
        }
      }
      console.log(`✅ Synced ${notes.length} Notes & Downloaded ${audioCount} new call audios to 8TB disk.`);
    }
  } catch (err) {
    console.error('⚠️ Notes sync error:', err.message);
  }

  // 3. Storage Bucket Direct Audio Sync
  try {
    const { data: storageFiles } = await cloudClient.storage.from('call-recordings').list('', { limit: 100 });
    if (storageFiles && storageFiles.length > 0) {
      const storageFolder = path.join(AUDIOS_DIR, 'App_Recordings');
      if (!fs.existsSync(storageFolder)) fs.mkdirSync(storageFolder, { recursive: true });

      for (const f of storageFiles) {
        const dest = path.join(storageFolder, f.name);
        if (!fs.existsSync(dest)) {
          const { data: publicUrlData } = cloudClient.storage.from('call-recordings').getPublicUrl(f.name);
          if (publicUrlData?.publicUrl) {
            try {
              await downloadFile(publicUrlData.publicUrl, dest);
              console.log(`📲 Downloaded App Recording to 8TB: ${f.name}`);
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.error('⚠️ Storage sync error:', err.message);
  }

  console.log(`🏁 Sync cycle complete. Next sync in 2 minutes...`);
}

// Initial Run
syncCycle();
// Run every 2 minutes
setInterval(syncCycle, 2 * 60 * 1000);
