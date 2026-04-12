import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { AppError } from '../middlewares/errorHandler';
import { validatePassword } from './passwordValidator';

interface PasswordChangeMeta {
  actorId:   string;   // who is performing the change
  targetId:  string;   // whose password is being changed
  ipAddress?: string;
  userAgent?: string;
}

// ─── User changes own password ────────────────────────────────────────────────

export async function changeOwnPassword(
  userId:          string,
  currentPassword: string,
  newPassword:     string,
  confirmPassword: string,
  meta:            Omit<PasswordChangeMeta, 'targetId'>,
): Promise<void> {
  // Validate new password strength
  const validation = validatePassword(newPassword);
  if (!validation.ok && 'errors' in validation) {
    throw new AppError(validation.errors[0], 400);
  }
  if (newPassword !== confirmPassword) {
    throw new AppError('As senhas não coincidem', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) {
    throw new AppError('Usuário não encontrado', 404);
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    // Generic message — don't reveal whether user exists or password is wrong
    throw new AppError('Credenciais inválidas', 401);
  }

  if (await bcrypt.compare(newPassword, user.password)) {
    throw new AppError('A nova senha deve ser diferente da senha atual', 400);
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        password:         hashed,
        tokenVersion:     { increment: 1 },
        passwordChangedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId:    meta.actorId,
        action:    'CHANGE_PASSWORD',
        entity:    'User',
        entityId:  userId,
        details:   { selfChange: true },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    }),
  ]);
}

// ─── Admin resets another user's password ────────────────────────────────────

export async function adminResetPassword(
  targetUserId: string,
  newPassword:  string,
  confirmPassword: string,
  meta:         PasswordChangeMeta,
): Promise<void> {
  const validation = validatePassword(newPassword);
  if (!validation.ok && 'errors' in validation) {
    throw new AppError(validation.errors[0], 400);
  }
  if (newPassword !== confirmPassword) {
    throw new AppError('As senhas não coincidem', 400);
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    throw new AppError('Usuário não encontrado', 404);
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: {
        password:          hashed,
        tokenVersion:      { increment: 1 },
        passwordChangedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId:    meta.actorId,
        action:    'ADMIN_RESET_PASSWORD',
        entity:    'User',
        entityId:  targetUserId,
        details:   { targetName: target.name, targetEmail: target.email },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    }),
  ]);
}
