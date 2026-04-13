#Requires -Version 5.1
<#
.SYNOPSIS
    SGP - Sistema de Gerenciamento de Procedimentos — Desinstalador para Windows
.DESCRIPTION
    Remove completamente o SGP - Sistema de Gerenciamento de Procedimentos, containers, imagens, volumes e dados.
    Oferece opção de backup antes da remoção.
#>

$ErrorActionPreference = "Stop"
$SCRIPT_DIR   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ROOT_DIR     = Split-Path -Parent $SCRIPT_DIR
$LOG_FILE     = Join-Path $SCRIPT_DIR "uninstall.log"
$BACKUP_DIR   = Join-Path $ROOT_DIR "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LOG_FILE -Value "[$timestamp] [$Level] $Message" -Encoding UTF8
    switch ($Level) {
        "INFO"    { Write-Host "  $Message" -ForegroundColor Cyan }
        "SUCCESS" { Write-Host "  ✔ $Message" -ForegroundColor Green }
        "WARN"    { Write-Host "  ⚠ $Message" -ForegroundColor Yellow }
        "ERROR"   { Write-Host "  ✘ $Message" -ForegroundColor Red }
        "STEP"    { Write-Host "`n━━━ $Message ━━━" -ForegroundColor White }
    }
}

# ─── Banner e confirmação ─────────────────────────────────────────────────────

Clear-Host
Write-Host @"
╔══════════════════════════════════════════════════════════╗
║         SGP - Sistema de Gerenciamento de Procedimentos — Desinstalador                      ║
║   ⚠  Esta ação removerá o sistema e todos os dados!      ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Red

