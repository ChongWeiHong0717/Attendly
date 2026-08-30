@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo Attendly - FRESH INSTALL Setup
echo ========================================
echo.
echo WARNING: This path runs the development seed routine.
echo If you already have the website database/data, CLOSE this window and use:
echo   upgrade-existing-database.bat
echo.
choice /C YN /N /M "Continue with a fresh/demo setup? [Y/N]: "
if errorlevel 2 exit /b 0

echo.
where node >nul 2>&1 || (echo Node.js is not installed. Install Node.js 22 LTS first. & pause & exit /b 1)
if not exist backend\.env copy backend\.env.example backend\.env >nul
call npm run setup
if errorlevel 1 (
  echo.
  echo SETUP FAILED.
  echo Make sure XAMPP MySQL is running, then check backend\.env.
  pause
  exit /b 1
)
echo.
echo Setup complete.
echo Run start-windows.bat, start-desktop-windows.bat, or start-all-windows.bat.
pause
