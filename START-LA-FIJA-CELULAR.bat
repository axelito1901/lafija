@echo off
cd /d "%~dp0"
if not exist node_modules call npm.cmd install
echo.
echo Abri en el celular la direccion "Network" que aparece abajo (empieza con https).
echo El navegador va a avisar que el certificado no es seguro: toca "Avanzado" y "Continuar". Es normal en pruebas.
echo.
call npm.cmd run celular
pause
