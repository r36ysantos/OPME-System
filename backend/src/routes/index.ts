import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middlewares/auth';
import { authorize, checkModule } from '../middlewares/rbac';
import { upload, uploadPatient } from '../middlewares/upload';
import { auditLog } from '../middlewares/audit';

// 5 password-change attempts per 15 minutes per IP
const passwordLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.' },
  skipSuccessfulRequests: true, // only count failures toward the limit
});

// Controllers
import * as authController       from '../controllers/authController';
import { adminResetUserPassword } from '../controllers/authController';
import * as patientController    from '../controllers/patientController';
import * as doctorController     from '../controllers/doctorController';
import * as supplierController   from '../controllers/supplierController';
import * as materialController   from '../controllers/materialController';
import * as procedureController  from '../controllers/procedureController';
import * as workflowController   from '../controllers/workflowController';
import * as fileController       from '../controllers/fileController';
import * as dashboardController  from '../controllers/dashboardController';
import * as reportController     from '../controllers/reportController';
import * as permissionController from '../controllers/permissionController';

export const router = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────

router.post('/auth/login',          authController.login);
router.get('/auth/profile',  authenticate, authController.getProfile);
router.put('/auth/change-password', authenticate, passwordLimiter, authController.changePassword);

// ─── User management (ADMIN only) ────────────────────────────────────────────

router.get('/users',                    authenticate, authorize('ADMIN', 'COORDENADOR_OPME'), authController.listUsers);
router.post('/users',                   authenticate, authorize('ADMIN'),                     authController.createUser);
router.put('/users/:id',                authenticate, authorize('ADMIN'),                     authController.updateUser);
router.put('/users/:id/reset-password', authenticate, authorize('ADMIN'), passwordLimiter,    adminResetUserPassword);

// ─── Permission management (ADMIN only) ──────────────────────────────────────

router.get('/permissions/modules',     authenticate, authorize('ADMIN'),          permissionController.listModules);
router.get('/permissions',             authenticate, authorize('ADMIN'),          permissionController.listAllPermissions);
router.get('/permissions/:userId',     authenticate, authorize('ADMIN'),          permissionController.getUserPermissions);
router.put('/permissions/:userId',     authenticate, authorize('ADMIN'), auditLog('UPDATE_PERMISSIONS', 'User'), permissionController.setUserPermissions);
router.post('/permissions/:userId/reset', authenticate, authorize('ADMIN'),       permissionController.resetToDefaults);

// ─── Dashboard ────────────────────────────────────────────────────────────────

router.get('/dashboard',   authenticate, checkModule('DASHBOARD', 'view'), dashboardController.getDashboard);
router.get('/audit-logs',  authenticate, checkModule('AUDIT',     'view'), dashboardController.getAuditLogs);

// ─── Reports ──────────────────────────────────────────────────────────────────

router.get('/reports/summary',        authenticate, checkModule('REPORTS', 'view'), reportController.getReportSummary);
router.get('/reports/export/excel',   authenticate, checkModule('REPORTS', 'view'), reportController.exportExcel);
router.get('/reports/export/csv',     authenticate, checkModule('REPORTS', 'view'), reportController.exportCSV);

// ─── Patients ─────────────────────────────────────────────────────────────────

router.get('/patients',     authenticate, checkModule('PATIENTS', 'view'),   patientController.listPatients);
router.get('/patients/:id', authenticate, checkModule('PATIENTS', 'view'),   patientController.getPatient);
router.post('/patients',    authenticate, checkModule('PATIENTS', 'create'), auditLog('CREATE', 'Patient'), patientController.createPatient);
router.put('/patients/:id', authenticate, checkModule('PATIENTS', 'edit'),   auditLog('UPDATE', 'Patient'), patientController.updatePatient);
router.delete('/patients/:id', authenticate, checkModule('PATIENTS', 'delete'), auditLog('DELETE', 'Patient'), patientController.deletePatient);

// ─── Doctors ──────────────────────────────────────────────────────────────────

router.get('/doctors',     authenticate, checkModule('DOCTORS', 'view'),   doctorController.listDoctors);
router.get('/doctors/:id', authenticate, checkModule('DOCTORS', 'view'),   doctorController.getDoctor);
router.post('/doctors',    authenticate, checkModule('DOCTORS', 'create'), auditLog('CREATE', 'Doctor'), doctorController.createDoctor);
router.put('/doctors/:id', authenticate, checkModule('DOCTORS', 'edit'),   auditLog('UPDATE', 'Doctor'), doctorController.updateDoctor);
router.delete('/doctors/:id', authenticate, checkModule('DOCTORS', 'delete'), doctorController.deleteDoctor);

