@echo off
cd /d "%~dp0"
echo Starting Attendly API + Windows desktop app...
echo.
call npm run dev:desktop
pause
