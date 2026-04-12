@echo off
echo Parando o OPME System...
cd /d "%~dp0"
docker-compose down
echo Sistema parado.
pause
