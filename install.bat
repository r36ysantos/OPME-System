@echo off
echo ========================================
echo    OPME System - Instalacao inicial
echo ========================================
echo.

echo [1/5] Instalando dependencias do Backend...
cd backend
call npm install
cd ..

echo [2/5] Instalando dependencias do Frontend...
cd frontend
call npm install
cd ..

echo [3/5] Iniciando banco de dados (Docker)...
docker-compose up -d
timeout /t 5 /nobreak > nul

echo [4/5] Configurando banco de dados...
cd backend
call npx prisma generate
call npx prisma db push

echo [5/5] Populando dados iniciais...
call npm run db:seed
cd ..

echo.
echo ========================================
echo  Instalacao concluida!
echo  Execute start.bat para iniciar o sistema
echo ========================================
echo.
pause
