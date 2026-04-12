import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import { PATIENT_ALLOWED_TYPES } from '../middlewares/upload';
import fs from 'fs';
import path from 'path';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFileCategory(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (
    PATIENT_ALLOWED_TYPES.document.includes(mimeType) ||
    mimeType === 'text/plain' ||
    mimeType === 'text/csv'
  ) return 'document';
  return 'other';
}

// ─── Single file upload (original, for procedure attachments) ─────────────────

export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) throw new AppError('Nenhum arquivo enviado', 400);

    const { patientId, procedureId, description } = req.body;

    const file = await prisma.file.create({
      data: {
        name: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        patientId: patientId || undefined,
        procedureId: procedureId || undefined,
        uploadedById: req.user!.id,
        description,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    res.status(201).json(file);
  } catch (error) {
    next(error);
  }
};

// ─── Multiple files upload for a patient ─────────────────────────────────────

export const uploadMultipleFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) throw new AppError('Nenhum arquivo enviado', 400);

    const patientId = req.params.patientId || req.body.patientId;
    if (!patientId) throw new AppError('patientId é obrigatório', 400);

    // Ensure patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new AppError('Paciente não encontrado', 404);

    const { procedureId, description } = req.body;

    const created = await Promise.all(
      files.map((file) =>
        prisma.file.create({
          data: {
            name: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            patientId,
            procedureId: procedureId || undefined,
            uploadedById: req.user!.id,
            description: description || undefined,
          },
          include: { uploadedBy: { select: { id: true, name: true } } },
        }),
      ),
    );

    res.status(201).json({ count: created.length, files: created });
  } catch (error) {
    // If DB insert failed, clean up uploaded files
    if (req.files) {
      (req.files as Express.Multer.File[]).forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    next(error);
  }
};

// ─── List files ───────────────────────────────────────────────────────────────

export const listFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId, procedureId, category, search } = req.query;
    const where: any = {};

    if (patientId) where.patientId = String(patientId);
    if (procedureId) where.procedureId = String(procedureId);
    if (search) where.originalName = { contains: String(search), mode: 'insensitive' };

    // Category filter (pdf / image / document)
    if (category && category !== 'all') {
      const types = PATIENT_ALLOWED_TYPES[String(category) as keyof typeof PATIENT_ALLOWED_TYPES];
      if (types) where.mimeType = { in: types };
    }

    const files = await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true } },
      },
    });

    // Enrich with derived fields
    const enriched = files.map((f) => ({
      ...f,
      category: getFileCategory(f.mimeType),
      exists: fs.existsSync(f.path),
    }));

    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

// ─── Get patient file stats ───────────────────────────────────────────────────

export const getPatientFileStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId } = req.params;

    const files = await prisma.file.findMany({
      where: { patientId },
      select: { mimeType: true, size: true },
    });

    const stats = {
      total: files.length,
      totalSize: files.reduce((acc, f) => acc + f.size, 0),
      byCategory: {
        pdf: files.filter((f) => f.mimeType === 'application/pdf').length,
        image: files.filter((f) => f.mimeType.startsWith('image/')).length,
        document: files.filter((f) => PATIENT_ALLOWED_TYPES.document.includes(f.mimeType)).length,
        other: files.filter((f) => getFileCategory(f.mimeType) === 'other').length,
      },
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// ─── View file inline (for browser preview) ──────────────────────────────────

export const viewFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) throw new AppError('Arquivo não encontrado', 404);

    if (!fs.existsSync(file.path)) {
      throw new AppError('Arquivo não encontrado no servidor', 404);
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(path.resolve(file.path));
  } catch (error) {
    next(error);
  }
};

// ─── Download file ────────────────────────────────────────────────────────────

export const downloadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) throw new AppError('Arquivo não encontrado', 404);

    if (!fs.existsSync(file.path)) {
      throw new AppError('Arquivo não encontrado no servidor', 404);
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.sendFile(path.resolve(file.path));
  } catch (error) {
    next(error);
  }
};

// ─── Delete file ──────────────────────────────────────────────────────────────

export const deleteFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) throw new AppError('Arquivo não encontrado', 404);

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    await prisma.file.delete({ where: { id: req.params.id } });
    res.json({ message: 'Arquivo excluído com sucesso' });
  } catch (error) {
    next(error);
  }
};
