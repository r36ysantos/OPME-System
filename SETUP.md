# OPME System — Guia de Instalação

## Pré-requisitos

- Node.js 18+
- Docker + Docker Compose
- npm ou yarn

---

## 1. Banco de Dados (Docker)

```bash
# Na raiz do projeto
docker-compose up -d
```

Isso sobe o **PostgreSQL** (porta 5432) e o **Redis** (porta 6379).

---

## 2. Backend

```bash
cd backend
npm install

# Gerar o cliente Prisma e criar as tabelas
npx prisma generate
npx prisma db push

# Popular com dados iniciais
npm run db:seed

# Iniciar em modo desenvolvimento
npm run dev
```

O backend ficará disponível em: **http://localhost:3001**

---

## 3. Frontend

```bash
cd frontend
npm install

# Iniciar em modo desenvolvimento
npm run dev
```

O frontend ficará disponível em: **http://localhost:5173**

---

## Credenciais padrão

| Usuário | E-mail | Senha | Perfil |
|---|---|---|---|
| Administrador | admin@opme.com | admin123 | ADMIN |
| Coordenador | coordenador@opme.com | coord123 | COORDENADOR_OPME |
| Analista | analista@opme.com | anal123 | ANALISTA_OPME |
| Assistente | assistente@opme.com | assis123 | ASSISTENTE_OPME |
| Comprador | comprador@opme.com | comp123 | COMPRADOR_OPME |
| Enfermeiro | enfermeiro@opme.com | enf123 | ENFERMEIRO_AUDITOR |

---

## Estrutura de Diretórios

```
OPME System/
├── docker-compose.yml          # PostgreSQL + Redis
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Schema do banco de dados
│   ├── src/
│   │   ├── index.ts            # Entry point Express
│   │   ├── controllers/        # Lógica de negócio por entidade
│   │   ├── middlewares/        # Auth, RBAC, Upload, Audit, ErrorHandler
│   │   ├── routes/             # Definição das rotas REST
│   │   └── utils/              # Logger, Prisma client
│   ├── uploads/                # Arquivos enviados (criado automaticamente)
│   └── logs/                   # Logs da aplicação (criado automaticamente)
└── frontend/
    └── src/
        ├── api/                # Axios client
        ├── components/         # Layout, UI components
        ├── contexts/           # Auth context
        └── pages/              # Páginas da aplicação
```

---

## API Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | /api/auth/login | Login |
| GET | /api/auth/profile | Perfil do usuário logado |
| GET | /api/patients | Listar pacientes |
| POST | /api/patients | Criar paciente |
| GET | /api/doctors | Listar médicos |
| GET | /api/suppliers | Listar fornecedores |
| GET | /api/materials | Listar materiais OPME |
| GET | /api/procedures | Listar procedimentos |
| POST | /api/procedures | Criar procedimento (inicia workflow) |
| GET | /api/workflows | Listar workflows |
| POST | /api/workflows/:id/advance | Avançar/reprovar etapa |
| POST | /api/files/upload | Upload de arquivo |
| GET | /api/dashboard | Dados do dashboard |
| GET | /api/audit-logs | Logs de auditoria |

---

## Fluxo do Workflow

```
Criação do Procedimento
        ↓
1. ANÁLISE INICIAL     → Analista / Assistente OPME
        ↓
2. VALIDAÇÃO TÉCNICA   → Analista OPME
        ↓
3. COMPRA              → Comprador OPME
        ↓
4. AUDITORIA CLÍNICA   → Enfermeiro Auditor
        ↓
5. APROVAÇÃO FINAL     → Coordenador OPME
        ↓
6. CONCLUÍDO
```

Em qualquer etapa pode ocorrer **REPROVAÇÃO**, encerrando o workflow.

---

## Módulos implementados

- ✅ Autenticação JWT com controle de sessão
- ✅ RBAC (6 perfis de usuário)
- ✅ CRUD completo: Pacientes, Médicos, Fornecedores, Materiais, Procedimentos
- ✅ Workflow com 5 etapas e controle por perfil
- ✅ Dashboard com gráficos (Recharts)
- ✅ Upload de arquivos (PDF, imagens, docs)
- ✅ Log de auditoria completo
- ✅ Alertas de materiais vencendo
- ✅ Interface responsiva (Tailwind CSS)
- ✅ Busca e filtros avançados com paginação
