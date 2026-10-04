@echo off
title Sri Lakshmi Industries - Master 8TB Live CRM Server
color 0A
if not exist "C:\SLICRMDATA" mkdir "C:\SLICRMDATA"
cd /d "C:\SLICRMDATA"

echo ================================================================
echo   SRI LAKSHMI INDUSTRIES - 8TB MASTER LIVE CRM SERVER
echo ================================================================
echo [*] Working Directory: C:\SLICRMDATA
echo [*] Local Database: PostgreSQL (srilakshmi_crm)
echo [*] Audio Storage: C:\SLICRMDATA\Audios (8TB Disk)
echo.

echo [*] Starting SLI Master 8TB API Server on Port 8080...
start "SLI 8TB Server Backend" "C:\SLICRMDATA\node.exe" "C:\SLICRMDATA\sli_server_hub_bundle.js"

timeout /t 3 /nobreak >nul

echo.
echo ================================================================
echo   [SUCCESS] MASTER 8TB SERVER RUNNING ON PORT 8080!
echo   STARTING 100 PERCENT ZERO-TRUST ENCRYPTED SECURITY TUNNEL...
echo ================================================================
echo.

"C:\SLICRMDATA\cloudflared.exe" tunnel --url http://127.0.0.1:8080

pause
