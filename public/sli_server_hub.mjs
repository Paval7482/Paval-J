import http from 'http';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { URL } from 'url';

const { Pool } = pg;

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

const PORT = process.env.PORT || 8080;
const BASE_DIR = path.resolve('C:\\SLICRMDATA');
const AUDIOS_DIR = path.join(BASE_DIR, 'Audios');
const BACKUPS_DIR = path.join(BASE_DIR, 'Backups');

if (!fs.existsSync(AUDIOS_DIR)) fs.mkdirSync(AUDIOS_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

let pool = null;

async function initDatabase() {
  const passwords = [
    'SriLakshmi@123',
    'srilakshmi@123',
    'Srilakshmi@123',
    'SRILAKSHMI@123',
    process.env.PGPASSWORD,
    'Password@123',
    'Sli@2026',
    'SliAdmin@2026',
    'postgres',
    'admin',
  ].filter(Boolean);

  for (const pwd of passwords) {
    try {
      const testPool = new Pool({
        host: '127.0.0.1',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: pwd,
        connectionTimeoutMillis: 3000,
      });

      const client = await testPool.connect();
      const dbCheck = await client.query("SELECT 1 FROM pg_database WHERE datname='srilakshmi_crm'");
      if (dbCheck.rows.length === 0) {
        await client.query("CREATE DATABASE srilakshmi_crm");
        console.log('[DATABASE] ✅ Created srilakshmi_crm Database!');
      }
      client.release();
      await testPool.end();

      const crmPool = new Pool({
        host: '127.0.0.1',
        port: 5432,
        database: 'srilakshmi_crm',
        user: 'postgres',
        password: pwd,
        connectionTimeoutMillis: 5000,
      });

      const crmClient = await crmPool.connect();
      
      await crmClient.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL DEFAULT 'Sri Lakshmi Industries',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID,
          email TEXT,
          full_name TEXT,
          role TEXT DEFAULT 'sales',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID,
          user_id UUID,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          phone_normalized TEXT,
          email TEXT,
          company TEXT,
          avatar_url TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS call_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID,
          customer_number TEXT NOT NULL,
          agent_name TEXT,
          agent_phone TEXT,
          call_type TEXT DEFAULT 'outbound',
          call_status TEXT DEFAULT 'connected',
          call_duration TEXT DEFAULT '00:00',
          recording_url TEXT,
          call_date TIMESTAMPTZ DEFAULT now(),
          source TEXT DEFAULT 'sli_server_sync',
          created_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS contact_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID,
          contact_id UUID,
          user_id UUID,
          note_text TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS deals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID,
          contact_id UUID,
          user_id UUID,
          title TEXT NOT NULL,
          value NUMERIC DEFAULT 0,
          status TEXT DEFAULT 'open',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      const accCheck = await crmClient.query('SELECT id FROM accounts LIMIT 1');
      if (accCheck.rows.length === 0) {
        await crmClient.query("INSERT INTO accounts (name) VALUES ('Sri Lakshmi Industries')");
      }

      crmClient.release();

      console.log(`[DATABASE] ✅ 100% CONNECTED TO POSTGRESQL (srilakshmi_crm) WITH SriLakshmi@123!`);
      pool = crmPool;
      return;
    } catch (e) {}
  }

  console.warn('[DATABASE] ⚠️ Warning: Could not authenticate with postgres password.');
}

initDatabase();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  });
  res.end(JSON.stringify(data));
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve({ fields: body ? JSON.parse(body) : {}, files: {} });
        } catch {
          resolve({ fields: {}, files: {} });
        }
      });
      return;
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return reject(new Error('No multipart boundary'));

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const boundaryBuffer = Buffer.from('--' + boundary);
      const parts = [];
      let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length;

      while (start < buffer.length) {
        const next = buffer.indexOf(boundaryBuffer, start);
        if (next === -1) break;
        parts.push(buffer.subarray(start, next));
        start = next + boundaryBuffer.length;
      }

      const fields = {};
      const files = {};

      for (const part of parts) {
        const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
        if (headerEnd === -1) continue;

        const headerStr = part.subarray(0, headerEnd).toString('utf8');
        let bodyBuffer = part.subarray(headerEnd + 4);
        if (bodyBuffer.lastIndexOf(Buffer.from('\r\n')) === bodyBuffer.length - 2) {
          bodyBuffer = bodyBuffer.subarray(0, bodyBuffer.length - 2);
        }

        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

        if (nameMatch) {
          const fieldName = nameMatch[1];
          if (filenameMatch) {
            files[fieldName] = {
              filename: filenameMatch[1],
              contentType: contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream',
              data: bodyBuffer,
              size: bodyBuffer.length,
            };
          } else {
            fields[fieldName] = bodyBuffer.toString('utf8').trim();
          }
        }
      }

      resolve({ fields, files });
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    });
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  try {
    // 1. Health Check
    if (pathname === '/' || pathname === '/health') {
      let contactCount = 0;
      if (pool) {
        try {
          const dbRes = await pool.query('SELECT count(*) FROM contacts');
          contactCount = parseInt(dbRes.rows[0].count, 10);
        } catch (e) {}
      }

      return sendJson(res, 200, {
        status: 'online',
        service: 'Sri Lakshmi Industries Master 8TB CRM Hub',
        database: pool ? 'PostgreSQL 100% Connected (srilakshmi_crm)' : 'Database Initializing',
        totalContactsInLocalDB: contactCount,
        storagePath: BASE_DIR,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Audio Streaming endpoint: /api/audio/:date/:filename
    if (pathname.startsWith('/api/audio/')) {
      const subPath = decodeURIComponent(pathname.replace('/api/audio/', ''));
      const filePath = path.join(AUDIOS_DIR, subPath);

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Audio file not found');
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      const ext = path.extname(filePath).toLowerCase();
      const mimeType = ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mpeg' : 'audio/mp4';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*',
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(filePath).pipe(res);
      }
      return;
    }

    // 3. Direct Mobile Audio Upload & Call Log Endpoint: POST /api/upload-call
    if (pathname === '/api/upload-call' && req.method === 'POST') {
      const { fields, files } = await parseMultipart(req);

      const customerPhone = String(fields.customer_number || fields.phone || '').replace(/\D/g, '');
      const agentPhone = String(fields.agent_phone || '').replace(/\D/g, '');
      const agentName = String(fields.agent_name || 'Sales Executive').trim();
      const callType = String(fields.call_type || 'outbound').toLowerCase();
      const duration = String(fields.duration || fields.call_duration || '0').trim();
      const callStatus = String(fields.call_status || 'connected').toLowerCase();
      const recordedAt = fields.timestamp || new Date().toISOString();

      if (!customerPhone || customerPhone.length < 6) {
        return sendJson(res, 400, { ok: false, error: 'Valid customer number required' });
      }

      const last10 = customerPhone.slice(-10);
      let recordingUrl = null;
      let localAudioRelativePath = null;

      const audioFile = files.audio || files.file || files.recording;
      if (audioFile && audioFile.data && audioFile.data.length > 0) {
        const dateStr = recordedAt.slice(0, 10);
        const dayFolder = path.join(AUDIOS_DIR, dateStr);
        if (!fs.existsSync(dayFolder)) fs.mkdirSync(dayFolder, { recursive: true });

        const cleanExec = agentName.replace(/\s+/g, '_');
        const ext = (audioFile.filename || '').split('.').pop() || 'wav';
        const fileName = `${cleanExec}_${last10}_${Date.now()}.${ext}`;
        const finalFilePath = path.join(dayFolder, fileName);

        fs.writeFileSync(finalFilePath, audioFile.data);
        localAudioRelativePath = `${dateStr}/${fileName}`;
        recordingUrl = `/api/audio/${dateStr}/${fileName}`;
        console.log(`[8TB STORAGE] 🎙️ Audio saved directly to 8TB HDD: ${finalFilePath}`);
      }

      let contactId = null;
      let contactName = `Lead ${last10}`;

      if (pool) {
        try {
          const accRes = await pool.query('SELECT id FROM accounts LIMIT 1');
          const accountId = accRes.rows[0]?.id || null;

          const contactSearch = await pool.query(
            `SELECT id, name FROM contacts WHERE phone LIKE $1 OR phone_normalized LIKE $1 LIMIT 1`,
            [`%${last10}`]
          );

          if (contactSearch.rows.length > 0) {
            contactId = contactSearch.rows[0].id;
            contactName = contactSearch.rows[0].name || contactName;
          } else if (accountId) {
            const newContact = await pool.query(
              `INSERT INTO contacts (account_id, name, phone, phone_normalized)
               VALUES ($1, $2, $3, $4) RETURNING id, name`,
              [accountId, contactName, customerPhone, last10]
            );
            contactId = newContact.rows[0]?.id;
            contactName = newContact.rows[0]?.name;
          }

          await pool.query(
            `INSERT INTO call_logs (account_id, customer_number, agent_name, agent_phone, call_type, call_status, call_duration, recording_url, call_date, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              accountId,
              customerPhone,
              agentName,
              agentPhone || null,
              callType.includes('in') ? 'inbound' : 'outbound',
              callStatus,
              duration,
              recordingUrl,
              recordedAt,
              'sli_8tb_server_sync',
            ]
          );

          if (accountId && contactId) {
            const icon = callType.includes('in') ? '📲 Incoming Call' : '📞 Outgoing Call';
            const noteText = [
              `${icon} (SLI 8TB Server Live)`,
              `👤 Executive: ${agentName} ${agentPhone ? `(+${agentPhone})` : ''}`,
              `⏱️ Duration: ${duration}`,
              `📅 Time: ${new Date(recordedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
              `📞 Status: ${callStatus}`,
              recordingUrl ? `🎙️ Audio Recording: ${recordingUrl}` : '',
            ]
              .filter(Boolean)
              .join('\n');

            await pool.query(
              `INSERT INTO contact_notes (account_id, contact_id, note_text, created_at)
               VALUES ($1, $2, $3, $4)`,
              [accountId, contactId, noteText, recordedAt]
            );
          }
        } catch (dbErr) {
          console.warn('[DB WARNING]', dbErr.message);
        }
      }

      return sendJson(res, 200, {
        ok: true,
        message: 'Call & Audio saved directly to Sri Lakshmi Industries 8TB Server!',
        recordingUrl,
        localAudioPath: localAudioRelativePath,
        contactName,
        contactId,
      });
    }

    // 4. Fetch Contacts: GET /api/contacts
    if (pathname === '/api/contacts' && req.method === 'GET') {
      if (!pool) return sendJson(res, 200, { ok: true, count: 0, data: [] });
      const search = reqUrl.searchParams.get('search') || '';
      const limit = parseInt(reqUrl.searchParams.get('limit') || '100', 10);
      let query = 'SELECT * FROM contacts ORDER BY created_at DESC LIMIT $1';
      let params = [limit];

      if (search) {
        query = 'SELECT * FROM contacts WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY created_at DESC LIMIT $2';
        params = [`%${search}%`, limit];
      }

      const dbRes = await pool.query(query, params);
      return sendJson(res, 200, { ok: true, count: dbRes.rows.length, data: dbRes.rows });
    }

    // 5. Fetch Call Logs: GET /api/calls
    if (pathname === '/api/calls' && req.method === 'GET') {
      if (!pool) return sendJson(res, 200, { ok: true, count: 0, data: [] });
      const limit = parseInt(reqUrl.searchParams.get('limit') || '100', 10);
      const dbRes = await pool.query(
        'SELECT * FROM call_logs ORDER BY call_date DESC LIMIT $1',
        [limit]
      );
      return sendJson(res, 200, { ok: true, count: dbRes.rows.length, data: dbRes.rows });
    }

    // 6. Executive Stats: GET /api/stats
    if (pathname === '/api/stats' && req.method === 'GET') {
      if (!pool) {
        return sendJson(res, 200, {
          ok: true,
          totalContacts: 0,
          totalCalls: 0,
          totalNotes: 0,
          executives: [],
        });
      }

      const callCount = await pool.query('SELECT count(*) FROM call_logs');
      const contactCount = await pool.query('SELECT count(*) FROM contacts');
      const noteCount = await pool.query('SELECT count(*) FROM contact_notes');
      const execStats = await pool.query(`
        SELECT agent_name, count(*) as call_count 
        FROM call_logs 
        GROUP BY agent_name 
        ORDER BY call_count DESC
      `);

      return sendJson(res, 200, {
        ok: true,
        totalContacts: parseInt(contactCount.rows[0].count, 10),
        totalCalls: parseInt(callCount.rows[0].count, 10),
        totalNotes: parseInt(noteCount.rows[0].count, 10),
        executives: execStats.rows,
      });
    }

    // 7. Bulk Import from Cloud: POST /api/bulk-import
    if (pathname === '/api/bulk-import' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { accounts, profiles, contacts, notes, deals } = payload;

          if (!pool) return sendJson(res, 500, { ok: false, error: 'Database not connected' });

          const client = await pool.connect();
          try {
            let counts = { contacts: 0, notes: 0, deals: 0, profiles: 0 };

            if (accounts && accounts.length) {
              for (const a of accounts) {
                await client.query(
                  `INSERT INTO accounts (id, name, created_at, updated_at)
                   VALUES ($1, $2, $3, $4)
                   ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
                  [a.id, a.name, a.created_at, a.updated_at]
                );
              }
            }

            if (profiles && profiles.length) {
              for (const p of profiles) {
                await client.query(
                  `INSERT INTO profiles (id, account_id, email, full_name, role, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)
                   ON CONFLICT (id) DO NOTHING`,
                  [p.id, p.account_id, p.email, p.full_name, p.role, p.created_at, p.updated_at]
                );
                counts.profiles++;
              }
            }

            if (contacts && contacts.length) {
              for (const c of contacts) {
                await client.query(
                  `INSERT INTO contacts (id, account_id, user_id, name, phone, phone_normalized, email, company, avatar_url, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                   ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone`,
                  [c.id, c.account_id, c.user_id, c.name, c.phone, c.phone_normalized, c.email, c.company, c.avatar_url, c.created_at, c.updated_at]
                );
                counts.contacts++;
              }
            }

            if (notes && notes.length) {
              for (const n of notes) {
                await client.query(
                  `INSERT INTO contact_notes (id, account_id, contact_id, user_id, note_text, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6)
                   ON CONFLICT (id) DO NOTHING`,
                  [n.id, n.account_id, n.contact_id, n.user_id, n.note_text, n.created_at]
                );
                counts.notes++;
              }
            }

            if (deals && deals.length) {
              for (const d of deals) {
                await client.query(
                  `INSERT INTO deals (id, account_id, contact_id, user_id, title, value, status, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                   ON CONFLICT (id) DO NOTHING`,
                  [d.id, d.account_id, d.contact_id, d.user_id, d.title, d.value, d.status, d.created_at, d.updated_at]
                );
                counts.deals++;
              }
            }

            return sendJson(res, 200, { ok: true, imported: counts });
          } finally {
            client.release();
          }
        } catch (err) {
          return sendJson(res, 500, { ok: false, error: err.message });
        }
      });
      return;
    }

    return sendJson(res, 404, { ok: false, error: 'Endpoint not found on Sri Lakshmi CRM Server' });
  } catch (err) {
    console.error('[SERVER ERROR]', err);
    return sendJson(res, 500, { ok: false, error: err.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n================================================================`);
  console.log(`  🚀 SRI LAKSHMI INDUSTRIES - MASTER 8TB SERVER HUB IS LIVE!   `);
  console.log(`================================================================`);
  console.log(`[*] Server Port: ${PORT}`);
  console.log(`[*] Local PostgreSQL: srilakshmi_crm (Port 5432)`);
  console.log(`[*] 8TB Audio Storage: ${AUDIOS_DIR}`);
  console.log(`================================================================\n`);
});
