import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import { WorkflowStep } from '@prisma/client';

// ─── Stock helpers ────────────────────────────────────────────────────────────

/**
 * Debit stock (SAIDA) inside a Prisma transaction.
 * Throws AppError 409 if stock is insufficient.
 */
async function debitStock(
  tx: any,
  materialId: string,
  quantity: number,
  procedureId: string,
  userId: string,
  notes: string,
): Promise<void> {
  const mat = await tx.material.findUnique({ where: { id: materialId } });
  if (!mat) throw new AppError(`Material não encontrado: ${materialId}`, 404);
  if (mat.quantity < quantity) {
    throw new AppError(
      `Estoque insuficiente para "${mat.name}" (cód. ${mat.code}). Disponível: ${mat.quantity}, Solicitado: ${quantity}`,
      409,
    );
  }
  const newStock = mat.quantity - quantity;
  await tx.material.update({ where: { id: materialId }, data: { quantity: newStock } });
  await tx.stockMovement.create({
    data: {
      materialId,
      procedureId,
      userId,
      type: 'SAIDA',
      quantity,
      previousStock: mat.quantity,
      newStock,
      notes,
    },
  });
}

/**
 * Return stock to inventory (ESTORNO or CANCELAMENTO) inside a Prisma transaction.
 */
async function returnStock(
  tx: any,
  materialId: string,
  quantity: number,
  procedureId: string,
  userId: string,
  type: 'ESTORNO' | 'CANCELAMENTO',
  notes: string,
): Promise<void> {
  const mat = await tx.material.findUnique({ where: { id: materialId } });
  if (!mat) return; // Material may have been hard-deleted; skip gracefully
  const newStock = mat.quantity + quantity;
  await tx.material.update({ where: { id: materialId }, data: { quantity: newStock } });
  await tx.stockMovement.create({
    data: {
      materialId,
      procedureId,
      userId,
      type,
      quantity,
      previousStock: mat.quantity,
      newStock,
      notes,
    },
  });
}

// ─── Controllers ──────────────────────────────────────────────────────────────

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
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          include: {
            material: { select: { id: true, name: true, code: true, unit: true } },
            user: { select: { id: true, name: true } },
          },
        },
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
      // 1. Create procedure
      const proc = await tx.procedure.create({
        data: {
          name, type, complexity, patientId, doctorId, notes, cid, tuss,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        },
      });

      // 2. Handle materials — check stock & debit
      if (materials && materials.length > 0) {
        await tx.procedureMaterial.createMany({
          data: materials.map((m: { materialId: string; quantity: number; unit?: string; notes?: string }) => ({
            procedureId: proc.id,
            materialId: m.materialId,
            quantity: Number(m.quantity) || 1,
            unit: m.unit || null,
            notes: m.notes || null,
          })),
        });

        for (const m of materials) {
          await debitStock(
            tx,
            m.materialId,
            Number(m.quantity) || 1,
            proc.id,
            req.user!.id,
            `Lançamento inicial — procedimento: ${proc.name}`,
          );
        }
      }

      // 3. Create workflow
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
    const { name, type, complexity, patientId, doctorId, scheduledAt, notes, cid, tuss, status, materials } = req.body;
    const procedureId = req.params.id;

    const procedure = await prisma.$transaction(async (tx) => {
      // 1. Update procedure fields
      const proc = await tx.procedure.update({
        where: { id: procedureId },
        data: {
          name, type, complexity, patientId, doctorId, notes, cid, tuss, status,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        },
        include: { patient: { select: { name: true } } },
      });

      // 2. Sync materials with stock movements when materials field is present
      if (Array.isArray(materials)) {
        // Load existing materials BEFORE deleting them
        const existingMaterials = await tx.procedureMaterial.findMany({
          where: { procedureId },
        });

        // Build maps for easy comparison
        const oldMap = new Map<string, number>(); // materialId -> quantity
        for (const em of existingMaterials) {
          oldMap.set(em.materialId, em.quantity);
        }

        const newMap = new Map<string, number>(); // materialId -> quantity
        for (const m of materials) {
          newMap.set(m.materialId, Number(m.quantity) || 1);
        }

        // Compute stock adjustments BEFORE replacing procedure_materials
        // a) Materials removed entirely → ESTORNO full old quantity
        for (const [matId, oldQty] of oldMap.entries()) {
          if (!newMap.has(matId)) {
            await returnStock(
              tx, matId, oldQty, procedureId, req.user!.id,
              'ESTORNO',
              `Remoção do OPME — procedimento: ${proc.name}`,
            );
          }
        }

        // b) Materials added or quantity changed
        for (const [matId, newQty] of newMap.entries()) {
          const oldQty = oldMap.get(matId) ?? 0;
          const diff = newQty - oldQty;

          if (diff > 0) {
            // More units requested → debit additional units
            await debitStock(
              tx, matId, diff, procedureId, req.user!.id,
              `Aumento de quantidade — procedimento: ${proc.name}`,
            );
          } else if (diff < 0) {
            // Fewer units requested → return the difference
            await returnStock(
              tx, matId, Math.abs(diff), procedureId, req.user!.id,
              'ESTORNO',
              `Redução de quantidade — procedimento: ${proc.name}`,
            );
          }
          // diff === 0: no stock change needed
        }

        // Replace procedure_materials
        await tx.procedureMaterial.deleteMany({ where: { procedureId } });
        if (materials.length > 0) {
          await tx.procedureMaterial.createMany({
            data: materials.map((m: { materialId: string; quantity: number; unit?: string; notes?: string }) => ({
              procedureId,
              materialId: m.materialId,
              quantity: Number(m.quantity) || 1,
              unit: m.unit || null,
              notes: m.notes || null,
            })),
          });
        }
      }

      return proc;
    });

    // Return full procedure with materials and stock movements
    const full = await prisma.procedure.findUnique({
      where: { id: procedure.id },
      include: {
        patient: true,
        doctor: true,
        materials: {
          include: { material: { include: { supplier: { select: { id: true, name: true } } } } },
        },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          include: {
            material: { select: { id: true, name: true, code: true, unit: true } },
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.json(full);
  } catch (error) { next(error); }
};

export const deleteProcedure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const procedureId = req.params.id;

    await prisma.$transaction(async (tx) => {
      // 1. Load procedure for the name (used in movement notes)
      const proc = await tx.procedure.findUnique({
        where: { id: procedureId },
        include: {
          materials: true,
          patient: { select: { name: true } },
        },
      });
      if (!proc) throw new AppError('Procedimento não encontrado', 404);
      if (proc.status === 'CANCELADO') {
        throw new AppError('Procedimento já está cancelado', 400);
      }

      // 2. Estorno ALL linked materials (CANCELAMENTO) — atomic with cancellation
      for (const pm of proc.materials) {
        await returnStock(
          tx,
          pm.materialId,
          pm.quantity,
          procedureId,
          req.user!.id,
          'CANCELAMENTO',
          `Cancelamento do procedimento: ${proc.name} (Paciente: ${proc.patient?.name ?? ''})`,
        );
      }

      // 3. Mark procedure as CANCELADO
      await tx.procedure.update({
        where: { id: procedureId },
        data: { status: 'CANCELADO' },
      });
    });

    res.json({ message: 'Procedimento cancelado com sucesso. Estoque estornado.' });
  } catch (error) { next(error); }
};
