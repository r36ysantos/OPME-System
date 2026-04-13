# OPME System — Pacote de Instalação Windows

Instalação automatizada **zero-config** para Windows 10/11.
Toda a infraestrutura roda em Docker — sem instalar Node.js, PostgreSQL
ou Redis manualmente.

---

## 📁 Estrutura desta pasta

```
installer/
├── INSTALAR.bat              ← Execute este para instalar
├── DESINSTALAR.bat           ← Remove o sistema completamente
├── verificar-requisitos.bat  ← Cheque antes de instalar
├── diagnostico.bat           ← Execute se algo não funcionar
├── install.ps1               ← Script PowerShell (chamado pelo .bat)
├── uninstall.ps1             ← Script de remoção (chamado pelo .bat)
└── README.md                 ← Este arquivo
```

---

## ✅ Pré-requisitos

| Requisito | Versão mínima | Como verificar |
|---|---|---|
| Windows | 10 ou 11 | `winver` no menu Iniciar |
| Docker Desktop | Qualquer versão atual | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| RAM | 4 GB livres | Gerenciador de Tarefas |
| Espaço em disco | 10 GB livres | Explorador de Arquivos |

> **Dica:** Execute `verificar-requisitos.bat` antes de instalar — ele checa tudo automaticamente.

---

## 🚀 Instalação passo a passo

### Passo 1 — Instale o Docker Desktop

1. Acesse [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Baixe e instale o **Docker Desktop para Windows**
3. **Reinicie o computador** após a instalação
4. Abra o Docker Desktop e aguarde aparecer **"Engine running"**

### Passo 2 — Verifique os pré-requisitos

Clique duas vezes em `verificar-requisitos.bat` e confirme que tudo está OK.

### Passo 3 — Execute o instalador

1. Clique com o botão **direito** em `INSTALAR.bat`
2. Selecione **"Executar como administrador"**
3. Siga as instruções na tela

O instalador vai:
- ✅ Verificar pré-requisitos do sistema
- ✅ Perguntar a porta desejada (padrão: 5173)
- ✅ Gerar senhas seguras automaticamente
- ✅ Baixar e compilar o sistema (~5-10 min na 1ª vez)
- ✅ Configurar o banco de dados
- ✅ Criar atalhos na área de trabalho
- ✅ Abrir o sistema no navegador

### Passo 4 — Acesse o sistema

Após a instalação, o navegador abrirá automaticamente:

```
URL:   http://localhost:5173
Login: admin@opme.com
Senha: admin123
```

> ⚠️ **Altere a senha do administrador** no primeiro acesso!

---

## 🔄 Operações do dia a dia

### Iniciar o sistema
```
Clique duas vezes em:  iniciar.bat
Ou use o atalho:       "Iniciar OPME System" na área de trabalho
```

### Parar o sistema
```
Clique duas vezes em:  parar.bat
```

### Verificar se está funcionando
```
Execute:  diagnostico.bat
```

### Atualizar para nova versão
```
1. Pare o sistema (parar.bat)
2. Substitua os arquivos do sistema pela nova versão
3. Execute: iniciar.bat
```

---

## 🗑️ Desinstalação

1. Clique com o botão **direito** em `DESINSTALAR.bat`
2. Selecione **"Executar como administrador"**
3. Escolha se deseja fazer **backup antes de remover** (recomendado)
4. Confirme digitando `DESINSTALAR`

O desinstalador remove:
- ✅ Todos os containers Docker
- ✅ Dados do banco (opcional — com backup)
- ✅ Imagens Docker (opcional — libera espaço)
- ✅ Atalhos da área de trabalho
- ✅ Arquivos de configuração (.env)
- ✅ Logs do sistema

---

## 🔧 Solução de problemas

### O sistema não abre no navegador

```
1. Execute diagnostico.bat
2. Se containers parados: execute iniciar.bat
3. Se erro no backend: docker compose logs backend
```

### "Porta em uso" durante instalação

```
# Descubra qual processo usa a porta (ex: 5173)
netstat -ano | findstr :5173

# Encerre o processo pelo PID encontrado
taskkill /PID <número> /F
```

### Erro "Docker não está rodando"

```
1. Abra o Docker Desktop
2. Aguarde o ícone na bandeja ficar verde
3. Execute o instalador novamente
```

### Reinstalação limpa

```
1. Execute DESINSTALAR.bat (com remoção de volumes)
2. Execute INSTALAR.bat
```

---

## 📂 Arquivos importantes gerados

| Arquivo | Localização | Conteúdo |
|---|---|---|
| `.env` | `backend/.env` | Senhas e configurações — **não compartilhe!** |
| `install.log` | `installer/install.log` | Log completo da instalação |
| `uninstall.log` | `installer/uninstall.log` | Log da desinstalação |
| Backups | `backup_YYYYMMDD/` | Dump do banco + uploads |

---

## 🏗️ Arquitetura do sistema

```
┌─────────────────────────────────────────────────────┐
│                    Windows Host                      │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              Docker Desktop                  │   │
│  │                                              │   │
│  │  ┌─────────────┐    ┌─────────────────────┐ │   │
│  │  │  Frontend   │    │      Backend        │ │   │
│  │  │  React/Vite │◄──►│  Node.js/Express    │ │   │
│  │  │  porta 5173 │    │  Prisma ORM         │ │   │
│  │  │             │    │  porta 3001         │ │   │
│  │  └─────────────┘    └──────────┬──────────┘ │   │
│  │                                │            │   │
│  │  ┌─────────────┐    ┌──────────▼──────────┐ │   │
│  │  │    Redis    │    │     PostgreSQL 15    │ │   │
│  │  │   Cache     │    │    Banco de dados    │ │   │
│  │  │  porta 6379 │    │    porta 5432        │ │   │
│  │  └─────────────┘    └─────────────────────┘ │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 📞 Suporte

Em caso de problemas, compartilhe o arquivo `installer/install.log`
com o suporte técnico. Ele contém todas as informações de diagnóstico
necessárias (sem senhas).
