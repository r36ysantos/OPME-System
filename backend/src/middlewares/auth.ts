import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Internal JWT payload shape (includes tokenVersion)
interface JwtPayload extends AuthUser {
  tv?: number; // token version — missing in old tokens (treated as 0)
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de autenticação não fornecido' });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET!;

    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id, active: true },
      select: { id: true, email: true, name: true, role: true, tokenVersion: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
      return;
    }

    // Invalidate tokens issued before a password change.
    // Old tokens without 'tv' are treated as version 0; they remain valid only
    // while the user's tokenVersion is also 0 (no password changes have occurred).
    const tokenTv = decoded.tv ?? 0;
    if (tokenTv < user.tokenVersion) {
      res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
      return;
    }

    const { tokenVersion: _tv, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expirado' });
      return;
    }
    next(error);
  }
};
