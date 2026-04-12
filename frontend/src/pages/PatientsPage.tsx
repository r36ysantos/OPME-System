import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { Plus, Search, Edit, Trash2, FolderOpen, UserCheck, UserX } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Badge from '../components/ui/Badge';

interface Patient {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  phone?: string;
  email?: string;
  medicalRecord?: string;
  healthPlan?: string;
  city?: string;
  state?: string;
  active: boolean;
  _count?: { procedures: number };
}

function formatCPF(cpf: string) {
  const n = cpf.replace(/\D/g, '');
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: () => api.get('/patients', { params: { search, page, limit: 15 } }).then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm<Patient>();

  const mutation = useMutation({
    mutationFn: (d: any) => editingPatient
      ? api.put(`/patients/${editingPatient.id}`, d)
      : api.post('/patients', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      setIsModalOpen(false);
      reset();
      setEditingPatient(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.put(`/patients/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });

  const openEdit = (p: Patient) => {
    setEditingPatient(p);
    setValue('name', p.name);
    setValue('cpf', formatCPF(p.cpf));
    setValue('birthDate', p.birthDate?.split('T')[0] as any);
    setValue('phone', p.phone || '' as any);
    setValue('email', p.email || '' as any);
    setValue('medicalRecord', p.medicalRecord || '' as any);
    setValue('healthPlan', p.healthPlan || '' as any);
    setValue('city', p.city || '' as any);
    setValue('state', p.state || '' as any);
    setValue('active', p.active as any);
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'cpf', header: 'CPF', render: (p: Patient) => formatCPF(p.cpf) },
    { key: 'birthDate', header: 'Nascimento', render: (p: Patient) => new Date(p.birthDate).toLocaleDateString('pt-BR') },
    { key: 'phone', header: 'Telefone', render: (p: Patient) => p.phone || '—' },
    { key: 'healthPlan', header: 'Plano', render: (p: Patient) => p.healthPlan || '—' },
    { key: 'procedures', header: 'Procedimentos', render: (p: Patient) => <Badge variant="info">{p._count?.procedures || 0}</Badge> },
    { key: 'active', header: 'Status', render: (p: Patient) => <Badge variant={p.active ? 'success' : 'danger'}>{p.active ? 'Ativo' : 'Inativo'}</Badge> },
    {
      key: 'actions', header: 'Ações',
      render: (p: Patient) => (
        <div className="flex gap-2">
          <button onClick={() => navigate(`/patients/${p.id}/files`)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Gerenciar arquivos"><FolderOpen className="h-4 w-4" /></button>
          <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Edit className="h-4 w-4" /></button>
          {p.active ? (
            <button
              onClick={() => { if (confirm('Desativar este paciente?')) deleteMutation.mutate(p.id); }}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
              title="Desativar paciente"
            >
              <UserX className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => { if (confirm(`Reativar o paciente ${p.name}?`)) toggleActiveMutation.mutate({ id: p.id, active: true }); }}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
              title="Reativar paciente"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-sm text-gray-500">Gerenciamento de pacientes cadastrados</p>
        </div>
        <button onClick={() => { setEditingPatient(null); reset(); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Paciente
        </button>
      </div>

      <div className="card">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nome, CPF ou prontuário..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Table columns={columns} data={data?.data || []} isLoading={isLoading}
          pagination={data ? { page, pages: data.pages, total: data.total, limit: 15, onPageChange: setPage } : undefined} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); setEditingPatient(null); }}
        title={editingPatient ? 'Editar Paciente' : 'Novo Paciente'} size="lg">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nome completo *</label>
            <input className="input" {...register('name', { required: true })} placeholder="Nome do paciente" />
          </div>
          <div>
            <label className="label">CPF *</label>
            <input className="input" {...register('cpf', { required: true })} placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="label">Data de Nascimento *</label>
            <input className="input" type="date" {...register('birthDate', { required: true })} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" {...register('phone')} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" type="email" {...register('email')} placeholder="paciente@email.com" />
          </div>
          <div>
            <label className="label">Prontuário</label>
            <input className="input" {...register('medicalRecord')} placeholder="MR-2024-001" />
          </div>
          <div>
            <label className="label">Plano de Saúde</label>
            <input className="input" {...register('healthPlan')} placeholder="Unimed, SUS, etc." />
          </div>
          <div>
            <label className="label">Cidade</label>
            <input className="input" {...register('city')} placeholder="São Paulo" />
          </div>
          <div>
            <label className="label">Estado</label>
            <input className="input" {...register('state')} placeholder="SP" maxLength={2} />
          </div>
          {editingPatient && (
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('active')}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          )}
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
