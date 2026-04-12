import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface Doctor {
  id: string;
  name: string;
  crm: string;
  specialty: string;
  phone?: string;
  email?: string;
  hospital?: string;
  active: boolean;
}

export default function DoctorsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', search, page],
    queryFn: () => api.get('/doctors', { params: { search, page, limit: 15 } }).then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm<Doctor>();

  const mutation = useMutation({
    mutationFn: (d: any) => editing ? api.put(`/doctors/${editing.id}`, d) : api.post('/doctors', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); setIsModalOpen(false); reset(); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/doctors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  });

  const openEdit = (d: Doctor) => {
    setEditing(d);
    (Object.entries(d) as [keyof Doctor, any][]).forEach(([k, v]) => setValue(k, v));
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'crm', header: 'CRM' },
    { key: 'specialty', header: 'Especialidade' },
    { key: 'hospital', header: 'Hospital', render: (d: Doctor) => d.hospital || '—' },
    { key: 'phone', header: 'Telefone', render: (d: Doctor) => d.phone || '—' },
    { key: 'active', header: 'Status', render: (d: Doctor) => <Badge variant={d.active ? 'success' : 'danger'}>{d.active ? 'Ativo' : 'Inativo'}</Badge> },
    {
      key: 'actions', header: 'Ações',
      render: (d: Doctor) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(d)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="h-4 w-4" /></button>
          <button onClick={() => { if (confirm('Desativar médico?')) deleteMutation.mutate(d.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Médicos</h1>
          <p className="text-sm text-gray-500">Cadastro de médicos e especialistas</p>
        </div>
        <button onClick={() => { setEditing(null); reset(); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Médico
        </button>
      </div>

      <div className="card">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nome, CRM ou especialidade..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Table columns={columns} data={data?.data || []} isLoading={isLoading}
          pagination={data ? { page, pages: data.pages, total: data.total, limit: 15, onPageChange: setPage } : undefined} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title={editing ? 'Editar Médico' : 'Novo Médico'}>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div><label className="label">Nome *</label><input className="input" {...register('name', { required: true })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">CRM *</label><input className="input" {...register('crm', { required: true })} placeholder="SP-123456" /></div>
            <div><label className="label">Especialidade *</label><input className="input" {...register('specialty', { required: true })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Telefone</label><input className="input" {...register('phone')} /></div>
            <div><label className="label">E-mail</label><input className="input" type="email" {...register('email')} /></div>
          </div>
          <div><label className="label">Hospital/Clínica</label><input className="input" {...register('hospital')} /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
