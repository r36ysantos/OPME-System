import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import { getDefaultPermissions, SYSTEM_MODULES, ModulePermission } from '../utils/defaultPermissions';

// GET /permissions/modules
export const listModules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(SYSTEM_MODULES);
  } catch (error) {
    next(error);
  }
};

// GET /permissions/:userId
export const getUserPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!user) throw new AppError('Usuário não encontrado', 404);

    const permissions = await prisma.userPermission.findMany({
      where: { userId },
      include: { grantedBy: { select: { id: true, name: true } } },
      orderBy: { module: 'asc' },
    });

    res.json({ user, permissions });
  } catch (error) {
    next(error);
  }
};

// PUT /permissions/:userId  — replace all permissions for a user
export const setUserPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { permissions, notes }: { permissions: ModulePermission[]; notes?: string } = req.body;

    if (!Array.isArray(permissions)) throw new AppError('permissions deve ser um array', 400);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!user) throw new AppError('Usuário não encontrado', 404);

    // Admins don't need explicit permissions (they bypass all checks)
    if (user.role === 'ADMIN') throw new AppError('Administradores têm acesso total e não precisam de permissões explícitas', 400);

    // Validate modules
    const validModules = SYSTEM_MODULES.map((m) => m.key);
    const invalidModules = permissions.filter((p) => !validModules.includes(p.module));
    if (invalidModules.length > 0) {
      throw new AppError(`Módulos inválidos: ${invalidModules.map((p) => p.module).join(', ')}`, 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });

      if (permissions.length > 0) {
        await tx.userPermission.createMany({
          data: permissions.map((p) => ({
            userId,
            module: p.module,
            canView: p.canView ?? true,
            canCreate: p.canCreate ?? false,
            canEdit: p.canEdit ?? false,
            canDelete: p.canDelete ?? false,
            grantedById: req.user!.id,
            notes: notes ?? null,
          })),
        });
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_PERMISSIONS',
        entity: 'User',
        entityId: userId,
        details: {
          updatedFor: user.name,
          modulesGranted: permissions.length,
          modules: permissions.map((p) => ({
            module: p.module,
            canView: p.canView,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
          })),
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    const updated = await prisma.userPermission.findMany({
      where: { userId },
      include: { grantedBy: { select: { id: true, name: true } } },
    });

    res.json({ message: 'Permissões atualizadas com sucesso', permissions: updated });
  } catch (error) {
    next(error);
  }
};

// POST /permissions/:userId/reset  — reset to role defaults
export const resetToDefaults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!user) throw new AppError('Usuário não encontrado', 404);
    if (user.role === 'ADMIN') throw new AppError('Administradores têm acesso total', 400);

    const defaults = getDefaultPermissions(user.role);

    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });
      if (defaults.length > 0) {
        await tx.userPermission.createMany({
          data: defaults.map((p) => ({
            userId,
            module: p.module,
            canView: p.canView,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            grantedById: req.user!.id,
            notes: `Redefinido para padrões do perfil ${user.role}`,
          })),
        });
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'RESET_PERMISSIONS',
        entity: 'User',
        entityId: userId,
        details: { resetTo: user.role, updatedFor: user.name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    const updated = await prisma.userPermission.findMany({
      where: { userId },
      include: { grantedBy: { select: { id: true, name: true } } },
    });

    res.json({ message: `Permissões redefinidas para o padrão do perfil ${user.role}`, permissions: updated });
  } catch (error) {
    next(error);
  }
};

// GET /permissions  — all users with their permission summary (admin view)
export const listAllPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
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
