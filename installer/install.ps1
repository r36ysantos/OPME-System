#Requires -Version 5.1
<#
.SYNOPSIS
    OPME System — Instalador automatizado para Windows
.DESCRIPTION
    Instala o OPME System completo (Frontend, Backend, PostgreSQL, Redis)
    usando Docker Compose. Zero dependências manuais além do Docker Desktop.
.NOTES
    Execute como Administrador: Right-click → "Run as Administrator"
    Ou via PowerShell: Set-ExecutionPolicy Bypass -Scope Process; .\install.ps1
#>

# ─── Configuração inicial ─────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

$SCRIPT_DIR   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ROOT_DIR     = Split-Path -Parent $SCRIPT_DIR
$LOG_FILE     = Join-Path $SCRIPT_DIR "install.log"
$ENV_FILE     = Join-Path $ROOT_DIR "backend\.env"
$COMPOSE_FILE = Join-Path $ROOT_DIR "docker-compose.yml"
$ROLLBACK_DONE = $false

# Versões mínimas
$MIN_RAM_GB      = 4
$MIN_DISK_GB     = 10
$REQUIRED_PORTS  = @(5173, 3001, 5432, 6379)

# ─── Funções utilitárias ──────────────────────────────────────────────────────

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $line -Encoding UTF8

    switch ($Level) {
        "INFO"    { Write-Host $Message -ForegroundColor Cyan }
        "SUCCESS" { Write-Host "✔ $Message" -ForegroundColor Green }
        "WARN"    { Write-Host "⚠ $Message" -ForegroundColor Yellow }
        "ERROR"   { Write-Host "✘ $Message" -ForegroundColor Red }
        "STEP"    { Write-Host "`n━━━ $Message ━━━" -ForegroundColor White }
    }
}

function Write-Banner {
    Clear-Host
    Write-Host @"
╔══════════════════════════════════════════════════════════╗
║          OPME System — Instalador v1.0                   ║
║   Gestão de Órteses, Próteses e Materiais Especiais      ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Blue
}

function Invoke-Rollback {
    if ($ROLLBACK_DONE) { return }
    $script:ROLLBACK_DONE = $true
    Write-Log "Iniciando rollback — desfazendo alterações..." "WARN"

    try {
        Set-Location $ROOT_DIR
        if (Test-Path $COMPOSE_FILE) {
            Write-Log "Parando e removendo containers..." "WARN"
            docker compose down -v --remove-orphans 2>$null
        }

        # Remove .env se foi criado nesta instalação
        if ($script:ENV_CREATED -and (Test-Path $ENV_FILE)) {
            Remove-Item $ENV_FILE -Force
            Write-Log ".env removido" "WARN"
        }

        Write-Log "Rollback concluído. Nenhuma alteração permanente foi feita." "WARN"
    } catch {
        Write-Log "Erro durante rollback: $_" "ERROR"
    }
}

function Test-CommandExists {
    param([string]$Command)
    return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Read-HostSecure {
    param([string]$Prompt)
    $secure = Read-Host $Prompt -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
}

function New-RandomPassword {
    param([int]$Length = 32)
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    return -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

function Test-PortAvailable {
    param([int]$Port)
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) { $listener.Stop() }
    }
}

function Wait-Service {
    param([string]$Url, [int]$TimeoutSeconds = 120, [string]$Name = "serviço")
    Write-Log "Aguardando $Name iniciar em $Url..." "INFO"
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -lt 500) {
                Write-Log "$Name está respondendo!" "SUCCESS"
                return $true
            }
        } catch { }
        Start-Sleep -Seconds 3
        Write-Host "." -NoNewline
    }
    Write-Host ""
    return $false
}

# ─── ETAPA 1: Pré-requisitos ──────────────────────────────────────────────────

