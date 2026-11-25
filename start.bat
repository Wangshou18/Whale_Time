@echo off
setlocal EnableDelayedExpansion
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

rem ------------------------------------------------------------
rem  1. Pick a Node.js >= 18 (Vite 6 refuses older runtimes)
rem ------------------------------------------------------------
set "NODE_EXE="
set "NODE_VER="

call :probe_from_path
if not defined NODE_EXE call :probe_known_locations
if not defined NODE_EXE goto :no_node

echo [INFO] Node : !NODE_VER!  (!NODE_EXE!)
echo.

rem 系统命令一律用绝对路径，避免 PATH 被改坏时连带失败
set "SYS32=%SystemRoot%\System32"
if not exist "%SYS32%\netstat.exe" set "SYS32=C:\Windows\System32"

rem ------------------------------------------------------------
rem  2. Server already running? Only open the browser.
rem ------------------------------------------------------------
"%SYS32%\netstat.exe" -ano | "%SYS32%\findstr.exe" :5173 | "%SYS32%\findstr.exe" LISTENING >nul
if not errorlevel 1 (
  echo [INFO] The server is already running.
  echo [INFO] Opening http://127.0.0.1:5173/ ...
  start "" "http://127.0.0.1:5173/"
  "%SYS32%\timeout.exe" /t 2 >nul
  exit /b 0
)

rem ------------------------------------------------------------
rem  3. First run: install dependencies
rem ------------------------------------------------------------
if not exist "node_modules\vite\bin\vite.js" (
  echo [INFO] First run detected: installing dependencies, please wait...
  call :install_deps
  if errorlevel 1 goto :install_failed
  echo.
)

rem ------------------------------------------------------------
rem  4. Start Vite with the node we picked (never npm's node)
rem ------------------------------------------------------------
echo [INFO] Starting local server. Keep this window open.
echo [INFO] Press Ctrl+C or close this window to stop.
echo.

"!NODE_EXE!" "node_modules\vite\bin\vite.js" --open

echo.
echo [INFO] Server stopped.
pause
exit /b 0

rem ============================================================
rem  Subroutines
rem ============================================================

:probe_from_path
for /f "delims=" %%P in ('"%SYS32%\where.exe" node 2^>nul') do (
  if not defined NODE_EXE call :probe "%%P"
)
exit /b 0

:probe_known_locations
rem nvm for Windows versions
for %%R in ("%APPDATA%\nvm" "%LOCALAPPDATA%\nvm" "%ProgramFiles%\nvm") do (
  for /d %%V in ("%%~R\v*") do (
    if not defined NODE_EXE call :probe "%%~V\node.exe"
  )
)
rem standard installers
if not defined NODE_EXE call :probe "%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE call :probe "%LOCALAPPDATA%\Programs\nodejs\node.exe"
rem fallback: the runtime bundled with this workspace
for /d %%V in ("%USERPROFILE%\.workbuddy\binaries\node\versions\*") do (
  if not defined NODE_EXE call :probe "%%~V\node.exe"
)
exit /b 0

:probe
set "CAND=%~1"
if not exist "!CAND!" exit /b 0
set "V="
for /f "delims=" %%v in ('"!CAND!" -v 2^>nul') do set "V=%%v"
if not defined V exit /b 0
set "V=!V:v=!"
set "V=!V: =!"
set "MAJOR="
for /f "tokens=1 delims=." %%m in ("!V!") do set "MAJOR=%%m"
if not defined MAJOR exit /b 0
if !MAJOR! LSS 18 exit /b 0
set "NODE_EXE=!CAND!"
set "NODE_VER=v!V!"
exit /b 0

:install_deps
for %%D in ("!NODE_EXE!") do set "NODE_DIR=%%~dpD"
if not exist "!NODE_DIR!node_modules\npm\bin\npm-cli.js" goto :install_deps_path_npm
"!NODE_EXE!" "!NODE_DIR!node_modules\npm\bin\npm-cli.js" install
exit /b !errorlevel!

:install_deps_path_npm
call npm install
exit /b !errorlevel!

:no_node
echo [ERROR] No Node.js 18 or newer found.
echo.
echo   This machine resolves "node" to a version older than 18,
echo   and Vite 6 cannot run on it.
echo.
"%SYS32%\where.exe" node 2>nul
echo.
echo   Fix it in either way:
echo     1) Install LTS from https://nodejs.org  (recommended)
echo     2) If you use nvm-windows:
echo          nvm install 22
echo          nvm use 22
echo.
pause
exit /b 1

:install_failed
echo.
echo [ERROR] npm install failed. Check your network and try again.
echo.
pause
exit /b 1
