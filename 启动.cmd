@echo off
setlocal
if exist "%~dp0runtime\node.exe" (
    "%~dp0runtime\node.exe" "%~dp0scripts\launch.cjs"
) else (
    node "%~dp0scripts\launch.cjs"
)
if errorlevel 1 (
    echo Unable to start. Use the portable download or install Node.js 22+.
    pause
)
