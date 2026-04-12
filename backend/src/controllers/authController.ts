import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import { getDefaultPermissions } from '../utils/defaultPermissions';
import { changeOwnPassword, adminResetPassword } from '../utils/passwordService';

// ─── Helper: fetch user's permissions ────────────────────────────────────────

async function fetchPermissions(userId: string) {
  return prisma.userPermission.findMany({
    where: { userId },
    select: {
      module: true,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
    },
    orderBy: { module: 'asc' },
  });
}

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email e senha são obrigatórios', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      // tokenVersion needed to embed in JWT so middleware can detect stale tokens
    });

    if (!user || !user.active) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Credenciais inválidas', 401);
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, tv: user.tokenVersion },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' } as any,
    );

    // Admin gets all permissions implicitly — return empty array (frontend checks role)
    const permissions = user.role === 'ADMIN' ? [] : await fetchPermissions(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
      permissions,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get profile ──────────────────────────────────────────────────────────────

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    const permissions = user.role === 'ADMIN' ? [] : await fetchPermissions(user.id);

    res.json({ ...user, permissions });
  } catch (error) {
    next(error);
  }
};

// ─── Change own password ──────────────────────────────────────────────────────

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    await changeOwnPassword(
      req.user!.id,
      currentPassword,
      newPassword,
      confirmPassword,
      { actorId: req.user!.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    );

    res.json({ message: 'Senha alterada com sucesso. Faça login novamente.' });
  } catch (error) {
    next(error);
  }
};

// ─── Admin reset another user's password ─────────────────────────────────────

export const adminResetUserPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: targetId } = req.params;

    // Prevent admin from using this route to change their own password
    // (they should use changePassword to keep audit trails clean)
    if (targetId === req.user!.id) {
      throw new AppError('Use a rota de troca de senha para alterar sua própria senha', 400);
    }

    const { newPassword, confirmPassword } = req.body;

    await adminResetPassword(
      targetId,
      newPassword,
      confirmPassword,
      { actorId: req.user!.id, targetId, ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    );

    res.json({ message: 'Senha do usuário redefinida com sucesso.' });
  } catch (error) {
    next(error);
  }
};

// ─── List users ───────────────────────────────────────────────────────────────

export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        active: true,
        createdAt: true,
        receivedPermissions: {
          select: { module: true, canView: true, canCreate: true, canEdit: true, canDelete: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// ─── Create user ──────────────────────────────────────────────────────────────

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, role, phone } = req.body;

    if (!email || !password || !name || !role) {
      throw new AppError('Email, senha, nome e perfil são obrigatórios', 400);
    }
    if (password.length < 8) {
      throw new AppError('Senha deve ter pelo menos 8 caracteres', 400);
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: email.toLowerCase().trim(), password: hashed, name, role, phone },
        select: { id: true, email: true, name: true, role: true, phone: true, active: true, createdAt: true },
      });

      // Seed default permissions based on role (ADMIN skipped — full access)
      const defaults = getDefaultPermissions(role);
      if (defaults.length > 0) {
        await tx.userPermission.createMany({
          data: defaults.map((p) => ({
            userId: created.id,
            module: p.module,
            canView: p.canView,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            grantedById: req.user!.id,
            notes: `Permissões padrão do perfil ${role}`,
          })),
        });
      }

      return created;
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: user.id,
        details: { name, email, role },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

// ─── Update user ──────────────────────────────────────────────────────────────

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, role, phone, active } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(phone !== undefined && { phone }),
        ...(active !== undefined && { active: active === true || active === 'true' }),
      },
      select: { id: true, email: true, name: true, role: true, phone: true, active: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: id,
        details: { name, role, phone, active },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};
