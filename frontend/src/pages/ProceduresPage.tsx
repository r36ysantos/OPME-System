import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Plus, Search, Edit, Trash2, GitBranch } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<string, { label: string; variant: any }> = {
  PENDENTE: { label: 'Pendente', variant: 'warning' },
  EM_ANALISE: { label: 'Em Análise', variant: 'info' },
  APROVADO: { label: 'Aprovado', variant: 'success' },
  REPROVADO: { label: 'Reprovado', variant: 'danger' },
  EM_COMPRA: { label: 'Em Compra', variant: 'purple' },
  FINALIZADO: { label: 'Finalizado', variant: 'default' },
  CANCELADO: { label: 'Cancelado', variant: 'danger' },
};

const complexityConfig: Record<string, any> = {
  BAIXA: 'success', MEDIA: 'warning', ALTA: 'danger',
};

export default function ProceduresPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['procedures', search, page, statusFilter],
    queryFn: () => api.get('/procedures', { params: { search, page, limit: 15, status: statusFilter || undefined } }).then(r => r.data),
  });

  const { data: patients } = useQuery({ queryKey: ['patients-select'], queryFn: () => api.get('/patients', { params: { limit: 200 } }).then(r => r.data.data) });
  const { data: doctors } = useQuery({ queryKey: ['doctors-select'], queryFn: () => api.get('/doctors', { params: { limit: 200 } }).then(r => r.data.data) });

  const { register, handleSubmit, reset, setValue } = useForm();

  const mutation = useMutation({
    mutationFn: (d: any) => editing ? api.put(`/procedures/${editing.id}`, d) : api.post('/procedures', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['procedures'] }); setIsModalOpen(false); reset(); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/procedures/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procedures'] }),
  });

  const openEdit = (p: any) => {
    setEditing(p);
    setValue('name', p.name); setValue('type', p.type); setValue('complexity', p.complexity);
    setValue('patientId', p.patientId); setValue('doctorId', p.doctorId);
    setValue('notes', p.notes || ''); setValue('cid', p.cid || ''); setValue('tuss', p.tuss || '');
    if (p.scheduledAt) setValue('scheduledAt', p.scheduledAt.split('T')[0]);
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Procedimento' },
    { key: 'patient', header: 'Paciente', render: (p: any) => p.patient?.name || '—' },
    { key: 'doctor', header: 'Médico', render: (p: any) => p.doctor?.name || '—' },
    { key: 'type', header: 'Tipo' },
    { key: 'complexity', header: 'Complexidade', render: (p: any) => <Badge variant={complexityConfig[p.complexity] || 'default'}>{p.complexity}</Badge> },
    { key: 'status', header: 'Status', render: (p: any) => { const c = statusConfig[p.status]; return <Badge variant={c?.variant || 'default'}>{c?.label || p.status}</Badge>; } },
    { key: 'workflow', header: 'Etapa', render: (p: any) => p.workflow ? <Badge variant="info">{p.workflow.currentStep.replace(/_/g, ' ')}</Badge> : '—' },
    {
      key: 'actions', header: 'Ações',
      render: (p: any) => (
        <div className="flex gap-2">
          {p.workflow && <button onClick={() => navigate(`/workflows/${p.workflow.id}`)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Ver Workflow"><GitBranch className="h-4 w-4" /></button>}
          <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="h-4 w-4" /></button>
          <button onClick={() => { if (confirm('Cancelar procedimento?')) deleteMutation.mutate(p.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procedimentos</h1>
          <p className="text-sm text-gray-500">Controle de procedimentos e solicitações OPME</p>
        </div>
        <button onClick={() => { setEditing(null); reset(); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Procedimento
        </button>
      </div>

      <div className="card">
        <div className="mb-4 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input className="input pl-9" placeholder="Buscar por procedimento, paciente ou médico..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="input w-48" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <Table columns={columns} data={data?.data || []} isLoading={isLoading}
          pagination={data ? { page, pages: data.pages, total: data.total, limit: 15, onPageChange: setPage } : undefined} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title={editing ? 'Editar Procedimento' : 'Novo Procedimento'} size="xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Nome do Procedimento *</label><input className="input" {...register('name', { required: true })} /></div>
          <div>
            <label className="label">Paciente *</label>
            <select className="input" {...register('patientId', { required: true })}>
              <option value="">Selecione o paciente</option>
              {(patients || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Médico *</label>
            <select className="input" {...register('doctorId', { required: true })}>
              <option value="">Selecione o médico</option>
              {(doctors || []).map((d: any) => <option key={d.id} value={d.id}>{d.name} — {d.crm}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo *</label>
            <select className="input" {...register('type', { required: true })}>
              <option value="">Selecione</option>
              <option value="Ortopedia">Ortopedia</option>
              <option value="Cardiologia">Cardiologia</option>
              <option value="Neurologia">Neurologia</option>
              <option value="Oftalmologia">Oftalmologia</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
          <div>
            <label className="label">Complexidade *</label>
            <select className="input" {...register('complexity', { required: true })}>
              <option value="">Selecione</option>
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Média</option>
              <option value="ALTA">Alta</option>
            </select>
          </div>
          <div><label className="label">CID</label><input className="input" {...register('cid')} placeholder="M16.1" /></div>
          <div><label className="label">TUSS</label><input className="input" {...register('tuss')} /></div>
          <div className="col-span-2"><label className="label">Data Agendada</label><input className="input" type="date" {...register('scheduledAt')} /></div>
          <div className="col-span-2"><label className="label">Observações</label><textarea className="input" rows={2} {...register('notes')} /></div>
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
