@echo off
title SGP - Iniciando...
color 0B
cd /d "%~dp0"

echo.
echo  ============================================================
echo    SGP - Sistema de Gerenciamento de Procedimentos
echo    Iniciando servicos...
echo  ============================================================
echo.

:: Verifica se Docker está rodando
docker info >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo  ERRO: Docker Desktop nao esta rodando!
    echo  Abra o Docker Desktop e aguarde o icone ficar verde.
    echo.
    pause
    exit /b 1
)

:: Verifica se já está rodando
docker ps --filter "name=sgp_frontend" --format "{{.Status}}" 2>nul | findstr "Up" >nul
if %errorLevel% equ 0 (
    color 0A
    echo  Sistema ja esta em execucao!
    echo.
    echo  ╔══════════════════════════════════════════════════════════╗
    echo  ║  SGP Sistema:  http://localhost:5173                     ║
    echo  ║  Adminer:      http://localhost:8080                     ║
    echo  ║  pgAdmin 4:    http://localhost:5050                     ║
    echo  ╚══════════════════════════════════════════════════════════╝
    echo.
    start http://localhost:5173
    pause
    exit /b 0
)

echo  Iniciando containers...
docker compose up -d

if %errorLevel% neq 0 (
    color 0C
    echo.
    echo  Erro ao iniciar. Tentando reconstruir...
    docker compose up --build -d
)

echo.
echo  Aguardando sistema iniciar (30 segundos)...
timeout /t 30 /nobreak > nul

color 0A
echo.
echo  ============================================================
echo    SGP iniciado com sucesso!
echo.
echo    SISTEMA PRINCIPAL
echo    Acesse:  http://localhost:5173
echo    Login:   admin@opme.com
echo    Senha:   admin123
echo.
echo    BANCO DE DADOS - ADMINER (leve)
echo    Acesse:  http://localhost:8080
echo    Servidor: postgres
echo    Usuario:  sgp_user
echo    Senha:    sgp_pass123
echo    Banco:    sgp_db
echo.
echo    BANCO DE DADOS - PGADMIN 4 (completo)
echo    Acesse:  http://localhost:5050
echo    Login:   admin@sgp.com
echo    Senha:   admin123
echo  ============================================================
echo.
start http://localhost:5173
pause
