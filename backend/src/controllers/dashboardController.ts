import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

export const getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      totalPatients,
      totalDoctors,
      totalMaterials,
      totalSuppliers,
      proceduresByStatus,
      workflowsByStep,
      recentProcedures,
      expiringMaterials,
      myPendingTasks,
    ] = await Promise.all([
      prisma.patient.count({ where: { active: true } }),
      prisma.doctor.count({ where: { active: true } }),
      prisma.material.count({ where: { active: true } }),
      prisma.supplier.count({ where: { active: true } }),
      prisma.procedure.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.workflow.groupBy({ by: ['currentStep'], where: { status: 'EM_ANDAMENTO' }, _count: { currentStep: true } }),
      prisma.procedure.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { name: true } },
          doctor: { select: { name: true } },
          workflow: { select: { currentStep: true, status: true } },
        },
      }),
      prisma.material.findMany({
        where: { expiryDate: { lte: thirtyDaysFromNow, gte: today }, active: true },
        orderBy: { expiryDate: 'asc' },
        take: 5,
        include: { supplier: { select: { name: true } } },
      }),
      prisma.workflowTask.count({
        where: {
          assignedToId: req.user!.id,
          status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
        },
      }),
    ]);

    res.json({
      summary: { totalPatients, totalDoctors, totalMaterials, totalSuppliers, myPendingTasks },
      proceduresByStatus,
      workflowsByStep,
      recentProcedures,
      expiringMaterials,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '50', entity, userId } = req.query;
    const where: any = {};
    if (entity) where.entity = String(entity);
    if (userId) where.userId = String(userId);

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip: (pageNum - 1) * limitNum, take: limitNum, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ data: logs, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (error) { next(error); }
};