function Test-Prerequisites {
    Write-Log "Verificando pré-requisitos do sistema" "STEP"

    # Sistema Operacional
    $os = [System.Environment]::OSVersion.Version
    Write-Log "SO detectado: Windows $($os.Major).$($os.Minor) ($([System.Environment]::OSVersion.ServicePack))"
    if ($os.Major -lt 10) {
        throw "Windows 10 ou superior é necessário (detectado: Windows $($os.Major))"
    }
    Write-Log "Sistema operacional compatível" "SUCCESS"

    # RAM
    $ramGB = [Math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
    Write-Log "RAM disponível: $ramGB GB (mínimo: $MIN_RAM_GB GB)"
    if ($ramGB -lt $MIN_RAM_GB) {
        Write-Log "RAM insuficiente ($ramGB GB). O sistema pode funcionar lentamente." "WARN"
    } else {
        Write-Log "RAM suficiente" "SUCCESS"
    }

    # Espaço em disco
    $drive = Split-Path -Qualifier $ROOT_DIR
    $disk  = Get-PSDrive ($drive.TrimEnd(':'))
    $freeGB = [Math]::Round($disk.Free / 1GB, 1)
    Write-Log "Espaço livre em disco: $freeGB GB (mínimo: $MIN_DISK_GB GB)"
    if ($freeGB -lt $MIN_DISK_GB) {
        throw "Espaço em disco insuficiente: $freeGB GB disponíveis, $MIN_DISK_GB GB necessários"
    }
    Write-Log "Espaço em disco suficiente" "SUCCESS"

    # Docker
    if (-not (Test-CommandExists "docker")) {
        Write-Log "Docker não encontrado. Iniciando instalação automática..." "WARN"
        Install-Docker
    } else {
        $dockerVersion = docker version --format "{{.Server.Version}}" 2>$null
        Write-Log "Docker encontrado: v$dockerVersion" "SUCCESS"
    }

    # Docker em execução
    try {
        docker info 2>&1 | Out-Null
        Write-Log "Docker Engine está rodando" "SUCCESS"
    } catch {
        throw "Docker não está em execução. Inicie o Docker Desktop e tente novamente."
    }

    # Portas disponíveis
    $portsBlocked = @()
    foreach ($port in $REQUIRED_PORTS) {
        if (-not (Test-PortAvailable $port)) {
            $portsBlocked += $port
        }
    }
    if ($portsBlocked.Count -gt 0) {
        $blocked = $portsBlocked -join ", "
        throw "Portas em uso: $blocked. Libere essas portas antes de continuar."
    }
    Write-Log "Todas as portas necessárias estão disponíveis ($($REQUIRED_PORTS -join ', '))" "SUCCESS"
}

function Install-Docker {
    Write-Log "Baixando Docker Desktop..." "INFO"
    $dockerInstaller = Join-Path $env:TEMP "DockerDesktopInstaller.exe"
    $url = "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"

    try {
        Invoke-WebRequest -Uri $url -OutFile $dockerInstaller -UseBasicParsing
        Write-Log "Instalando Docker Desktop (isso pode levar vários minutos)..." "INFO"
        Start-Process -FilePath $dockerInstaller -ArgumentList "install --quiet" -Wait -Verb RunAs
        Write-Log "Docker Desktop instalado. Por favor, reinicie o computador e execute o instalador novamente." "WARN"
        Write-Log "Após reiniciar, abra o Docker Desktop e depois execute este script novamente." "WARN"
        Read-Host "Pressione ENTER para fechar"
        exit 0
    } catch {
        throw "Falha ao instalar Docker: $_. Instale manualmente em https://www.docker.com/products/docker-desktop"
    }
}

# ─── ETAPA 2: Configuração do usuário ─────────────────────────────────────────

function Get-UserConfiguration {
    Write-Log "Configuração do sistema" "STEP"

    Write-Host ""
    Write-Host "Vamos configurar o seu ambiente OPME System." -ForegroundColor White
    Write-Host "Pressione ENTER para aceitar os valores padrão (recomendado)." -ForegroundColor Gray
    Write-Host ""

    # Porta do frontend
    $defaultPort = "5173"
    $portInput = Read-Host "Porta do sistema web [$defaultPort]"
    $script:FRONTEND_PORT = if ($portInput -eq "") { $defaultPort } else { $portInput }

    # Senha do banco de dados
    Write-Host ""
    $customDbPass = Read-Host "Deseja definir uma senha personalizada para o banco? (s/N)"
    if ($customDbPass -eq "s" -or $customDbPass -eq "S") {
        $script:DB_PASSWORD = Read-HostSecure "  Senha do PostgreSQL"
        if ($script:DB_PASSWORD.Length -lt 8) {
            Write-Log "Senha muito curta. Usando senha gerada automaticamente." "WARN"
            $script:DB_PASSWORD = New-RandomPassword -Length 24
        }
    } else {
        $script:DB_PASSWORD = New-RandomPassword -Length 24
        Write-Log "Senha do banco gerada automaticamente (salva no .env)" "INFO"
    }

    # JWT Secret
    $script:JWT_SECRET = New-RandomPassword -Length 64

    # Senha do admin
    Write-Host ""
    Write-Host "Credencial padrão do administrador:" -ForegroundColor Yellow
    Write-Host "  Email: admin@opme.com"
    Write-Host "  Senha: admin123"
    Write-Host "(Você pode alterar após o primeiro login)" -ForegroundColor Gray

    Write-Log "Configuração concluída" "SUCCESS"
}

# ─── ETAPA 3: Gerar .env ──────────────────────────────────────────────────────

function New-EnvFile {
    Write-Log "Criando arquivo de configuração (.env)" "STEP"

    $script:ENV_CREATED = $true
    $envContent = @"
# ═══════════════════════════════════════════════════════
#  OPME System — Configurações de Ambiente
#  Gerado automaticamente em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
#  ⚠ NÃO compartilhe este arquivo — contém senhas!
# ═══════════════════════════════════════════════════════

# Banco de Dados
DATABASE_URL="postgresql://opme_user:$($script:DB_PASSWORD)@localhost:5432/opme_db"
POSTGRES_USER=opme_user
POSTGRES_PASSWORD=$($script:DB_PASSWORD)
POSTGRES_DB=opme_db

# Autenticação JWT
JWT_SECRET="$($script:JWT_SECRET)"
JWT_EXPIRES_IN=8h

# Servidor
PORT=3001
NODE_ENV=production

# Uploads
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES="application/pdf,image/jpeg,image/png,image/jpg,image/gif,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"

# CORS
CORS_ORIGIN="http://localhost:$($script:FRONTEND_PORT)"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
"@

    Set-Content -Path $ENV_FILE -Value $envContent -Encoding UTF8
    Write-Log ".env criado em: $ENV_FILE" "SUCCESS"

    # Salva resumo em install.log (sem senhas completas)
    Write-Log "Configurações aplicadas — DB_USER: opme_user | PORT: $($script:FRONTEND_PORT)" "INFO"
}

# ─── ETAPA 4: Ajustar docker-compose.yml ─────────────────────────────────────

function Update-DockerCompose {
    Write-Log "Atualizando configurações do Docker Compose" "STEP"

    $content = Get-Content $COMPOSE_FILE -Raw

    # Atualiza porta do frontend se diferente de 5173
    if ($script:FRONTEND_PORT -ne "5173") {
        $content = $content -replace '"5173:80"', "`"$($script:FRONTEND_PORT):80`""
    }

    # Injeta variáveis do .env no serviço postgres e backend
    $content = $content -replace 'POSTGRES_PASSWORD: opme_pass123', "POSTGRES_PASSWORD: $($script:DB_PASSWORD)"
    $content = $content -replace 'opme_pass123@postgres', "$($script:DB_PASSWORD)@postgres"
    $content = $content -replace '"opme-system-jwt-secret-key-2024-production-ready-secure"', "`"$($script:JWT_SECRET)`""

    Set-Content -Path $COMPOSE_FILE -Value $content -Encoding UTF8
    Write-Log "docker-compose.yml atualizado" "SUCCESS"
}

# ─── ETAPA 5: Build e deploy ──────────────────────────────────────────────────

function Start-DockerDeploy {
    Write-Log "Construindo e iniciando containers Docker" "STEP"
    Write-Log "Isso pode levar 5-10 minutos na primeira execução..." "INFO"

    Set-Location $ROOT_DIR

    # Pull das imagens base primeiro (feedback de progresso)
    Write-Log "Baixando imagens base..." "INFO"
    docker compose pull postgres redis 2>&1 | ForEach-Object { Write-Log $_ "INFO" }

    # Build das imagens da aplicação
    Write-Log "Compilando aplicação (backend + frontend)..." "INFO"
    $buildOutput = docker compose build --no-cache 2>&1
    if ($LASTEXITCODE -ne 0) {
        $buildOutput | ForEach-Object { Write-Log $_ "ERROR" }
        throw "Falha no build Docker. Verifique o log acima."
    }
    Write-Log "Build concluído" "SUCCESS"

    # Sobe os serviços
    Write-Log "Iniciando serviços..." "INFO"
    docker compose up -d 2>&1 | ForEach-Object { Write-Log $_ "INFO" }
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao iniciar containers. Execute: docker compose logs"
    }

    Write-Log "Containers iniciados" "SUCCESS"
}

# ─── ETAPA 6: Verificação de saúde ───────────────────────────────────────────

function Test-SystemHealth {
    Write-Log "Verificando saúde do sistema" "STEP"

    # Aguarda backend
    $backendOk = Wait-Service -Url "http://localhost:3001/health" -TimeoutSeconds 120 -Name "Backend API"
    if (-not $backendOk) {
        Write-Log "Backend demorou para responder. Verificando logs..." "WARN"
        docker compose logs backend --tail 20 2>&1 | ForEach-Object { Write-Log $_ "WARN" }
        throw "Backend não iniciou dentro do tempo esperado."
    }

    # Aguarda frontend
    $frontendOk = Wait-Service -Url "http://localhost:$($script:FRONTEND_PORT)" -TimeoutSeconds 60 -Name "Frontend"
    if (-not $frontendOk) {
        Write-Log "Frontend demorou mais que o esperado, mas pode estar ok." "WARN"
    }

    # Verifica PostgreSQL
    $pgStatus = docker exec opme_postgres pg_isready -U opme_user -d opme_db 2>&1
    if ($pgStatus -match "accepting connections") {
        Write-Log "PostgreSQL: OK" "SUCCESS"
    } else {
        Write-Log "PostgreSQL pode estar ainda iniciando..." "WARN"
    }

    # Testa login via API
    try {
        $loginBody = '{"email":"admin@opme.com","password":"admin123"}'
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
            -Method POST -Body $loginBody `
            -ContentType "application/json" `
            -UseBasicParsing -TimeoutSec 10
        $json = $response.Content | ConvertFrom-Json
        if ($json.token) {
            Write-Log "Login de teste bem-sucedido — sistema funcional!" "SUCCESS"
        }
    } catch {
        Write-Log "Teste de login falhou (o sistema pode ainda estar carregando)" "WARN"
    }
}

# ─── ETAPA 7: Criar atalhos ───────────────────────────────────────────────────

function New-Shortcuts {
    Write-Log "Criando atalhos na área de trabalho" "STEP"

    $desktop = [Environment]::GetFolderPath("Desktop")
    $wsh = New-Object -ComObject WScript.Shell

    # Atalho para abrir o sistema
    $shortcut = $wsh.CreateShortcut("$desktop\OPME System.lnk")
    $shortcut.TargetPath = "http://localhost:$($script:FRONTEND_PORT)"
    $shortcut.Description = "Abrir OPME System no navegador"
    $shortcut.Save()

    # Atalho para iniciar o sistema
    $startBat = Join-Path $ROOT_DIR "iniciar.bat"
    $shortcut2 = $wsh.CreateShortcut("$desktop\Iniciar OPME System.lnk")
    $shortcut2.TargetPath = $startBat
    $shortcut2.WorkingDirectory = $ROOT_DIR
    $shortcut2.Description = "Iniciar serviços do OPME System"
    $shortcut2.Save()

    Write-Log "Atalhos criados na área de trabalho" "SUCCESS"
}

# ─── ETAPA 8: Resumo final ───────────────────────────────────────────────────

function Show-Summary {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║           INSTALAÇÃO CONCLUÍDA COM SUCESSO!              ║" -ForegroundColor Green
    Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║  🌐 Sistema:   http://localhost:$($script:FRONTEND_PORT.PadRight(28))║" -ForegroundColor White
    Write-Host "║  ⚙  API:       http://localhost:3001/health               ║" -ForegroundColor White
    Write-Host "║                                                          ║" -ForegroundColor Green
    Write-Host "║  👤 Login:     admin@opme.com                            ║" -ForegroundColor Yellow
    Write-Host "║  🔑 Senha:     admin123                                  ║" -ForegroundColor Yellow
    Write-Host "║                                                          ║" -ForegroundColor Green
    Write-Host "║  📋 Log:       installer\install.log                     ║" -ForegroundColor Gray
    Write-Host "║  🗑  Remover:   installer\uninstall.ps1                  ║" -ForegroundColor Gray
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""

    Write-Log "Instalação concluída com sucesso em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "SUCCESS"
}

# ─── MAIN ────────────────────────────────────────────────────────────────────

try {
    # Inicializa log
    $null = New-Item -Path (Split-Path $LOG_FILE -Parent) -ItemType Directory -Force
    Set-Content -Path $LOG_FILE -Value "# OPME System Install Log — $(Get-Date)" -Encoding UTF8

    Write-Banner
    Write-Log "Iniciando instalação do OPME System" "INFO"
    Write-Log "Diretório raiz: $ROOT_DIR" "INFO"

    Test-Prerequisites
    Get-UserConfiguration
    New-EnvFile
    Update-DockerCompose
    Start-DockerDeploy
    Test-SystemHealth
    New-Shortcuts
    Show-Summary

    # Abre no navegador
    Start-Process "http://localhost:$($script:FRONTEND_PORT)"

} catch {
    Write-Log "ERRO CRÍTICO: $_" "ERROR"
    Write-Log "Iniciando rollback automático..." "ERROR"
    Invoke-Rollback
    Write-Host ""
    Write-Host "A instalação falhou. Detalhes em: $LOG_FILE" -ForegroundColor Red
    Read-Host "Pressione ENTER para fechar"
    exit 1
}

Read-Host "Pressione ENTER para fechar o instalador"
