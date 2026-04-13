@echo off
:: ============================================================
::  OPME System — Desinstalador Windows
:: ============================================================

title OPME System - Desinstalador

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  Este desinstalador precisa ser executado como Administrador.
    echo  Clique com o botao direito e selecione "Executar como administrador"
    echo.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
