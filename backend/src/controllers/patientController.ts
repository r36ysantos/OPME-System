import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';

export const listPatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, page = '1', limit = '20', active } = req.query;

    const where: any = {};
    if (active !== undefined) where.active = active === 'true';
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { cpf: { contains: String(search) } },
        { medicalRecord: { contains: String(search) } },
      ];
    }

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
        include: { _count: { select: { procedures: true } } },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({ data: patients, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (error) {
    next(error);
  }
};

export const getPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        procedures: {
          include: { doctor: true },
          orderBy: { createdAt: 'desc' },
        },
        files: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!patient) throw new AppError('Paciente não encontrado', 404);
    res.json(patient);
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, cpf, birthDate, phone, email, address, city, state, medicalRecord, healthPlan, notes } = req.body;

    if (!name || !cpf || !birthDate) {
      throw new AppError('Nome, CPF e data de nascimento são obrigatórios', 400);
    }

    const patient = await prisma.patient.create({
      data: { name, cpf: cpf.replace(/\D/g, ''), birthDate: new Date(birthDate), phone, email, address, city, state, medicalRecord, healthPlan, notes },
    });

    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, cpf, birthDate, phone, email, address, city, state, medicalRecord, healthPlan, notes, active } = req.body;

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        name, phone, email, address, city, state, medicalRecord, healthPlan, notes, active,
        ...(cpf && { cpf: cpf.replace(/\D/g, '') }),
        ...(birthDate && { birthDate: new Date(birthDate) }),
      },
    });

    res.json(patient);
  } catch (error) {
    next(error);
  }
};

export const deletePatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.patient.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json({ message: 'Paciente desativado com sucesso' });
  } catch (error) {
    next(error);
  }
};
