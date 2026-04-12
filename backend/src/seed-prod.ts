/**
 * Seed de produção — roda uma única vez após o deploy.
 * Cria os usuários padrão se ainda não existirem.
 * Seguro para rodar múltiplas vezes (usa upsert).
 */
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de produção...');

  // Admin sempre usa senha definida via env, com fallback seguro
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2024!';

  const users = [
    { email: 'admin@opme.com',        name: 'Administrador',      role: Role.ADMIN,              password: adminPassword },
    { email: 'coordenador@opme.com',  name: 'Maria Coordenadora', role: Role.COORDENADOR_OPME,   password: 'Coord@2024!' },
    { email: 'analista@opme.com',     name: 'João Analista',      role: Role.ANALISTA_OPME,      password: 'Anal@2024!' },
    { email: 'assistente@opme.com',   name: 'Ana Assistente',     role: Role.ASSISTENTE_OPME,    password: 'Assist@2024!' },
    { email: 'comprador@opme.com',    name: 'Carlos Comprador',   role: Role.COMPRADOR_OPME,     password: 'Compra@2024!' },
    { email: 'enfermeiro@opme.com',   name: 'Sandra Enfermeira',  role: Role.ENFERMEIRO_AUDITOR, password: 'Enf@2024!' },
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, role: u.role, password: hashed },
    });
    console.log(`  ✅ ${u.role}: ${u.email}`);
  }

  console.log('✅ Seed de produção concluído!');
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
