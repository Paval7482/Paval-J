@echo off
title Sri Lakshmi Industries - Server Health Checker
color 0A
cd /d "C:\SLICRMDATA"

echo ================================================================
echo   SRI LAKSHMI INDUSTRIES - 8TB CRM SERVER HEALTH CHECK
echo ================================================================
echo.

"C:\SLICRMDATA\node.exe" -e "fetch('http://127.0.0.1:8080/health').then(r => r.json()).then(d => { console.log('[STATUS]   🟢 Master Server: ' + d.service); console.log('[DATABASE] 🟢 ' + d.database); console.log('[CONTACTS] 🟢 Total Contacts in Local DB: ' + d.totalContactsInLocalDB); console.log('[STORAGE]  🟢 8TB Audio Storage: ' + d.storagePath); console.log('\n[RESULT]   🎉 24/7 SERVER RUNNING HEALTHY IN BACKGROUND!'); }).catch(e => { console.log('[STATUS] 🔴 Server is not running. Please run SLI_INSTALL_AUTO_STARTUP.bat'); });"

echo.
pause
