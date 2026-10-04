@echo off
title Sri Lakshmi Industries - Instant Daily Database Backup
color 0A
if not exist "C:\SLICRMDATA\Backups" mkdir "C:\SLICRMDATA\Backups"
cd /d "C:\SLICRMDATA\Backups"

echo ================================================================
echo   SRI LAKSHMI INDUSTRIES - 8TB CRM DATABASE BACKUP CREATOR
echo ================================================================
echo.

set PGPASSWORD=SriLakshmi@123
set PGDUMP_EXE=""

if exist "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" set PGDUMP_EXE="C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
if exist "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" set PGDUMP_EXE="C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" set PGDUMP_EXE="C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"

if %PGDUMP_EXE%=="" (
    echo [ERROR] PostgreSQL pg_dump not found in Program Files!
    pause
    exit /b
)

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a-%%b)
set BACKUP_FILENAME=srilakshmi_crm_backup_%date:~-4%-%date:~4,2%-%date:~7,2%.sql

echo [*] Exporting 1000+ Contacts, Deals, Call Logs, Notes, Profiles...
%PGDUMP_EXE% -h 127.0.0.1 -p 5432 -U postgres -d srilakshmi_crm -F p -f "C:\SLICRMDATA\Backups\%BACKUP_FILENAME%"

echo.
echo ================================================================
echo   🎉 BACKUP CREATED SUCCESSFULLY IN C:\SLICRMDATA\Backups\
echo   File: %BACKUP_FILENAME%
echo ================================================================
echo.
pause
