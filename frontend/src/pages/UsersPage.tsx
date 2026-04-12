import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import {
  Plus, Edit, UserCheck, UserX, ShieldCheck, RotateCcw,
  Check, X, ChevronDown, ChevronUp, Info, KeyRound, Eye, EyeOff, CheckCircle2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULES = [
  { key: 'DASHBOARD',  label: 'Dashboard',        description: 'Painel de estatísticas' },
  { key: 'PATIENTS',   label: 'Pacientes',         description: 'Cadastro de pacientes' },
  { key: 'DOCTORS',    label: 'Médicos',           description: 'Cadastro de médicos' },
  { key: 'SUPPLIERS',  label: 'Fornecedores',      description: 'Gestão de fornecedores' },
  { key: 'MATERIALS',  label: 'Materiais OPME',    description: 'Órteses, próteses e materiais' },
  { key: 'PROCEDURES', label: 'Procedimentos',     description: 'Solicitações cirúrgicas' },
  { key: 'WORKFLOWS',  label: 'Workflows',         description: 'Fluxo de aprovação' },
  { key: 'REPORTS',    label: 'Relatórios',        description: 'Relatórios e exportações' },
  { key: 'FILES',      label: 'Arquivos',          description: 'Documentos dos pacientes' },
  { key: 'USERS',      label: 'Usuários',          description: 'Gestão de usuários' },
  { key: 'AUDIT',      label: 'Auditoria',         description: 'Logs do sistema' },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  COORDENADOR_OPME: 'Coordenador OPME',
  ANALISTA_OPME: 'Analista OPME',
  ASSISTENTE_OPME: 'Assistente OPME',
  COMPRADOR_OPME: 'Comprador OPME',
  ENFERMEIRO_AUDITOR: 'Enfermeiro Auditor',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'danger',
  COORDENADOR_OPME: 'purple',
  ANALISTA_OPME: 'info',
  ASSISTENTE_OPME: 'default',
  COMPRADOR_OPME: 'warning',
  ENFERMEIRO_AUDITOR: 'success',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Permission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  receivedPermissions: Permission[];
}

// ─── Permission cell ──────────────────────────────────────────────────────────

function Cell({ val, onClick }: { val: boolean; onClick: () => void }) {
  return (
    <td className="px-2 py-2 text-center cursor-pointer" onClick={onClick}>
      <button className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
        val ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
      }`}>
        {val ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
      </button>
    </td>
  );
}

// ─── Admin Reset Password Modal ───────────────────────────────────────────────

function ResetPasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [form, setForm]       = useState({ newPassword: '', confirmPassword: '' });
  const [show, setShow]       = useState({ next: false, confirm: false });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const checkRules = (p: string) => ({
    len:     /.{8,}/.test(p),
    upper:   /[A-Z]/.test(p),
    lower:   /[a-z]/.test(p),
    digit:   /[0-9]/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  });
  const rules   = checkRules(form.newPassword);
  const allOk   = Object.values(rules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!allOk) { setError('A nova senha não atende aos requisitos mínimos.'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      await api.put(`/users/${user.id}/reset-password`, form);
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  const pwField = (
    label: string,
    key:   'newPassword' | 'confirmPassword',
    showKey: 'next' | 'confirm',
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show[showKey] ? 'text' : 'password'}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="input-field pr-10"
          required
          disabled={loading || success}
        />
        <button type="button" className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
          onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))} tabIndex={-1}>
          {show[showKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  if (success) {
    return (
      <Modal isOpen onClose={onClose} title="Senha redefinida">
        <div className="py-8 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <p className="text-gray-700 font-medium">Senha de <strong>{user.name}</strong> redefinida com sucesso!</p>
          <p className="text-sm text-gray-500">O usuário deverá fazer login novamente.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title={`Redefinir senha — ${user.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
          O usuário será desconectado de todas as sessões ativas após a redefinição.
        </div>
        {pwField('Nova senha', 'newPassword', 'next')}
        {form.newPassword && (
          <ul className="text-xs space-y-1">
            {([
              [rules.len,     'Mínimo 8 caracteres'],
              [rules.upper,   'Letra maiúscula'],
              [rules.lower,   'Letra minúscula'],
              [rules.digit,   'Número'],
              [rules.special, 'Caractere especial'],
            ] as [boolean, string][]).map(([ok, hint]) => (
              <li key={hint} className={`flex items-center gap-1 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                <span>{ok ? '✓' : '○'}</span> {hint}
              </li>
            ))}
          </ul>
        )}
        {pwField('Confirmar nova senha', 'confirmPassword', 'confirm')}
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading || !allOk}>
            {loading ? 'Redefinindo…' : 'Redefinir Senha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Permission Matrix Modal ──────────────────────────────────────────────────

function PermissionMatrix({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const qc = useQueryClient();

  const buildInitial = (): Record<string, Permission> => {
    const map: Record<string, Permission> = {};
    MODULES.forEach((m) => {
      const ex = user.receivedPermissions.find((p) => p.module === m.key);
      map[m.key] = ex ?? { module: m.key, canView: false, canCreate: false, canEdit: false, canDelete: false };
    });
    return map;
  };

  const [perms, setPerms] = useState<Record<string, Permission>>(buildInitial);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleCell = (module: string, field: keyof Omit<Permission, 'module'>) => {
    setPerms((prev) => {
      const cur = { ...prev[module] };
      const next = { ...cur, [field]: !cur[field] };
      if (field !== 'canView' && next[field]) next.canView = true;
      if (field === 'canView' && !next.canView) {
        next.canCreate = false; next.canEdit = false; next.canDelete = false;
      }
      return { ...prev, [module]: next };
    });
  };

  const setRow = (module: string, val: boolean) =>
    setPerms((prev) => ({ ...prev, [module]: { module, canView: val, canCreate: val, canEdit: val, canDelete: val } }));

  const setCol = (field: keyof Omit<Permission, 'module'>, val: boolean) =>
    setPerms((prev) => {
      const next = { ...prev };
      MODULES.forEach((m) => {
        next[m.key] = { ...next[m.key], [field]: val };
        if (field !== 'canView' && val) next[m.key].canView = true;
        if (field === 'canView' && !val) {
          next[m.key].canCreate = false; next[m.key].canEdit = false; next[m.key].canDelete = false;
        }
      });
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.values(perms).filter((p) => p.canView || p.canCreate || p.canEdit || p.canDelete);
      await api.put(`/permissions/${user.id}`, { permissions: payload, notes });
      qc.invalidateQueries({ queryKey: ['users'] });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao salvar permissões.');
    } finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!confirm(`Redefinir permissões de ${user.name} para o padrão do perfil ${ROLE_LABELS[user.role]}?`)) return;
    setResetting(true);
    try {
      const { data } = await api.post(`/permissions/${user.id}/reset`);
      const newMap: Record<string, Permission> = {};
      MODULES.forEach((m) => {
        const found = data.permissions.find((p: Permission) => p.module === m.key);
        newMap[m.key] = found ?? { module: m.key, canView: false, canCreate: false, canEdit: false, canDelete: false };
      });
      setPerms(newMap);
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao redefinir.');
    } finally { setResetting(false); }
  };

  const grantedCount = Object.values(perms).filter((p) => p.canView).length;
  const actionCols = [
    { field: 'canView'   as const, label: 'Ver' },
    { field: 'canCreate' as const, label: 'Criar' },
    { field: 'canEdit'   as const, label: 'Editar' },
    { field: 'canDelete' as const, label: 'Excluir' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Gerenciar Permissões</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
              {user.name}
              <Badge variant={(ROLE_COLORS[user.role] as any) || 'default'}>{ROLE_LABELS[user.role] || user.role}</Badge>
              <span className="text-gray-400">{grantedCount} módulo(s) com acesso</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border-b border-blue-100 px-5 py-2.5 text-sm text-blue-700 flex-shrink-0">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Clique nas células para alternar. Habilitar Criar/Editar/Excluir ativa Ver automaticamente.</span>
        </div>

        {/* Matrix */}
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-700 min-w-[160px]">Módulo</th>
                {actionCols.map(({ field, label }) => {
                  const allOn = MODULES.every((m) => perms[m.key]?.[field]);
                  return (
                    <th key={field} className="px-2 py-2 text-center font-semibold text-gray-600 w-20">
                      <div className="flex flex-col items-center gap-1">
                        <span>{label}</span>
                        <button onClick={() => setCol(field, !allOn)}
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${allOn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {allOn ? 'Todos ✓' : 'Todos'}
                        </button>
                      </div>
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-center text-gray-500 text-xs w-16">Tudo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MODULES.map((mod) => {
                const p = perms[mod.key];
                const allOn = p.canView && p.canCreate && p.canEdit && p.canDelete;
                return (
                  <tr key={mod.key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-800">{mod.label}</p>
                      <p className="text-xs text-gray-400">{mod.description}</p>
                    </td>
                    {actionCols.map(({ field }) => (
                      <Cell key={field} val={p[field]} onClick={() => toggleCell(mod.key, field)} />
                    ))}
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => setRow(mod.key, !allOn)}
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${allOn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {allOn ? '✓' : '—'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 flex-shrink-0 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Observação (opcional)</label>
            <input className="input mt-1" placeholder="Ex: Permissões temporárias para cobertura..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <button onClick={handleReset} disabled={resetting} className="btn-secondary flex items-center gap-2 text-sm">
              <RotateCcw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} /> Padrões do Perfil
            </button>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving || saved}
                className={`btn-primary flex items-center gap-2 ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                {saved ? <><Check className="h-4 w-4" /> Salvo!</> : saving ? 'Salvando...' : <><ShieldCheck className="h-4 w-4" /> Salvar Permissões</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Permission summary chips ─────────────────────────────────────────────────

function PermissionSummary({ perms }: { perms: Permission[] }) {
  if (perms.length === 0) return <span className="text-xs text-gray-400 italic">Sem permissões atribuídas</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {perms.slice(0, 5).map((p) => (
        <span key={p.module} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
          {MODULES.find((m) => m.key === p.module)?.label ?? p.module}
        </span>
      ))}
      {perms.length > 5 && <span className="text-xs text-gray-400">+{perms.length - 5}</span>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [isUserModalOpen, setIsUserModalOpen]   = useState(false);
  const [editing, setEditing]                   = useState<UserRow | null>(null);
  const [permTarget, setPermTarget]             = useState<UserRow | null>(null);
  const [resetPwTarget, setResetPwTarget]       = useState<UserRow | null>(null);
  const [expandedUser, setExpandedUser]         = useState<string | null>(null);
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: users = [], isLoading } = useQuery<UserRow[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm();

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? api.put(`/users/${editing.id}`, d) : api.post('/users', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setIsUserModalOpen(false); reset(); setEditing(null); },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.put(`/users/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setValue('name', u.name);
    setValue('role', u.role);
    setValue('phone', u.phone || '');
    setIsUserModalOpen(true);
  };

  const admins    = users.filter((u) => u.role === 'ADMIN');
  const nonAdmins = users.filter((u) => u.role !== 'ADMIN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários & Permissões</h1>
          <p className="text-sm text-gray-500">Gerencie usuários e controle de acesso granular por módulo</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditing(null); reset(); setIsUserModalOpen(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Usuário
          </button>
        )}
      </div>

      {/* Admins */}
      {admins.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Administradores</h2>
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Acesso total</span>
          </div>
          <div className="space-y-2">
            {admins.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold text-sm">{u.name.charAt(0)}</div>
                  <div>
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="danger">Administrador</Badge>
                  <Badge variant={u.active ? 'success' : 'danger'}>{u.active ? 'Ativo' : 'Inativo'}</Badge>
                  {isAdmin && (
                    <button onClick={() => openEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Non-admin users */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Usuários do Sistema</h2>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{nonAdmins.length} usuário(s)</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : nonAdmins.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {nonAdmins.map((u) => (
              <div key={u.id} className={`border rounded-xl overflow-hidden ${u.active ? 'border-gray-200' : 'border-gray-100 opacity-70'}`}>
                {/* Row */}
                <div className="flex items-center gap-4 p-3 bg-white hover:bg-gray-50 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${u.active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-800">{u.name}</p>
                      <Badge variant={(ROLE_COLORS[u.role] as any) || 'default'}>{ROLE_LABELS[u.role] || u.role}</Badge>
                      <Badge variant={u.active ? 'success' : 'danger'}>{u.active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                  </div>
                  <div className="flex-1 hidden lg:block">
                    <p className="text-xs text-gray-400 mb-1">Módulos habilitados:</p>
                    <PermissionSummary perms={u.receivedPermissions} />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isAdmin && (
                      <button onClick={() => setPermTarget(u)}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <ShieldCheck className="h-3.5 w-3.5" /> Permissões
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => setResetPwTarget(u)}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Redefinir senha">
                        <KeyRound className="h-3.5 w-3.5" /> Senha
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => openEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="h-4 w-4" /></button>
                    )}
                    <button
                      onClick={() => toggleActive.mutate({ id: u.id, active: !u.active })}
                      className={`p-1.5 rounded-lg ${u.active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                      {u.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                      className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                      {expandedUser === u.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedUser === u.id && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Permissões detalhadas</p>
                    {u.receivedPermissions.length === 0 ? (
                      <p className="text-sm text-gray-400">Nenhuma permissão atribuída. Clique em "Permissões" para configurar.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="text-xs w-full">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left pb-1 font-semibold pr-4">Módulo</th>
                              <th className="text-center pb-1 w-12">Ver</th>
                              <th className="text-center pb-1 w-12">Criar</th>
                              <th className="text-center pb-1 w-12">Editar</th>
                              <th className="text-center pb-1 w-14">Excluir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {u.receivedPermissions.map((p) => (
                              <tr key={p.module}>
                                <td className="py-1 font-medium text-gray-700 pr-4">
                                  {MODULES.find((m) => m.key === p.module)?.label ?? p.module}
                                </td>
                                {(['canView', 'canCreate', 'canEdit', 'canDelete'] as const).map((f) => (
                                  <td key={f} className="text-center py-1">
                                    {p[f]
                                      ? <Check className="h-3.5 w-3.5 text-green-500 mx-auto" />
                                      : <X className="h-3 w-3 text-gray-300 mx-auto" />}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permission Matrix Modal */}
      {permTarget && <PermissionMatrix user={permTarget} onClose={() => setPermTarget(null)} />}

      {/* Admin Reset Password Modal */}
      {resetPwTarget && <ResetPasswordModal user={resetPwTarget} onClose={() => setResetPwTarget(null)} />}

      {/* Create / Edit User Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => { setIsUserModalOpen(false); reset(); setEditing(null); }}
        title={editing ? 'Editar Usuário' : 'Novo Usuário'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" {...register('name', { required: true })} placeholder="Nome completo" />
          </div>
          {!editing && (
            <>
              <div>
                <label className="label">E-mail *</label>
                <input className="input" type="email" {...register('email', { required: true })} placeholder="usuario@hospital.com" />
              </div>
              <div>
                <label className="label">Senha *</label>
                <input className="input" type="password" {...register('password', { required: true })} placeholder="Mínimo 8 caracteres" />
              </div>
            </>
          )}
          <div>
            <label className="label">Perfil *</label>
            <select className="input" {...register('role', { required: true })}>
              <option value="">Selecione o perfil</option>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {!editing && (
              <p className="text-xs text-gray-400 mt-1">As permissões padrão do perfil serão aplicadas automaticamente.</p>
            )}
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" {...register('phone')} placeholder="(11) 99999-9999" />
          </div>
          {editing && (
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('active')}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
