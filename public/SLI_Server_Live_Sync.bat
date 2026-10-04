@echo off
title Sri Lakshmi Industries - CRM Local Server Live Sync
color 0A
cd /d "C:\SLICRMDATA"

echo ================================================================
echo    SRI LAKSHMI INDUSTRIES - 8TB SERVER DATABASE & AUDIO SYNC
echo ================================================================
echo.
echo [*] Checking Environment & Folders...
if not exist "C:\SLICRMDATA\Audios" mkdir "C:\SLICRMDATA\Audios"
if not exist "C:\SLICRMDATA\Backups" mkdir "C:\SLICRMDATA\Backups"

echo [*] Starting Real-time Continuous Database & Audio Sync...
node server_sync.mjs

pause
