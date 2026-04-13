@echo off
:: ============================================================
::  OPME System — Diagnóstico pós-instalação
::  Execute se o sistema não estiver respondendo
:: ============================================================

title OPME System - Diagnostico
color 0B

echo.
echo ============================================================
echo   OPME System - Diagnostico do Sistema
echo   %DATE% %TIME%
echo ============================================================
echo.

echo [STATUS DOS CONTAINERS]
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>nul
echo.

echo [LOGS DO BACKEND (ultimas 20 linhas)]
docker logs opme_backend --tail 20 2>nul
echo.

echo [LOGS DO FRONTEND (ultimas 10 linhas)]
docker logs opme_frontend --tail 10 2>nul
echo.

echo [LOGS DO BANCO (ultimas 10 linhas)]
docker logs opme_postgres --tail 10 2>nul
echo.

echo [TESTE DE CONECTIVIDADE]
curl -s -o nul -w "Backend API (/health): HTTP %%{http_code}\n" http://localhost:3001/health 2>nul || echo Backend nao responde
curl -s -o nul -w "Frontend:              HTTP %%{http_code}\n" http://localhost:5173 2>nul || echo Frontend nao responde
echo.

echo [PORTAS EM USO]
netstat -an | findstr ":5173 :3001 :5432 :6379"
echo.

echo ============================================================
echo  Se houver erros, execute:
echo    docker compose restart
echo  Ou para reconstruir tudo:
echo    docker compose down ^&^& docker compose up --build -d
echo ============================================================
echo.
pause
