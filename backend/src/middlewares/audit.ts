import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export const auditLog = (action: string, entity: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      const entityId = data?.id || req.params?.id;

      prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action,
          entity,
          entityId,
          details: { body: req.body, params: req.params, query: req.query },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      }).catch((err) => logger.error('Audit log error:', err));

      return originalJson(data);
    };

    next();
  };
};
