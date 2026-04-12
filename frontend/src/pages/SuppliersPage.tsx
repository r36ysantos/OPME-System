import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  contact?: string;
  sla?: string;
  active: boolean;
  _count?: { materials: number };
}

function formatCNPJ(cnpj: string) {
  const n = cnpj.replace(/\D/g, '');
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search, page],
    queryFn: () => api.get('/suppliers', { params: { search, page, limit: 15 } }).then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm<Supplier>();

  const mutation = useMutation({
    mutationFn: (d: any) => editing ? api.put(`/suppliers/${editing.id}`, d) : api.post('/suppliers', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setIsModalOpen(false); reset(); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setValue('name', s.name);
    setValue('cnpj', formatCNPJ(s.cnpj));
    setValue('email', s.email || '' as any);
    setValue('phone', s.phone || '' as any);
    setValue('city', s.city || '' as any);
    setValue('state', s.state || '' as any);
    setValue('contact', s.contact || '' as any);
    setValue('sla', s.sla || '' as any);
    setIsModalOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Fornecedor' },
    { key: 'cnpj', header: 'CNPJ', render: (s: Supplier) => formatCNPJ(s.cnpj) },
    { key: 'contact', header: 'Contato', render: (s: Supplier) => s.contact || '—' },
    { key: 'phone', header: 'Telefone', render: (s: Supplier) => s.phone || '—' },
    { key: 'sla', header: 'SLA', render: (s: Supplier) => s.sla || '—' },
    { key: 'materials', header: 'Materiais', render: (s: Supplier) => <Badge variant="info">{s._count?.materials || 0}</Badge> },
    { key: 'active', header: 'Status', render: (s: Supplier) => <Badge variant={s.active ? 'success' : 'danger'}>{s.active ? 'Ativo' : 'Inativo'}</Badge> },
    {
      key: 'actions', header: 'Ações',
      render: (s: Supplier) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="h-4 w-4" /></button>
          <button onClick={() => { if (confirm('Desativar fornecedor?')) deleteMutation.mutate(s.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-sm text-gray-500">Gestão de fornecedores e contratos</p>
        </div>
        <button onClick={() => { setEditing(null); reset(); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </button>
      </div>

      <div className="card">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nome ou CNPJ..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Table columns={columns} data={data?.data || []} isLoading={isLoading}
          pagination={data ? { page, pages: data.pages, total: data.total, limit: 15, onPageChange: setPage } : undefined} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'} size="lg">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Razão Social *</label><input className="input" {...register('name', { required: true })} /></div>
          <div><label className="label">CNPJ *</label><input className="input" {...register('cnpj', { required: true })} placeholder="00.000.000/0000-00" /></div>
          <div><label className="label">SLA</label><input className="input" {...register('sla')} placeholder="5 dias úteis" /></div>
          <div><label className="label">E-mail</label><input className="input" type="email" {...register('email')} /></div>
          <div><label className="label">Telefone</label><input className="input" {...register('phone')} /></div>
          <div><label className="label">Contato</label><input className="input" {...register('contact')} /></div>
          <div><label className="label">Cidade</label><input className="input" {...register('city')} /></div>
          <div><label className="label">Estado</label><input className="input" {...register('state')} maxLength={2} /></div>
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
