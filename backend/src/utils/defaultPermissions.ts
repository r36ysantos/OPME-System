export interface ModulePermission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const SYSTEM_MODULES = [
  { key: 'DASHBOARD',   label: 'Dashboard',         description: 'Painel de controle e estatísticas gerais' },
  { key: 'PATIENTS',    label: 'Pacientes',          description: 'Cadastro e gestão de pacientes' },
  { key: 'DOCTORS',     label: 'Médicos',            description: 'Cadastro de médicos e especialidades' },
  { key: 'SUPPLIERS',   label: 'Fornecedores',       description: 'Gestão de fornecedores de materiais' },
  { key: 'MATERIALS',   label: 'Materiais OPME',     description: 'Cadastro de órteses, próteses e materiais' },
  { key: 'PROCEDURES',  label: 'Procedimentos',      description: 'Solicitações de procedimentos cirúrgicos' },
  { key: 'WORKFLOWS',   label: 'Workflows',          description: 'Controle de fluxo de aprovação' },
  { key: 'REPORTS',     label: 'Relatórios',         description: 'Relatórios gerenciais e exportações' },
  { key: 'FILES',       label: 'Arquivos',           description: 'Arquivos e documentos dos pacientes' },
  { key: 'USERS',       label: 'Usuários',           description: 'Gestão de usuários do sistema' },
  { key: 'AUDIT',       label: 'Auditoria',          description: 'Logs de auditoria e rastreabilidade' },
];

const ALL_ACCESS: Omit<ModulePermission, 'module'>        = { canView: true,  canCreate: true,  canEdit: true,  canDelete: true };
const VIEW_CREATE: Omit<ModulePermission, 'module'>       = { canView: true,  canCreate: true,  canEdit: false, canDelete: false };
const VIEW_CREATE_EDIT: Omit<ModulePermission, 'module'>  = { canView: true,  canCreate: true,  canEdit: true,  canDelete: false };
const VIEW_ONLY: Omit<ModulePermission, 'module'>         = { canView: true,  canCreate: false, canEdit: false, canDelete: false };

const DEFAULT_PERMISSIONS: Record<string, ModulePermission[]> = {
  ADMIN: [], // Admin bypasses all module checks — this list is never used

  COORDENADOR_OPME: [
    { module: 'DASHBOARD',  ...ALL_ACCESS },
    { module: 'PATIENTS',   ...ALL_ACCESS },
    { module: 'DOCTORS',    ...ALL_ACCESS },
    { module: 'SUPPLIERS',  ...ALL_ACCESS },
    { module: 'MATERIALS',  ...ALL_ACCESS },
    { module: 'PROCEDURES', ...ALL_ACCESS },
    { module: 'WORKFLOWS',  ...ALL_ACCESS },
    { module: 'REPORTS',    ...VIEW_ONLY },
    { module: 'FILES',      ...ALL_ACCESS },
    { module: 'USERS',      ...VIEW_ONLY },
    { module: 'AUDIT',      ...VIEW_ONLY },
  ],

  ANALISTA_OPME: [
    { module: 'DASHBOARD',  ...VIEW_ONLY },
    { module: 'PATIENTS',   ...VIEW_CREATE_EDIT },
    { module: 'DOCTORS',    ...VIEW_ONLY },
    { module: 'MATERIALS',  ...VIEW_CREATE_EDIT },
    { module: 'PROCEDURES', ...VIEW_CREATE_EDIT },
    { module: 'WORKFLOWS',  ...VIEW_CREATE_EDIT },
    { module: 'FILES',      ...VIEW_CREATE_EDIT },
  ],

  ASSISTENTE_OPME: [
    { module: 'DASHBOARD',  ...VIEW_ONLY },
    { module: 'PATIENTS',   ...VIEW_CREATE },
    { module: 'PROCEDURES', ...VIEW_CREATE },
    { module: 'WORKFLOWS',  ...VIEW_ONLY },
    { module: 'FILES',      ...VIEW_CREATE },
  ],

  COMPRADOR_OPME: [
    { module: 'DASHBOARD',  ...VIEW_ONLY },
    { module: 'SUPPLIERS',  ...VIEW_CREATE_EDIT },
    { module: 'MATERIALS',  ...VIEW_CREATE_EDIT },
    { module: 'PROCEDURES', ...VIEW_ONLY },
    { module: 'WORKFLOWS',  ...VIEW_ONLY },
  ],

  ENFERMEIRO_AUDITOR: [
    { module: 'DASHBOARD',  ...VIEW_ONLY },
    { module: 'PATIENTS',   ...VIEW_ONLY },
    { module: 'PROCEDURES', ...VIEW_ONLY },
    { module: 'WORKFLOWS',  ...VIEW_ONLY },
    { module: 'AUDIT',      ...VIEW_ONLY },
  ],
};

export function getDefaultPermissions(role: string): ModulePermission[] {
  return DEFAULT_PERMISSIONS[role] ?? [];
}
