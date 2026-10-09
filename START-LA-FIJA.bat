@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias...
  call npm.cmd install || pause
)
echo.
echo La Fija inicia en: http://localhost:5173
call npm.cmd run dev -- --host 0.0.0.0
pause
