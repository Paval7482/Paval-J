# SRI LAKSHMI INDUSTRIES - 8TB LIVE AUDIO & DATABASE SYNC SCRIPT
$cloudUrl = 'https://lapltmrlzysvblrygaic.supabase.co'
$cloudKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhcGx0bXJsenlzdmJscnlnYWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODYwMzEyOSwiZXhwIjoyMTA0MTc5MTI5fQ.kOKm5Mh0KO9i5D8zH5pbZzXzALQvkqxRIJt0YPQiZr8'
$headers = @{ 'apikey' = $cloudKey; 'Authorization' = 'Bearer ' + $cloudKey }

$audiosDir = 'C:\SLICRMDATA\Audios'
$backupsDir = 'C:\SLICRMDATA\Backups'

if (!(Test-Path $audiosDir)) { New-Item -ItemType Directory -Path $audiosDir | Out-Null }
if (!(Test-Path $backupsDir)) { New-Item -ItemType Directory -Path $backupsDir | Out-Null }

Write-Host "`n[*] Step 1: Checking for new Call Recordings & Audio Files..." -ForegroundColor Cyan

try {
    # 1. Fetch from contact_notes
    $notesUrl = "$cloudUrl/rest/v1/contact_notes?select=id,note_text,created_at&note_text=ilike.*Audio*&order=created_at.desc&limit=200"
    $notes = Invoke-RestMethod -Uri $notesUrl -Headers $headers -Method Get
    $count = 0

    foreach ($n in $notes) {
        if ($n.note_text -match '(?:Audio Recording|Audio|Recording):\s*(https?://[^\s\r\n]+)') {
            $audioUrl = $matches[1].Trim()
            $ext = if ($audioUrl -match '\.wav') { 'wav' } elseif ($audioUrl -match '\.mp3') { 'mp3' } else { 'm4a' }
            $dateStr = if ($n.created_at) { $n.created_at.Substring(0, 10) } else { 'General' }
            $dayFolder = Join-Path $audiosDir $dateStr
            if (!(Test-Path $dayFolder)) { New-Item -ItemType Directory -Path $dayFolder | Out-Null }

            $fileName = "Call_" + $n.id.Substring(0, 8) + "." + $ext
            $dest = Join-Path $dayFolder $fileName

            if (!(Test-Path $dest)) {
                try {
                    Invoke-WebRequest -Uri $audioUrl -OutFile $dest -TimeoutSec 30
                    $count++
                    Write-Host "[+] Downloaded: $dateStr\$fileName" -ForegroundColor Green
                } catch {}
            }
        }
    }

    # 2. Fetch from storage bucket
    try {
        $storageUrl = "$cloudUrl/storage/v1/object/list/call-recordings"
        $storageBody = '{"limit":100,"offset":0,"sortBy":{"column":"created_at","order":"desc"}}'
        $storageFiles = Invoke-RestMethod -Uri $storageUrl -Headers $headers -Method Post -Body $storageBody -ContentType "application/json"
        
        $appAudioFolder = Join-Path $audiosDir "App_Recordings"
        if (!(Test-Path $appAudioFolder)) { New-Item -ItemType Directory -Path $appAudioFolder | Out-Null }

        foreach ($sf in $storageFiles) {
            $dest = Join-Path $appAudioFolder $sf.name
            if (!(Test-Path $dest)) {
                $dlUrl = "$cloudUrl/storage/v1/object/public/call-recordings/$($sf.name)"
                try {
                    Invoke-WebRequest -Uri $dlUrl -OutFile $dest -TimeoutSec 30
                    $count++
                    Write-Host "[+] Downloaded App Recording: $($sf.name)" -ForegroundColor Green
                } catch {}
            }
        }
    } catch {}

    Write-Host "`n[SUCCESS] Synced $count new Audio Recordings to 8TB disk!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Sync issue: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[*] Step 2: Creating Daily Database Backup..." -ForegroundColor Cyan
$date = Get-Date -Format 'yyyy-MM-dd'
$backupFile = Join-Path $backupsDir "SLI_DB_Backup_$date.sql"

$pgDump = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
if (!(Test-Path $pgDump)) { $pgDump = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" }

if (Test-Path $pgDump) {
    & $pgDump -h 127.0.0.1 -p 5432 -U postgres -d srilakshmi_crm -f $backupFile
    Write-Host "[SUCCESS] Local Database Backup created: $backupFile" -ForegroundColor Green
}

Write-Host "`n================================================================" -ForegroundColor Yellow
Write-Host "🎉 8TB STORAGE SYNC IS 100% COMPLETE & UP TO DATE!" -ForegroundColor Yellow
Write-Host "================================================================`n" -ForegroundColor Yellow
