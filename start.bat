@echo off
echo ========================================
echo    OPME System - Iniciando servicos
echo ========================================
echo.

echo [1/3] Iniciando banco de dados (Docker)...
docker-compose up -d
timeout /t 3 /nobreak > nul

echo [2/3] Iniciando Backend (porta 3001)...
start "OPME Backend" cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak > nul

echo [3/3] Iniciando Frontend (porta 5173)...
start "OPME Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo  Sistema iniciado!
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:3001
echo  API Docs: http://localhost:3001/health
echo ========================================
echo.
pause
