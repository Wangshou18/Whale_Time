@echo off
setlocal
cd /d "%~dp0"
title Whale Time - Local

echo ============================================================
echo   Whale Time  .  personal work assistant
echo.
echo   Address : http://127.0.0.1:5173/
echo   This is the ONLY address you should use.
echo   Always open this URL, never another port or localhost.
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  echo         Install Node.js 18 or newer first: https://nodejs.org
  echo.
  pause
  exit /b 1
)

netstat -ano | findstr :5173 | findstr LISTENING >nul
if not errorlevel 1 (
  echo [INFO] The server is already running.
  echo [INFO] Opening http://127.0.0.1:5173/ ...
  start "" "http://127.0.0.1:5173/"
  timeout /t 2 >nul
  exit /b 0
)

if not exist "node_modules" (
  echo [INFO] First run detected: installing dependencies, please wait...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. Check your network and try again.
    pause
    exit /b 1
  )
  echo.
)

echo [INFO] Starting local server. Keep this window open.
echo [INFO] Press Ctrl+C or close this window to stop.
echo.

call npm start

echo.
echo [INFO] Server stopped.
pause
