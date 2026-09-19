@echo off
cd /d d:\SLI\wacrm
set "PATH=C:\Program Files\nodejs;%PATH%"
echo ===================================================
echo   Starting Sri Lakshmi Industries CRM Server...
echo ===================================================
"C:\Program Files\nodejs\npm.cmd" run dev
pause
