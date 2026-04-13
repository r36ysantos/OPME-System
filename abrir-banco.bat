@echo off
title SGP - Ferramentas do Banco de Dados
color 0B
cd /d "%~dp0"

echo.
echo  ============================================================
echo    SGP - Ferramentas de Acesso ao Banco de Dados
echo  ============================================================
echo.
echo  Escolha uma opcao:
echo.
echo  [1] Adminer       - Interface leve (recomendado para consultas rapidas)
echo  [2] pgAdmin 4     - Interface profissional completa
echo  [3] Prisma Studio - Visualizador dos modelos do SGP
echo  [4] Abrir todos
echo  [0] Sair
echo.
set /p opcao="  Digite a opcao: "

if "%opcao%"=="1" goto adminer
if "%opcao%"=="2" goto pgadmin
if "%opcao%"=="3" goto prisma
if "%opcao%"=="4" goto todos
if "%opcao%"=="0" exit /b 0
goto sair

:adminer
echo.
echo  Abrindo Adminer em http://localhost:8080
echo.
echo  Use as credenciais:
echo    Sistema:  PostgreSQL
echo    Servidor: postgres
echo    Usuario:  sgp_user
echo    Senha:    sgp_pass123
echo    Banco:    sgp_db
echo.
start http://localhost:8080
pause
exit /b 0

:pgadmin
echo.
echo  Abrindo pgAdmin 4 em http://localhost:5050
echo.
echo  Use as credenciais:
echo    Email:  admin@sgp.com
echo    Senha:  admin123
echo.
echo  O banco SGP ja estara pre-configurado automaticamente.
echo.
start http://localhost:5050
pause
exit /b 0

:prisma
echo.
echo  Iniciando Prisma Studio (pode demorar alguns segundos)...
echo  Acesse em: http://localhost:5555
echo.
docker exec -d sgp_backend sh -c "npx prisma studio --port 5555 --browser none" 2>nul
timeout /t 4 /nobreak > nul
start http://localhost:5555
pause
exit /b 0

:todos
echo.
echo  Abrindo todas as ferramentas...
start http://localhost:8080
timeout /t 2 /nobreak > nul
start http://localhost:5050
timeout /t 2 /nobreak > nul
docker exec -d sgp_backend sh -c "npx prisma studio --port 5555 --browser none" 2>nul
timeout /t 4 /nobreak > nul
start http://localhost:5555
echo.
echo  Todas as ferramentas abertas!
pause
exit /b 0

:sair
echo  Opcao invalida.
pause
