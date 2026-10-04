import http from 'http';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

const PORT = 8080;
const BASE_DIR = path.resolve('C:\\SLICRMDATA');
const AUDIOS_DIR = path.join(BASE_DIR, 'Audios');

if (!fs.existsSync(AUDIOS_DIR)) fs.mkdirSync(AUDIOS_DIR, { recursive: true });

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'srilakshmi_crm',
  password: process.env.PGPASSWORD || 'SliAdmin@2026',
  port: 5432,
});

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Health Status
  if (url.pathname === '/api/status') {
    try {
      const dbRes = await pool.query('SELECT count(*) FROM public.contacts;');
      const contactCount = dbRes.rows[0].count;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, server: 'Sri Lakshmi 8TB Dedicated Server', contacts: contactCount, time: new Date() }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // 2. Fetch Leads
  if (url.pathname === '/api/leads' && req.method === 'GET') {
    try {
      const dbRes = await pool.query('SELECT * FROM public.contacts ORDER BY created_at DESC LIMIT 200;');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: dbRes.rows }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // 3. Stream Local Audio Files
  if (url.pathname.startsWith('/audios/')) {
    const relativePath = decodeURIComponent(url.pathname.replace('/audios/', ''));
    const safePath = path.normalize(path.join(AUDIOS_DIR, relativePath));

    if (safePath.startsWith(AUDIOS_DIR) && fs.existsSync(safePath)) {
      const stat = fs.statSync(safePath);
      const ext = path.extname(safePath).toLowerCase();
      const contentType = ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mpeg' : 'audio/mp4';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
      });
      fs.createReadStream(safePath).pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Audio file not found on 8TB server' }));
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(`   SRI LAKSHMI INDUSTRIES - 8TB SERVER DEDICATED BACKEND`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   PostgreSQL Database: srilakshmi_crm (Port 5432)`);
  console.log(`   Audio Storage: C:\\SLICRMDATA\\Audios`);
  console.log(`================================================================\n`);
});
