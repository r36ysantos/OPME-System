---
name: OPME System Project
description: Full-stack web system for OPME hospital management — structure, stack, and status
type: project
---

Full-stack OPME (Órteses, Próteses e Materiais Especiais) hospital management system built at D:/OPME System.

**Why:** User requested a complete, production-ready system for hospital OPME workflow control, including CRUD, workflow management, file uploads, RBAC, and audit logging.

**How to apply:** When the user asks about this project, refer to this context. The system is complete and ready for installation.

## Stack
- **Backend:** Node.js + Express + TypeScript + Prisma ORM + PostgreSQL + JWT
- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS + React Query + React Router + Recharts
- **Infra:** Docker Compose (PostgreSQL + Redis)

## Key files
- `install.bat` — first-time setup script
- `start.bat` — start all services
- `SETUP.md` — full documentation
- `backend/prisma/schema.prisma` — database schema
- `backend/src/seed.ts` — default users seeder

## Modules implemented
- Auth (JWT), RBAC (6 roles)
- CRUD: Patients, Doctors, Suppliers, Materials, Procedures
- Workflow (5 steps, role-based advancement)
- File uploads
- Dashboard with charts
- Audit logs

## Default credentials (after seed)
- admin@opme.com / admin123
- coordenador@opme.com / coord123
- analista@opme.com / anal123
