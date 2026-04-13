@echo off
title SGP - Parando...
color 0E
cd /d "%~dp0"

echo.
echo  ============================================================
echo    SGP - Sistema de Gerenciamento de Procedimentos
echo    Parando servicos...
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
echo  SGP parado com sucesso.
echo  Para iniciar novamente, execute: iniciar.bat
echo.
pause
