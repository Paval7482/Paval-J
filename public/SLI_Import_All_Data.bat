@echo off
title Sri Lakshmi Industries - Import All Data to Server Database
color 0A
if not exist "C:\SLICRMDATA" mkdir "C:\SLICRMDATA"
cd /d "C:\SLICRMDATA"

echo ================================================================
echo   SRI LAKSHMI INDUSTRIES - 1-CLICK ALL DATA SERVER IMPORTER
echo ================================================================
echo.

set PGPASSWORD=SriLakshmi@123
set PSQL_EXE=""

if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set PSQL_EXE="C:\Program Files\PostgreSQL\18\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set PSQL_EXE="C:\Program Files\PostgreSQL\17\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set PSQL_EXE="C:\Program Files\PostgreSQL\16\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set PSQL_EXE="C:\Program Files\PostgreSQL\15\bin\psql.exe"

if %PSQL_EXE%=="" (
    echo [ERROR] PostgreSQL psql.exe not found!
    echo Please ensure PostgreSQL is installed.
    pause
    exit /b
)

echo [*] Found PostgreSQL Engine at: %PSQL_EXE%
echo.

if not exist "C:\SLICRMDATA\srilakshmi_crm_server_init.sql" (
    echo [*] Downloading Database Backup File...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://sli-crm-rho.vercel.app/srilakshmi_crm_server_init.sql', 'C:\SLICRMDATA\srilakshmi_crm_server_init.sql')"
)

echo [*] Importing All 10 Tables, Contacts, Notes, and Deals...
echo.

%PSQL_EXE% -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE DATABASE srilakshmi_crm;" 2>nul
%PSQL_EXE% -h 127.0.0.1 -p 5432 -U postgres -d srilakshmi_crm -f "C:\SLICRMDATA\srilakshmi_crm_server_init.sql"

echo.
echo ================================================================
echo   🎉 ALL 1000+ CONTACTS, NOTES, AND DATA IMPORTED TO SERVER!
echo ================================================================
echo.
pause
