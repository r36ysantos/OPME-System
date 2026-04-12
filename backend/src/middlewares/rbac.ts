import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';

const roleHierarchy: Record<Role, number> = {
  ADMIN: 100,
  COORDENADOR_OPME: 80,
  ENFERMEIRO_AUDITOR: 60,
  COMPRADOR_OPME: 50,
  ANALISTA_OPME: 40,
  ASSISTENTE_OPME: 20,
};

// ─── Role-based authorization (kept for admin-only routes) ────────────────────

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const userRole = req.user.role as Role;
    const hasPermission = roles.includes(userRole) || userRole === Role.ADMIN;

    if (!hasPermission) {
      res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
      return;
    }

    next();
  };
};

export const authorizeMinLevel = (minRole: Role) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const userRole = req.user.role as Role;
    const userLevel = roleHierarchy[userRole] || 0;
    const minLevel = roleHierarchy[minRole] || 0;

    if (userLevel < minLevel) {
      res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
      return;
    }

    next();
  };
};

// ─── Module-based access control ─────────────────────────────────────────────

type ModuleAction = 'view' | 'create' | 'edit' | 'delete';

const actionField: Record<ModuleAction, 'canView' | 'canCreate' | 'canEdit' | 'canDelete'> = {
  view:   'canView',
  create: 'canCreate',
  edit:   'canEdit',
  delete: 'canDelete',
};

/**
 * Checks that the authenticated user has access to a given system module.
 * ADMIN role always passes. Other users must have an explicit UserPermission record.
 */
export const checkModule = (module: string, action: ModuleAction = 'view') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Administrators have unconditional access
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    try {
      const perm = await prisma.userPermission.findUnique({
        where: { userId_module: { userId: req.user.id, module } },
      });

      if (!perm) {
        res.status(403).json({
          error: `Você não tem acesso ao módulo "${module}".`,
          module,
          action,
        });
        return;
      }

      if (!perm[actionField[action]]) {
        res.status(403).json({
          error: `Você não tem permissão para "${action}" no módulo "${module}".`,
          module,
          action,
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
