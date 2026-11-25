@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Whale Time - Local

rem 系统命令一律用绝对路径，避免 PATH 被改坏时连带失败
set "SYS32=%SystemRoot%\System32"
if not exist "%SYS32%\netstat.exe" set "SYS32=C:\Windows\System32"

echo ============================================================
echo   Whale Time  .  personal work assistant
echo.
echo   Address : http://127.0.0.1:5173/
echo   This is the ONLY address you should use.
echo   Always open this URL, never another port or localhost.
echo ============================================================
echo.

rem ------------------------------------------------------------
rem  1. Pick Node for THIS project only
rem     The system default stays on whatever nvm has active;
rem     this script never relies on it. Version comes from .nvmrc.
rem ------------------------------------------------------------
set "NODE_EXE="
set "NODE_VER="
set "NVMBASE="
set "PIN_VER="
set "PIN_MAJOR="

if exist "%LOCALAPPDATA%\nvm" set "NVMBASE=%LOCALAPPDATA%\nvm"
if not defined NVMBASE if exist "%APPDATA%\nvm" set "NVMBASE=%APPDATA%\nvm"
if not defined NVMBASE if exist "%ProgramFiles%\nvm" set "NVMBASE=%ProgramFiles%\nvm"

rem read the pinned version, e.g. 22.20.0 in .nvmrc
if exist ".nvmrc" for /f "delims=" %%L in (.nvmrc) do (
  if not defined PIN_VER set "PIN_VER=%%L"
)
set "PIN_VER=!PIN_VER: =!"
if defined PIN_VER for /f "tokens=1 delims=." %%m in ("!PIN_VER!") do set "PIN_MAJOR=%%m"
if not defined PIN_MAJOR (
  set "PIN_MAJOR=22"
  set "PIN_VER=22"
)

rem 1a. exactly the pinned version inside nvm-windows
if defined NVMBASE if exist "!NVMBASE!\v!PIN_VER!\node.exe" set "NODE_EXE=!NVMBASE!\v!PIN_VER!\node.exe"

rem 1b. any other build of the same major version (newest first)
if not defined NODE_EXE call :probe_nvm_major

rem 1c. whatever "node" resolves to, if it is >= 18
if not defined NODE_EXE call :probe_from_path

rem 1d. any other nvm build >= 18
if not defined NODE_EXE call :probe_nvm_any

rem 1e. standard installers / bundled runtime
if not defined NODE_EXE call :probe_standard

if not defined NODE_EXE goto :no_node

rem re-read the version of the chosen binary
for /f "delims=" %%v in ('"!NODE_EXE!" -v 2^>nul') do set "NODE_VER=%%v"

echo [INFO] Pin  : v!PIN_VER!  (from .nvmrc, major !PIN_MAJOR!^)
echo [INFO] Node : !NODE_VER!  (!NODE_EXE!)
echo [INFO] Mode : project only (system default untouched)
echo.

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

:probe_nvm_major
if not defined NVMBASE exit /b 0
for /f "delims=" %%V in ('dir /b /ad /o-n "!NVMBASE!\v!PIN_MAJOR!.*" 2^>nul') do (
  if not defined NODE_EXE call :probe "!NVMBASE!\%%V\node.exe"
)
exit /b 0

:probe_nvm_any
if not defined NVMBASE exit /b 0
for /f "delims=" %%V in ('dir /b /ad /o-n "!NVMBASE!\v*" 2^>nul') do (
  if not defined NODE_EXE call :probe "!NVMBASE!\%%V\node.exe"
)
exit /b 0

:probe_from_path
for /f "delims=" %%P in ('"%SYS32%\where.exe" node 2^>nul') do (
  if not defined NODE_EXE call :probe "%%P"
)
exit /b 0

:probe_standard
if not defined NODE_EXE call :probe "%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE call :probe "%LOCALAPPDATA%\Programs\nodejs\node.exe"
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
echo [ERROR] No Node.js 18 or newer found, this project cannot start.
echo.
echo   The version pinned in .nvmrc is !PIN_VER! and it was not found.
echo   Your system default Node is free to stay on 16, but this project
echo   needs 18+ (Vite 6). Install the pinned one:
echo.
echo       nvm install !PIN_VER!
echo.
echo   Then double-click this file again. Do not run "nvm use" globally.
echo.
"%SYS32%\where.exe" node 2>nul
echo.
pause
exit /b 1

:install_failed
echo.
echo [ERROR] npm install failed. Check your network and try again.
echo.
pause
exit /b 1
