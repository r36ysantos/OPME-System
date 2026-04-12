import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';

export const listSuppliers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, page = '1', limit = '20', active } = req.query;
    const where: any = {};
    if (active !== undefined) where.active = active === 'true';
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { cnpj: { contains: String(search) } },
      ];
    }
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where, skip: (pageNum - 1) * limitNum, take: limitNum, orderBy: { name: 'asc' },
        include: { _count: { select: { materials: true } } },
      }),
      prisma.supplier.count({ where }),
    ]);
    res.json({ data: suppliers, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (error) { next(error); }
};

export const getSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: { materials: { where: { active: true }, orderBy: { name: 'asc' } } },
    });
    if (!supplier) throw new AppError('Fornecedor não encontrado', 404);
    res.json(supplier);
  } catch (error) { next(error); }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, cnpj, email, phone, address, city, state, contact, contract, sla } = req.body;
    if (!name || !cnpj) throw new AppError('Nome e CNPJ são obrigatórios', 400);
    const supplier = await prisma.supplier.create({
      data: { name, cnpj: cnpj.replace(/\D/g, ''), email, phone, address, city, state, contact, contract, sla },
    });
    res.status(201).json(supplier);
  } catch (error) { next(error); }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = { ...req.body };
    if (data.cnpj) data.cnpj = data.cnpj.replace(/\D/g, '');
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
    res.json(supplier);
  } catch (error) { next(error); }
};

export const deleteSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.supplier.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: 'Fornecedor desativado com sucesso' });
  } catch (error) { next(error); }
};
