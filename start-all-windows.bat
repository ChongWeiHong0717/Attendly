@echo off
cd /d "%~dp0"
echo Starting Attendly API + website + Windows desktop app...
echo.
call npm run dev:all
pause