// ─── Suppliers ────────────────────────────────────────────────────────────────

router.get('/suppliers',     authenticate, checkModule('SUPPLIERS', 'view'),   supplierController.listSuppliers);
router.get('/suppliers/:id', authenticate, checkModule('SUPPLIERS', 'view'),   supplierController.getSupplier);
router.post('/suppliers',    authenticate, checkModule('SUPPLIERS', 'create'), auditLog('CREATE', 'Supplier'), supplierController.createSupplier);
router.put('/suppliers/:id', authenticate, checkModule('SUPPLIERS', 'edit'),   auditLog('UPDATE', 'Supplier'), supplierController.updateSupplier);
router.delete('/suppliers/:id', authenticate, checkModule('SUPPLIERS', 'delete'), supplierController.deleteSupplier);

// ─── Materials ────────────────────────────────────────────────────────────────

router.get('/materials',     authenticate, checkModule('MATERIALS', 'view'),   materialController.listMaterials);
router.get('/materials/:id', authenticate, checkModule('MATERIALS', 'view'),   materialController.getMaterial);
router.post('/materials',    authenticate, checkModule('MATERIALS', 'create'), auditLog('CREATE', 'Material'), materialController.createMaterial);
router.put('/materials/:id', authenticate, checkModule('MATERIALS', 'edit'),   auditLog('UPDATE', 'Material'), materialController.updateMaterial);
router.delete('/materials/:id', authenticate, checkModule('MATERIALS', 'delete'), materialController.deleteMaterial);

// ─── Procedures ───────────────────────────────────────────────────────────────

router.get('/procedures',     authenticate, checkModule('PROCEDURES', 'view'),   procedureController.listProcedures);
router.get('/procedures/:id', authenticate, checkModule('PROCEDURES', 'view'),   procedureController.getProcedure);
router.post('/procedures',    authenticate, checkModule('PROCEDURES', 'create'), auditLog('CREATE', 'Procedure'), procedureController.createProcedure);
router.put('/procedures/:id', authenticate, checkModule('PROCEDURES', 'edit'),   auditLog('UPDATE', 'Procedure'), procedureController.updateProcedure);
router.delete('/procedures/:id', authenticate, checkModule('PROCEDURES', 'delete'), procedureController.deleteProcedure);

// ─── Workflows ────────────────────────────────────────────────────────────────

router.get('/workflows',             authenticate, checkModule('WORKFLOWS', 'view'), workflowController.listWorkflows);
router.get('/workflows/my-tasks',    authenticate, checkModule('WORKFLOWS', 'view'), workflowController.getMyTasks);
router.get('/workflows/:id',         authenticate, checkModule('WORKFLOWS', 'view'), workflowController.getWorkflow);
router.post('/workflows/:id/advance',authenticate, checkModule('WORKFLOWS', 'edit'), auditLog('ADVANCE', 'Workflow'), workflowController.advanceStep);
router.patch('/workflows/:id/priority', authenticate, checkModule('WORKFLOWS', 'edit'), workflowController.updatePriority);
router.put('/workflows/tasks/:taskId/assign', authenticate, checkModule('WORKFLOWS', 'edit'), workflowController.assignTask);

// ─── Files — single upload (procedure attachments) ────────────────────────────

router.post('/files/upload', authenticate, checkModule('FILES', 'create'), upload.single('file'), fileController.uploadFile);
router.get('/files',         authenticate, checkModule('FILES', 'view'),   fileController.listFiles);
router.get('/files/:id/view',     authenticate, checkModule('FILES', 'view'),   fileController.viewFile);
router.get('/files/:id/download', authenticate, checkModule('FILES', 'view'),   fileController.downloadFile);
router.delete('/files/:id',       authenticate, checkModule('FILES', 'delete'), fileController.deleteFile);

// ─── Patient file management — multi-upload ───────────────────────────────────

router.post('/patients/:patientId/files', authenticate, checkModule('FILES', 'create'), uploadPatient.array('files', 20), fileController.uploadMultipleFiles);
router.get('/patients/:patientId/files/stats', authenticate, checkModule('FILES', 'view'), fileController.getPatientFileStats);
