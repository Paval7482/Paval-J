import fs from 'fs';
import path from 'path';

const psCode = fs.readFileSync('public/sync_audios.ps1', 'utf8');
const b64 = Buffer.from(psCode, 'utf16le').toString('base64');

const batLines = [
  '@echo off',
  'title Sri Lakshmi Industries - Live 8TB Audio and Database Sync',
  'color 0A',
  'cd /d "C:\\SLICRMDATA"',
  '',
  'echo ================================================================',
  'echo    SRI LAKSHMI INDUSTRIES - 8TB LIVE AUDIO AND DATABASE SYNC',
  'echo ================================================================',
  'echo.',
  '',
  `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`,
  '',
  'echo.',
  'echo Press any key to exit...',
  'pause >nul'
];

fs.writeFileSync('public/SLI_Server_Sync_Audios_And_Backups.bat', batLines.join('\r\n'), 'utf8');
console.log('Standalone batch script generated successfully! Size:', fs.statSync('public/SLI_Server_Sync_Audios_And_Backups.bat').size);
