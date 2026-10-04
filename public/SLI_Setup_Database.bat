@echo off
title Sri Lakshmi Industries - CRM Database Native Installer
color 0A
cd /d "C:\SLICRMDATA"

echo ================================================================
echo   SRI LAKSHMI INDUSTRIES - 1-CLICK SERVER DATABASE CREATOR
echo ================================================================
echo.

set PSQL_PATH=""

if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set PSQL_PATH="C:\Program Files\PostgreSQL\17\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set PSQL_PATH="C:\Program Files\PostgreSQL\16\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set PSQL_PATH="C:\Program Files\PostgreSQL\15\bin\psql.exe"

if %PSQL_PATH%=="" (
    echo [ERROR] PostgreSQL psql.exe not found in Program Files!
    echo Please check if PostgreSQL is installed.
    pause
    exit /b
)

echo [*] Found PostgreSQL Engine at: %PSQL_PATH%
echo [*] Importing All 10 Tables, Contacts, Notes and Profiles...
echo.

%PSQL_PATH% -h 127.0.0.1 -p 5432 -U postgres -d srilakshmi_crm -f "C:\SLICRMDATA\srilakshmi_crm_server_init.sql"

echo.
echo ================================================================
echo   🎉 ALL TABLES AND DATA IMPORTED TO LOCAL 8TB POSTGRESQL!
echo ================================================================
echo.
echo Press any key to exit...
pause >nul
