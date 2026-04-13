@echo off
:: ============================================================
::  OPME System — Verificador de pré-requisitos
::  Execute ANTES de instalar para checar se tudo está ok
:: ============================================================

title OPME System - Verificacao de Requisitos
color 0B

echo.
echo ============================================================
echo   OPME System - Verificacao de Pre-requisitos
echo ============================================================
echo.

set ERRORS=0
set WARNINGS=0

:: ── Versão do Windows ─────────────────────────────────────────

echo [1/6] Verificando versao do Windows...
for /f "tokens=4-5 delims=. " %%i in ('ver') do set VERSION=%%i.%%j
if "%VERSION%" geq "10.0" (
    echo   OK  Windows 10 ou superior detectado: %VERSION%
) else (
    echo   ERRO  Windows 10 ou superior necessario. Versao detectada: %VERSION%
    set /a ERRORS+=1
)
echo.

:: ── Docker ────────────────────────────────────────────────────

echo [2/6] Verificando Docker Desktop...
docker --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('docker --version') do echo   OK  %%i
) else (
    echo   AVISO  Docker Desktop nao encontrado.
    echo          Baixe em: https://www.docker.com/products/docker-desktop
    set /a WARNINGS+=1
)
echo.

:: ── Docker em execução ────────────────────────────────────────

echo [3/6] Verificando se Docker esta rodando...
docker info >nul 2>&1
if %errorLevel% equ 0 (
    echo   OK  Docker Engine esta em execucao
) else (
    echo   AVISO  Docker Desktop nao esta em execucao.
    echo          Abra o Docker Desktop antes de instalar.
    set /a WARNINGS+=1
)
echo.

:: ── RAM ───────────────────────────────────────────────────────

echo [4/6] Verificando memoria RAM...
for /f "skip=1 tokens=*" %%a in ('wmic ComputerSystem get TotalPhysicalMemory') do (
    set RAM_BYTES=%%a
    goto :check_ram
)
:check_ram
:: Converte para GB (aproximado)
powershell -Command "$ram=[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB,1); if($ram -ge 4){Write-Host '  OK  RAM disponivel: ' $ram 'GB'}else{Write-Host '  AVISO  RAM: ' $ram 'GB (minimo recomendado: 4GB)'}" 2>nul
echo.

:: ── Portas ────────────────────────────────────────────────────

echo [5/6] Verificando portas necessarias...
set PORTS_OK=1

for %%p in (5173 3001 5432 6379) do (
    netstat -an | find ":%%p " | find "LISTENING" >nul 2>&1
    if %errorLevel% equ 0 (
        echo   AVISO  Porta %%p esta em uso
        set PORTS_OK=0
        set /a WARNINGS+=1
    ) else (
        echo   OK  Porta %%p disponivel
    )
)
echo.

:: ── Espaço em disco ───────────────────────────────────────────

echo [6/6] Verificando espaco em disco...
powershell -Command "$drive=(Get-Location).Drive.Name+':'; $free=[math]::Round((Get-PSDrive $drive.TrimEnd(':')).Free/1GB,1); if($free -ge 10){Write-Host '  OK  Espaco livre: ' $free 'GB'}else{Write-Host '  AVISO  Espaco livre: ' $free 'GB (minimo: 10GB)'}" 2>nul
echo.

:: ── Resultado ─────────────────────────────────────────────────

echo ============================================================
if %ERRORS% gtr 0 (
    color 0C
    echo   RESULTADO: %ERRORS% ERRO(S) encontrado(s).
    echo   Corrija os erros acima antes de instalar.
) else if %WARNINGS% gtr 0 (
    color 0E
    echo   RESULTADO: %WARNINGS% AVISO(S). Verifique antes de continuar.
) else (
    color 0A
    echo   RESULTADO: Tudo OK! Pronto para instalar.
    echo   Execute INSTALAR.bat para continuar.
)
echo ============================================================
echo.
pause
