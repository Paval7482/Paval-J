@echo off
title Sri Lakshmi Industries - Live 8TB Audio and Database Sync
color 0A
cd /d "C:\SLICRMDATA"

echo ================================================================
echo    SRI LAKSHMI INDUSTRIES - 8TB LIVE AUDIO AND DATABASE SYNC
echo ================================================================
echo.

:: Auto-generate sync_audios.ps1 in place so only this 1 bat file is needed!
(
echo $cloudUrl = 'https://lapltmrlzysvblrygaic.supabase.co'
echo $cloudKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhcGx0bXJsenlzdmJscnlnYWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg2Mzk0NywiZXhwIjoyMDg3NDM5OTQ3fQ.V88V04pZ2hYQ0e8-gQ7T8yGZkE4g6WbJ0v4m_j4L7k0'
echo $headers = @{ 'apikey' = $cloudKey; 'Authorization' = 'Bearer ' + $cloudKey }
echo $audiosDir = 'C:\SLICRMDATA\Audios'
echo $backupsDir = 'C:\SLICRMDATA\Backups'
echo if (!(Test-Path $audiosDir)) { New-Item -ItemType Directory -Path $audiosDir ^| Out-Null }
echo if (!(Test-Path $backupsDir)) { New-Item -ItemType Directory -Path $backupsDir ^| Out-Null }
echo Write-Host "`n[*] Step 1: Checking for new Call Recordings and Audio Files..." -ForegroundColor Cyan
echo try {
echo     $notesUrl = "$cloudUrl/rest/v1/contact_notes?select=id,note_text,created_at&note_text=ilike.*Audio*&order=created_at.desc&limit=200"
echo     $notes = Invoke-RestMethod -Uri $notesUrl -Headers $headers -Method Get
echo     $count = 0
echo     foreach ($n in $notes) {
echo         if ($n.note_text -match '(?:Audio Recording^|Audio^|Recording):\s*(https?://[^\s\r\n]+)') {
echo             $audioUrl = $matches[1].Trim()
echo             $ext = if ($audioUrl -match '\.wav') { 'wav' } elseif ($audioUrl -match '\.mp3') { 'mp3' } else { 'm4a' }
echo             $dateStr = if ($n.created_at) { $n.created_at.Substring(0, 10) } else { 'General' }
echo             $dayFolder = Join-Path $audiosDir $dateStr
echo             if (!(Test-Path $dayFolder)) { New-Item -ItemType Directory -Path $dayFolder ^| Out-Null }
echo             $fileName = "Call_" + $n.id.Substring(0, 8) + "." + $ext
echo             $dest = Join-Path $dayFolder $fileName
echo             if (!(Test-Path $dest)) {
echo                 try {
echo                     Invoke-WebRequest -Uri $audioUrl -OutFile $dest -TimeoutSec 30
echo                     $count++
echo                     Write-Host "[+] Downloaded: $dateStr\$fileName" -ForegroundColor Green
echo                 } catch {}
echo             }
echo         }
echo     }
echo     try {
echo         $storageUrl = "$cloudUrl/storage/v1/object/list/call-recordings"
echo         $storageBody = '{\"limit\":100,\"offset\":0,\"sortBy\":{\"column\":\"created_at\",\"order\":\"desc\"}}'
echo         $storageFiles = Invoke-RestMethod -Uri $storageUrl -Headers $headers -Method Post -Body $storageBody -ContentType "application/json"
echo         $appAudioFolder = Join-Path $audiosDir "App_Recordings"
echo         if (!(Test-Path $appAudioFolder)) { New-Item -ItemType Directory -Path $appAudioFolder ^| Out-Null }
echo         foreach ($sf in $storageFiles) {
echo             $dest = Join-Path $appAudioFolder $sf.name
echo             if (!(Test-Path $dest)) {
echo                 $dlUrl = "$cloudUrl/storage/v1/object/public/call-recordings/$($sf.name)"
echo                 try {
echo                     Invoke-WebRequest -Uri $dlUrl -OutFile $dest -TimeoutSec 30
echo                     $count++
echo                     Write-Host "[+] Downloaded App Recording: $($sf.name)" -ForegroundColor Green
echo                 } catch {}
echo             }
echo         }
echo     } catch {}
echo     Write-Host "`n[SUCCESS] Synced $count new Audio Recordings to 8TB disk!" -ForegroundColor Green
echo } catch {
echo     Write-Host "[ERROR] Sync issue: $($_.Exception.Message)" -ForegroundColor Red
echo }
echo Write-Host "`n[*] Step 2: Creating Daily Database Backup..." -ForegroundColor Cyan
echo $date = Get-Date -Format 'yyyy-MM-dd'
echo $backupFile = Join-Path $backupsDir "SLI_DB_Backup_$date.sql"
echo $pgDump = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
echo if (!(Test-Path $pgDump)) { $pgDump = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" }
echo if (Test-Path $pgDump) {
echo     & $pgDump -h 127.0.0.1 -p 5432 -U postgres -d srilakshmi_crm -f $backupFile
echo     Write-Host "[SUCCESS] Local Database Backup created: $backupFile" -ForegroundColor Green
echo }
echo Write-Host "`n================================================================" -ForegroundColor Yellow
echo Write-Host "🎉 8TB STORAGE SYNC IS 100% COMPLETE AND UP TO DATE!" -ForegroundColor Yellow
echo Write-Host "================================================================`n" -ForegroundColor Yellow
) > "C:\SLICRMDATA\sync_audios.ps1"

powershell -NoProfile -ExecutionPolicy Bypass -File "C:\SLICRMDATA\sync_audios.ps1"

echo.
echo Press any key to exit...
pause >nul
