@echo off
title Sri Lakshmi Industries - Secure Server Tunnel
color 0A
cd /d "C:\SLICRMDATA"

echo ================================================================
echo    SRI LAKSHMI INDUSTRIES - 100%% SECURE CLOUDFLARE TUNNEL
echo ================================================================
echo [*] Tunneling HTTP Backend on Port 8080...
echo.

"C:\SLICRMDATA\cloudflared.exe" tunnel --url http://127.0.0.1:8080

pause
