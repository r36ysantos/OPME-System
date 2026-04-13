@echo off
:: ============================================================
::  OPME System — Instalador Windows
::  Duplo clique para instalar
:: ============================================================

title OPME System - Instalador

:: Verifica privilégios de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  Este instalador precisa ser executado como Administrador.
    echo  Clique com o botao direito e selecione "Executar como administrador"
    echo.
    pause
    exit /b 1
)

:: Define o diretório raiz (pasta pai do installer)
cd /d "%~dp0"
cd ..
set ROOT_DIR=%CD%

echo.
echo  Iniciando instalacao do OPME System...
echo  Isso pode levar alguns minutos.
echo.

:: Executa o PowerShell com política de execução temporária
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"

if %errorLevel% neq 0 (
    echo.
    echo  A instalacao falhou. Verifique o arquivo installer\install.log
    echo.
    pause
    exit /b 1
)
