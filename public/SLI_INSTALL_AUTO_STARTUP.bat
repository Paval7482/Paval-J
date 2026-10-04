@echo off
title Sri Lakshmi Industries - Install 24/7 Silent Background Service
color 0A
if not exist "C:\SLICRMDATA" mkdir "C:\SLICRMDATA"
cd /d "C:\SLICRMDATA"

echo ================================================================
echo   SRI LAKSHMI INDUSTRIES - 24/7 BACKGROUND SERVICE INSTALLER
echo ================================================================
echo.

echo [*] Setting up Silent 24/7 Server Engine...

:: Copy silent runner
if not exist "C:\SLICRMDATA\sli_silent_runner.vbs" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://sli-crm-rho.vercel.app/sli_silent_runner.vbs', 'C:\SLICRMDATA\sli_silent_runner.vbs')" 2>nul
)

:: Add to Windows User Startup Folder
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
echo Set WshShell = CreateObject("WScript.Shell") > "%STARTUP_DIR%\SLI_AutoStart.vbs"
echo WshShell.CurrentDirectory = "C:\SLICRMDATA" >> "%STARTUP_DIR%\SLI_AutoStart.vbs"
echo WshShell.Run "wscript.exe ""C:\SLICRMDATA\sli_silent_runner.vbs""", 0, False >> "%STARTUP_DIR%\SLI_AutoStart.vbs"

:: Register in Windows Task Scheduler for on-boot auto execution
schtasks /create /tn "SLI_Master_CRM_Service" /tr "wscript.exe C:\SLICRMDATA\sli_silent_runner.vbs" /sc onlogon /rl highest /f >nul 2>&1

echo [*] Starting Invisible Background Engine Right Now...
wscript.exe "C:\SLICRMDATA\sli_silent_runner.vbs"

echo.
echo ================================================================
echo   🎉 24/7 SILENT BACKGROUND SERVICE INSTALLED & RUNNING!
echo ================================================================
echo [*] Black windows ethuvum open aagadhu (100%% Silent).
echo [*] System restarts / Power cut aanaalum automatic-ah On aagidum!
echo [*] Audio & Database processing 24/7 automatic-ah nadakkum.
echo.
pause
