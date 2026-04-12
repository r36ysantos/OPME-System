import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import { WorkflowStep } from '@prisma/client';

export const listProcedures = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, page = '1', limit = '20', status, patientId, doctorId } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (patientId) where.patientId = String(patientId);
    if (doctorId) where.doctorId = String(doctorId);
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { patient: { name: { contains: String(search), mode: 'insensitive' } } },
        { doctor: { name: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const [procedures, total] = await Promise.all([
      prisma.procedure.findMany({
        where, skip: (pageNum - 1) * limitNum, take: limitNum, orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, name: true, cpf: true } },
          doctor: { select: { id: true, name: true, crm: true, specialty: true } },
          workflow: { select: { id: true, currentStep: true, status: true, priority: true } },
          _count: { select: { materials: true } },
        },
      }),
      prisma.procedure.count({ where }),
    ]);
    res.json({ data: procedures, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (error) { next(error); }
};

export const getProcedure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const procedure = await prisma.procedure.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        doctor: true,
        materials: { include: { material: { include: { supplier: { select: { id: true, name: true } } } } } },
        workflow: { include: { tasks: { include: { assignedTo: { select: { id: true, name: true, role: true } } } }, history: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } } } },
        files: { include: { uploadedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!procedure) throw new AppError('Procedimento não encontrado', 404);
    res.json(procedure);
  } catch (error) { next(error); }
};

export const createProcedure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, type, complexity, patientId, doctorId, scheduledAt, notes, cid, tuss, materials } = req.body;
    if (!name || !type || !complexity || !patientId || !doctorId) {
      throw new AppError('Nome, tipo, complexidade, paciente e médico são obrigatórios', 400);
    }

    const procedure = await prisma.$transaction(async (tx) => {
      const proc = await tx.procedure.create({
        data: {
          name, type, complexity, patientId, doctorId, notes, cid, tuss,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        },
      });

      if (materials && materials.length > 0) {
        await tx.procedureMaterial.createMany({
          data: materials.map((m: { materialId: string; quantity: number }) => ({
            procedureId: proc.id,
            materialId: m.materialId,
            quantity: m.quantity,
          })),
        });
      }

      const workflow = await tx.workflow.create({
        data: {
          procedureId: proc.id,
          currentStep: WorkflowStep.ANALISE_INICIAL,
        },
      });

      await tx.workflowTask.create({
        data: {
          workflowId: workflow.id,
          step: WorkflowStep.ANALISE_INICIAL,
        },
      });

      await tx.workflowHistory.create({
        data: {
          workflowId: workflow.id,
          userId: req.user!.id,
          action: 'CRIADO',
          newStep: WorkflowStep.ANALISE_INICIAL,
        },
      });

      return proc;
    });

    res.status(201).json(procedure);
  } catch (error) { next(error); }
};

export const updateProcedure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, type, complexity, patientId, doctorId, scheduledAt, notes, cid, tuss, status } = req.body;
    const procedure = await prisma.procedure.update({
      where: { id: req.params.id },
      data: {
        name, type, complexity, patientId, doctorId, notes, cid, tuss, status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
    });
    res.json(procedure);
  } catch (error) { next(error); }
};

export const deleteProcedure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.procedure.update({ where: { id: req.params.id }, data: { status: 'CANCELADO' } });
    res.json({ message: 'Procedimento cancelado com sucesso' });
  } catch (error) { next(error); }
};
