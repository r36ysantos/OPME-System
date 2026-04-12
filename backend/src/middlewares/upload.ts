import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Original storage: organized by year/month (for procedure attachments)
const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dir = path.join(
      uploadDir,
      new Date().getFullYear().toString(),
      String(new Date().getMonth() + 1).padStart(2, '0'),
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: Request, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

// Patient storage: organized by patient ID
const patientStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    // req.params.patientId is available because route params are resolved before middleware
    const patientId = (req.params as any).patientId || req.body.patientId || 'general';
    const dir = path.join(uploadDir, 'patients', patientId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: Request, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

// Types allowed for original upload (from env)
const allowedTypes = (
  process.env.ALLOWED_FILE_TYPES ||
  'application/pdf,image/jpeg,image/png,image/jpg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
).split(',');

// Broader set for patient files
export const PATIENT_ALLOWED_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'],
  document: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
};

export const ALL_PATIENT_TYPES = Object.values(PATIENT_ALLOWED_TYPES).flat();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  }
};

const patientFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALL_PATIENT_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  }
};

// Single file upload (original behavior)
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
});

// Multiple files upload organized by patient folder
export const uploadPatient = multer({
  storage: patientStorage,
  fileFilter: patientFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50 MB per file
    files: 20,
  },
});
