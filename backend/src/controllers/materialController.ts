import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';

export const listMaterials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, page = '1', limit = '20', active, supplierId, expiringSoon } = req.query;
    const where: any = {};
    if (active !== undefined) where.active = active === 'true';
    if (supplierId) where.supplierId = String(supplierId);
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { code: { contains: String(search) } },
        { lot: { contains: String(search) } },
      ];
    }
    if (expiringSoon === 'true') {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      where.expiryDate = { lte: thirtyDays, gte: new Date() };
    }
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where, skip: (pageNum - 1) * limitNum, take: limitNum, orderBy: { name: 'asc' },
        include: { supplier: { select: { id: true, name: true } } },
      }),
      prisma.material.count({ where }),
    ]);
    res.json({ data: materials, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (error) { next(error); }
};

export const getMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const material = await prisma.material.findUnique({
      where: { id: req.params.id },
      include: { supplier: true },
    });
    if (!material) throw new AppError('Material não encontrado', 404);
    res.json(material);
  } catch (error) { next(error); }
};

export const createMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, code, description, lot, expiryDate, quantity, unitPrice, unit, brand, anvisa, supplierId } = req.body;
    if (!name || !code) throw new AppError('Nome e código são obrigatórios', 400);
    const material = await prisma.material.create({
      data: {
        name, code, description, lot, unit, brand, anvisa, supplierId,
        quantity: parseInt(quantity) || 0,
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
    res.status(201).json(material);
  } catch (error) { next(error); }
};

export const updateMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data: any = { ...req.body };
    if (data.quantity !== undefined) data.quantity = parseInt(data.quantity);
    if (data.unitPrice !== undefined) data.unitPrice = parseFloat(data.unitPrice);
    if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
    const material = await prisma.material.update({
      where: { id: req.params.id }, data,
      include: { supplier: { select: { id: true, name: true } } },
    });
    res.json(material);
  } catch (error) { next(error); }
};

export const deleteMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.material.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: 'Material desativado com sucesso' });
  } catch (error) { next(error); }
};
