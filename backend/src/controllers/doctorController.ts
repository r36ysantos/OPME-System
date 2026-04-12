import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';

export const listDoctors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, page = '1', limit = '20', active } = req.query;
    const where: any = {};
    if (active !== undefined) where.active = active === 'true';
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { crm: { contains: String(search) } },
        { specialty: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({ where, skip: (pageNum - 1) * limitNum, take: limitNum, orderBy: { name: 'asc' } }),
      prisma.doctor.count({ where }),
    ]);
    res.json({ data: doctors, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (error) { next(error); }
};

export const getDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: { procedures: { include: { patient: true }, orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!doctor) throw new AppError('Médico não encontrado', 404);
    res.json(doctor);
  } catch (error) { next(error); }
};

export const createDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, crm, specialty, phone, email, hospital } = req.body;
    if (!name || !crm || !specialty) throw new AppError('Nome, CRM e especialidade são obrigatórios', 400);
    const doctor = await prisma.doctor.create({ data: { name, crm, specialty, phone, email, hospital } });
    res.status(201).json(doctor);
  } catch (error) { next(error); }
};

export const updateDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctor = await prisma.doctor.update({ where: { id: req.params.id }, data: req.body });
    res.json(doctor);
  } catch (error) { next(error); }
};

export const deleteDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.doctor.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: 'Médico desativado com sucesso' });
  } catch (error) { next(error); }
};
