import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

export const listStockMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { materialId, procedureId, type, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (materialId) where.materialId = String(materialId);
    if (procedureId) where.procedureId = String(procedureId);
    if (type) where.type = String(type);

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          material: { select: { id: true, name: true, code: true, unit: true } },
          procedure: {
            select: {
              id: true, name: true, status: true,
              patient: { select: { id: true, name: true } },
            },
          },
          user: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({ data: movements, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (error) { next(error); }
};

export const getMaterialMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { materialId: req.params.id },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          procedure: {
            select: {
              id: true, name: true, status: true,
              patient: { select: { id: true, name: true } },
            },
          },
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.stockMovement.count({ where: { materialId: req.params.id } }),
    ]);

    res.json({ data: movements, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (error) { next(error); }
};

export const getProcedureMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { procedureId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        material: { select: { id: true, name: true, code: true, unit: true } },
        user: { select: { id: true, name: true } },
      },
    });
    res.json(movements);
  } catch (error) { next(error); }
};
