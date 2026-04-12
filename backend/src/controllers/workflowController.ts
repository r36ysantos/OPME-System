import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import { WorkflowStep, WorkflowStatus, ProcedureStatus, TaskStatus } from '@prisma/client';

const stepOrder: WorkflowStep[] = [
  'ANALISE_INICIAL',
  'VALIDACAO_TECNICA',
  'COMPRA',
  'AUDITORIA_CLINICA',
  'APROVACAO_FINAL',
  'CONCLUIDO',
];

const stepRoles: Record<WorkflowStep, string[]> = {
  ANALISE_INICIAL: ['ANALISTA_OPME', 'ASSISTENTE_OPME', 'ADMIN'],
  VALIDACAO_TECNICA: ['ANALISTA_OPME', 'ADMIN'],
  COMPRA: ['COMPRADOR_OPME', 'ADMIN'],
  AUDITORIA_CLINICA: ['ENFERMEIRO_AUDITOR', 'ADMIN'],
  APROVACAO_FINAL: ['COORDENADOR_OPME', 'ADMIN'],
  CONCLUIDO: ['COORDENADOR_OPME', 'ADMIN'],
};

const procedureStatusMap: Record<WorkflowStep, ProcedureStatus> = {
  ANALISE_INICIAL: 'EM_ANALISE',
  VALIDACAO_TECNICA: 'EM_ANALISE',
  COMPRA: 'EM_COMPRA',
  AUDITORIA_CLINICA: 'EM_ANALISE',
  APROVACAO_FINAL: 'EM_ANALISE',
  CONCLUIDO: 'FINALIZADO',
};

export const listWorkflows = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, step, priority, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (step) where.currentStep = String(step);
    if (priority) where.priority = String(priority);

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where, skip: (pageNum - 1) * limitNum, take: limitNum, orderBy: { createdAt: 'desc' },
        include: {
          procedure: {
            include: {
              patient: { select: { id: true, name: true } },
              doctor: { select: { id: true, name: true } },
            },
          },
          tasks: { include: { assignedTo: { select: { id: true, name: true } } } },
        },
      }),
      prisma.workflow.count({ where }),
    ]);
    res.json({ data: workflows, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (error) { next(error); }
};

export const getWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id },
      include: {
        procedure: { include: { patient: true, doctor: true, materials: { include: { material: true } } } },
        tasks: { include: { assignedTo: { select: { id: true, name: true, role: true } } } },
        history: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!workflow) throw new AppError('Workflow não encontrado', 404);
    res.json(workflow);
  } catch (error) { next(error); }
};

export const advanceStep = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes, approved = true } = req.body;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) throw new AppError('Workflow não encontrado', 404);
    if (workflow.status !== 'EM_ANDAMENTO') throw new AppError('Workflow não está em andamento', 400);

    const allowedRoles = stepRoles[workflow.currentStep];
    if (!allowedRoles.includes(req.user!.role)) {
      throw new AppError('Você não tem permissão para esta etapa do workflow', 403);
    }

    const currentIdx = stepOrder.indexOf(workflow.currentStep);
    let nextStep: WorkflowStep;
    let newWorkflowStatus: WorkflowStatus = 'EM_ANDAMENTO';
    let newProcedureStatus: ProcedureStatus;

    if (!approved) {
      newWorkflowStatus = 'REPROVADO';
      nextStep = workflow.currentStep;
      newProcedureStatus = 'REPROVADO';
    } else if (currentIdx >= stepOrder.length - 2) {
      nextStep = 'CONCLUIDO';
      newWorkflowStatus = 'CONCLUIDO';
      newProcedureStatus = 'FINALIZADO';
    } else {
      nextStep = stepOrder[currentIdx + 1];
      newProcedureStatus = procedureStatusMap[nextStep];
    }

    await prisma.$transaction(async (tx) => {
      await tx.workflowTask.updateMany({
        where: { workflowId: id, step: workflow.currentStep, status: 'EM_ANDAMENTO' },
        data: { status: approved ? TaskStatus.CONCLUIDO : TaskStatus.REPROVADO, completedAt: new Date() },
      });

      const updated = await tx.workflow.update({
        where: { id },
        data: { currentStep: nextStep, status: newWorkflowStatus, updatedAt: new Date() },
      });

      if (approved && newWorkflowStatus === 'EM_ANDAMENTO') {
        await tx.workflowTask.create({
          data: { workflowId: id, step: nextStep },
        });
      }

      await tx.workflowHistory.create({
        data: {
          workflowId: id,
          userId: req.user!.id,
          action: approved ? 'AVANCADO' : 'REPROVADO',
          previousStep: workflow.currentStep,
          newStep: nextStep,
          notes,
        },
      });

      await tx.procedure.update({
        where: { id: workflow.procedureId },
        data: { status: newProcedureStatus },
      });

      return updated;
    });

    const updatedWorkflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        procedure: { include: { patient: { select: { id: true, name: true } } } },
        history: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    res.json(updatedWorkflow);
  } catch (error) { next(error); }
};

export const assignTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { userId, dueDate } = req.body;

    const task = await prisma.workflowTask.update({
      where: { id: taskId },
      data: {
        assignedToId: userId,
        status: TaskStatus.EM_ANDAMENTO,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      include: { assignedTo: { select: { id: true, name: true, role: true } } },
    });

    res.json(task);
  } catch (error) { next(error); }
};

export const getMyTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tasks = await prisma.workflowTask.findMany({
      where: { assignedToId: req.user!.id, status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } },
      include: {
        workflow: {
          include: {
            procedure: { include: { patient: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
    res.json(tasks);
  } catch (error) { next(error); }
};

export const updatePriority = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { priority } = req.body;
    const workflow = await prisma.workflow.update({ where: { id }, data: { priority } });
    res.json(workflow);
  } catch (error) { next(error); }
};
