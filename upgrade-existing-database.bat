@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo Attendly - Existing Database Upgrade
 echo ========================================
echo.
echo This keeps your existing website database and adds the NFC tables/relations.
echo Make a MySQL backup first if this database contains important live data.
echo.
where node >nul 2>&1 || (echo Node.js is not installed. Install Node.js 22 LTS first. & pause & exit /b 1)
if not exist backend\.env copy backend\.env.example backend\.env >nul
call npm install
if errorlevel 1 goto :failed
call npm run db:update
if errorlevel 1 goto :failed
echo.
echo Database upgrade completed.
echo You can now run start-desktop-windows.bat or start-all-windows.bat.
pause
exit /b 0
:failed
echo.
echo UPGRADE FAILED.
echo Confirm MySQL is running and backend\.env points to the same database used by the website.
pause
exit /b 1
