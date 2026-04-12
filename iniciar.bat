@echo off
echo ========================================
echo    OPME System - Iniciando via Docker
echo ========================================
echo.

echo Construindo e iniciando todos os servicos...
echo (Primeira vez pode demorar 3-5 minutos)
echo.

cd /d "%~dp0"
docker-compose up --build -d

echo.
echo Aguardando servicos iniciarem...
timeout /t 15 /nobreak > nul

echo.
echo ========================================
echo  Sistema iniciado com sucesso!
echo  Acesse: http://localhost:5173
echo.
echo  Login: admin@opme.com
echo  Senha: admin123
echo ========================================
echo.
start http://localhost:5173
pause
