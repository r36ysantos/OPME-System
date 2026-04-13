@echo off
title OPME System - Parando...
color 0E
cd /d "%~dp0"

echo.
echo  ============================================================
echo    OPME System - Parando servicos
echo  ============================================================
echo.

docker info >nul 2>&1
if %errorLevel% neq 0 (
    echo  Docker nao esta rodando - nada a parar.
    pause
    exit /b 0
)

echo  Parando containers...
docker compose down

echo.
color 0A
echo  Sistema parado com sucesso.
echo  Para iniciar novamente, execute: iniciar.bat
echo.
pause
