@echo off
setlocal
title L toolkit
cd /d "%~dp0"

rem Make sure common Node locations are on PATH
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed.
    echo Download it from https://nodejs.org and run this again.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo First run - installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo.
echo  L toolkit starting at http://localhost:3000
echo  Press Ctrl+C to stop the server.
echo.
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
node server.js

pause
