import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getDefaultPermissions } from './utils/defaultPermissions';

const prisma = new PrismaClient();

async function seedUserWithPermissions(
  userData: { email: string; name: string; role: Role; password: string },
  adminId: string,
) {
  const hashed = await bcrypt.hash(userData.password, 12);

  const user = await prisma.user.upsert({
    where: { email: userData.email },
    update: {},
    create: { email: userData.email, name: userData.name, role: userData.role, password: hashed },
  });

  // Seed default permissions (skip ADMIN — full access by bypass)
  if (userData.role !== Role.ADMIN) {
    const defaults = getDefaultPermissions(userData.role);
    for (const p of defaults) {
      await prisma.userPermission.upsert({
        where: { userId_module: { userId: user.id, module: p.module } },
        update: {},
        create: {
          userId: user.id,
          module: p.module,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          grantedById: adminId,
          notes: `Permissões padrão do perfil ${userData.role}`,
        },
      });
    }
  }

  console.log(`  ✓ ${userData.email} / ${userData.password} (${userData.role})`);
  return user;
}

async function main() {
  console.log('Seeding database...\n');

  // Create admin first (needed as grantedById for other users)
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@opme.com' },
    update: {},
    create: { email: 'admin@opme.com', name: 'Administrador', role: Role.ADMIN, password: adminHash },
  });
  console.log(`  ✓ admin@opme.com / admin123 (ADMIN)`);

  const seededUsers = [
    { email: 'coordenador@opme.com', name: 'Maria Coordenadora',  role: Role.COORDENADOR_OPME, password: 'coord123' },
    { email: 'analista@opme.com',    name: 'João Analista',        role: Role.ANALISTA_OPME,    password: 'anal123' },
    { email: 'assistente@opme.com',  name: 'Ana Assistente',       role: Role.ASSISTENTE_OPME,  password: 'assis123' },
    { email: 'comprador@opme.com',   name: 'Carlos Comprador',     role: Role.COMPRADOR_OPME,   password: 'comp123' },
    { email: 'enfermeiro@opme.com',  name: 'Sandra Enfermeira',    role: Role.ENFERMEIRO_AUDITOR, password: 'enf123' },
  ];

  for (const u of seededUsers) {
    await seedUserWithPermissions(u, admin.id);
  }

  // ─── Sample data ─────────────────────────────────────────────────────────────

  const supplier = await prisma.supplier.upsert({
    where: { cnpj: '12345678000195' },
    update: {},
    create: {
      name: 'Fornecedor Médico Premium Ltda',
      cnpj: '12345678000195',
      email: 'contato@fornecedorpremium.com.br',
      phone: '(11) 3456-7890',
      city: 'São Paulo',
      state: 'SP',
      contact: 'Rodrigo Vendas',
      sla: '5 dias úteis',
    },
  });

  const materials = [
    { name: 'Prótese de Quadril Total',  code: 'PQ-001', description: 'Prótese cimentada quadril total', quantity: 10, unitPrice: 15000 },
    { name: 'Placa de Titânio 3.5mm',    code: 'PT-001', description: 'Placa ortopédica titânio',        quantity: 25, unitPrice: 850 },
    { name: 'Parafuso Cortical 4.5mm',   code: 'PC-001', description: 'Parafuso cortical aço inox',      quantity: 100, unitPrice: 45 },
    { name: 'Órtese Joelho Articulada',  code: 'OJ-001', description: 'Órtese articulada joelho',        quantity: 8,  unitPrice: 2500 },
  ];

  for (const m of materials) {
    await prisma.material.upsert({
      where: { code: m.code },
      update: {},
      create: { ...m, supplierId: supplier.id, unitPrice: m.unitPrice },
    });
  }

  await prisma.doctor.upsert({
    where: { crm: 'SP-123456' },
    update: {},
    create: {
      name: 'Dr. Roberto Silva',
      crm: 'SP-123456',
      specialty: 'Ortopedia e Traumatologia',
      email: 'dr.roberto@hospital.com.br',
      phone: '(11) 9876-5432',
      hospital: 'Hospital São Paulo',
    },
  });

  await prisma.patient.upsert({
    where: { cpf: '12345678901' },
    update: {},
    create: {
      name: 'José da Silva',
      cpf: '12345678901',
      birthDate: new Date('1965-03-15'),
      phone: '(11) 9123-4567',
      medicalRecord: 'MR-2024-001',
      healthPlan: 'Unimed',
      city: 'São Paulo',
      state: 'SP',
    },
  });

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