Write-Host ""
$confirm = Read-Host "Tem certeza que deseja desinstalar? Digite 'DESINSTALAR' para confirmar"
if ($confirm -ne "DESINSTALAR") {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

Set-Content -Path $LOG_FILE -Value "# SGP - Sistema de Gerenciamento de Procedimentos Uninstall Log — $(Get-Date)" -Encoding UTF8
Write-Log "Desinstalação iniciada pelo usuário" "INFO"

# ─── ETAPA 1: Backup opcional ─────────────────────────────────────────────────

Write-Log "Opção de backup" "STEP"
$doBackup = Read-Host "Deseja fazer backup do banco de dados antes de remover? (S/n)"

if ($doBackup -ne "n" -and $doBackup -ne "N") {
    Write-Log "Criando backup em: $BACKUP_DIR" "INFO"
    $null = New-Item -Path $BACKUP_DIR -ItemType Directory -Force

    # Backup do PostgreSQL
    try {
        $pgRunning = docker ps --filter "name=sgp_postgres" --format "{{.Names}}" 2>$null
        if ($pgRunning -eq "sgp_postgres") {
            $dumpFile = Join-Path $BACKUP_DIR "opme_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
            docker exec sgp_postgres pg_dump -U sgp_user sgp_db | Set-Content -Path $dumpFile -Encoding UTF8
            Write-Log "Backup do banco salvo em: $dumpFile" "SUCCESS"

            # Backup dos arquivos de upload
            $uploadsPath = Join-Path $ROOT_DIR "backend\uploads"
            if (Test-Path $uploadsPath) {
                Copy-Item -Path $uploadsPath -Destination (Join-Path $BACKUP_DIR "uploads") -Recurse -Force
                Write-Log "Arquivos de upload copiados para backup" "SUCCESS"
            }

            # Backup do .env
            $envFile = Join-Path $ROOT_DIR "backend\.env"
            if (Test-Path $envFile) {
                Copy-Item -Path $envFile -Destination (Join-Path $BACKUP_DIR ".env.backup")
                Write-Log ".env copiado para backup" "SUCCESS"
            }

            Write-Log "Backup completo salvo em: $BACKUP_DIR" "SUCCESS"
        } else {
            Write-Log "Container do banco não está rodando — backup pulado" "WARN"
        }
    } catch {
        Write-Log "Falha no backup: $_" "WARN"
        Write-Log "Continuando desinstalação mesmo sem backup..." "WARN"
    }
}

# ─── ETAPA 2: Parar e remover containers ─────────────────────────────────────

Write-Log "Removendo containers e serviços Docker" "STEP"

Set-Location $ROOT_DIR

try {
    Write-Log "Parando containers em execução..." "INFO"
    docker compose down --remove-orphans 2>&1 | ForEach-Object { Write-Log $_ "INFO" }
    Write-Log "Containers parados" "SUCCESS"
} catch {
    Write-Log "Nenhum container em execução (ou Docker não disponível)" "WARN"
}

# ─── ETAPA 3: Remover volumes (dados do banco) ────────────────────────────────

Write-Log "Removendo dados do banco de dados" "STEP"
$removeVolumes = Read-Host "Remover TODOS os dados do banco permanentemente? (s/N)"

if ($removeVolumes -eq "s" -or $removeVolumes -eq "S") {
    try {
        docker compose down -v 2>&1 | Out-Null
        docker volume rm sgp_postgres_data 2>&1 | Out-Null
        Write-Log "Volumes e dados removidos" "SUCCESS"
    } catch {
        Write-Log "Volumes já removidos ou não encontrados" "WARN"
    }
} else {
    Write-Log "Dados do banco preservados (volumes Docker mantidos)" "INFO"
}

# ─── ETAPA 4: Remover imagens Docker ─────────────────────────────────────────

Write-Log "Removendo imagens Docker do SGP - Sistema de Gerenciamento de Procedimentos" "STEP"
$removeImages = Read-Host "Remover imagens Docker do sistema? (Libera espaço em disco) (S/n)"

if ($removeImages -ne "n" -and $removeImages -ne "N") {
    $images = @("sgp-frontend", "sgp-backend", "sgp_frontend", "sgp_backend")
    foreach ($img in $images) {
        try {
            docker rmi $img 2>&1 | Out-Null
            Write-Log "Imagem $img removida" "SUCCESS"
        } catch {
            Write-Log "Imagem $img não encontrada (já removida)" "INFO"
        }
    }
} else {
    Write-Log "Imagens Docker preservadas" "INFO"
}

# ─── ETAPA 5: Remover atalhos ─────────────────────────────────────────────────

Write-Log "Removendo atalhos da área de trabalho" "STEP"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcuts = @(
    "$desktop\SGP - Sistema de Gerenciamento de Procedimentos.lnk",
    "$desktop\Iniciar SGP - Sistema de Gerenciamento de Procedimentos.lnk"
)
foreach ($s in $shortcuts) {
    if (Test-Path $s) {
        Remove-Item $s -Force
        Write-Log "Atalho removido: $(Split-Path $s -Leaf)" "SUCCESS"
    }
}

# ─── ETAPA 6: Remover arquivos de configuração ───────────────────────────────

Write-Log "Limpando arquivos de configuração" "STEP"
$removeConfig = Read-Host "Remover arquivo .env com senhas e configurações? (S/n)"
if ($removeConfig -ne "n" -and $removeConfig -ne "N") {
    $envFile = Join-Path $ROOT_DIR "backend\.env"
    if (Test-Path $envFile) {
        Remove-Item $envFile -Force
        Write-Log ".env removido" "SUCCESS"
    }
}

# ─── ETAPA 7: Limpar logs ─────────────────────────────────────────────────────

$removeLogs = Read-Host "Remover arquivos de log do sistema? (s/N)"
if ($removeLogs -eq "s" -or $removeLogs -eq "S") {
    $logsPath = Join-Path $ROOT_DIR "backend\logs"
    if (Test-Path $logsPath) {
        Remove-Item $logsPath -Recurse -Force
        Write-Log "Logs removidos" "SUCCESS"
    }
}

# ─── Resumo ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         DESINSTALAÇÃO CONCLUÍDA COM SUCESSO!             ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
if (Test-Path $BACKUP_DIR) {
    Write-Host "║  💾 Backup salvo em:                                     ║" -ForegroundColor Yellow
    Write-Host "║     $($BACKUP_DIR.PadRight(52))║" -ForegroundColor Yellow
}
Write-Host "║                                                          ║" -ForegroundColor Green
Write-Host "║  O SGP - Sistema de Gerenciamento de Procedimentos foi removido completamente.               ║" -ForegroundColor White
Write-Host "║  Obrigado por usar o sistema!                            ║" -ForegroundColor White
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Log "Desinstalação concluída em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "SUCCESS"
Read-Host "Pressione ENTER para fechar"
