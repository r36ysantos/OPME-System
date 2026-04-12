import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface Material {
  id: string;
  name: string;
  code: string;
  description?: string;
  lot?: string;
  expiryDate?: string;
  quantity: number;
  unitPrice?: number;
  unit?: string;
  brand?: string;
  anvisa?: string;
  supplierId?: string;
  active: boolean;
  supplier?: { id: string; name: string };
}

export default function MaterialsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['materials', search, page],
    queryFn: () => api.get('/materials', { params: { search, page, limit: 15 } }).then(r => r.data),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn: () => api.get('/suppliers', { params: { limit: 100 } }).then(r => r.data.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm<Material>();

  const mutation = useMutation({
    mutationFn: (d: any) => editing ? api.put(`/materials/${editing.id}`, d) : api.post('/materials', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); setIsModalOpen(false); reset(); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/materials/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  });

  const openEdit = (m: Material) => {
    setEditing(m);
    setValue('name', m.name);
    setValue('code', m.code);
    setValue('description', m.description || '' as any);
    setValue('lot', m.lot || '' as any);
    setValue('quantity', m.quantity);
    setValue('unitPrice', m.unitPrice as any);
    setValue('unit', m.unit || '' as any);
    setValue('brand', m.brand || '' as any);
    setValue('anvisa', m.anvisa || '' as any);
    setValue('supplierId', m.supplierId || '' as any);
    if (m.expiryDate) setValue('expiryDate', m.expiryDate.split('T')[0] as any);
    setIsModalOpen(true);
  };

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff > 0;
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const columns = [
    { key: 'name', header: 'Material' },
    { key: 'code', header: 'Código' },
    { key: 'supplier', header: 'Fornecedor', render: (m: Material) => m.supplier?.name || '—' },
    { key: 'quantity', header: 'Qtd.', render: (m: Material) => <Badge variant={m.quantity > 0 ? 'success' : 'danger'}>{m.quantity}</Badge> },
    {
      key: 'expiryDate', header: 'Validade',
      render: (m: Material) => {
        if (!m.expiryDate) return '—';
        const variant = isExpired(m.expiryDate) ? 'danger' : isExpiringSoon(m.expiryDate) ? 'warning' : 'default';
        return (
          <div className="flex items-center gap-1">
            {(isExpiringSoon(m.expiryDate) || isExpired(m.expiryDate)) && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
            <Badge variant={variant}>{new Date(m.expiryDate).toLocaleDateString('pt-BR')}</Badge>
          </div>
        );
      },
    },
    { key: 'unitPrice', header: 'Preço', render: (m: Material) => m.unitPrice ? `R$ ${Number(m.unitPrice).toFixed(2)}` : '—' },
    { key: 'active', header: 'Status', render: (m: Material) => <Badge variant={m.active ? 'success' : 'danger'}>{m.active ? 'Ativo' : 'Inativo'}</Badge> },
    {
      key: 'actions', header: 'Ações',
      render: (m: Material) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="h-4 w-4" /></button>
          <button onClick={() => { if (confirm('Desativar material?')) deleteMutation.mutate(m.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materiais OPME</h1>
          <p className="text-sm text-gray-500">Órteses, Próteses e Materiais Especiais</p>
        </div>
        <button onClick={() => { setEditing(null); reset(); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Material
        </button>
      </div>

      <div className="card">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nome, código ou lote..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Table columns={columns} data={data?.data || []} isLoading={isLoading}
          pagination={data ? { page, pages: data.pages, total: data.total, limit: 15, onPageChange: setPage } : undefined} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title={editing ? 'Editar Material' : 'Novo Material OPME'} size="xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Nome *</label><input className="input" {...register('name', { required: true })} /></div>
          <div><label className="label">Código *</label><input className="input" {...register('code', { required: true })} placeholder="PT-001" /></div>
          <div><label className="label">Lote</label><input className="input" {...register('lot')} /></div>
          <div><label className="label">Quantidade</label><input className="input" type="number" {...register('quantity')} defaultValue={0} /></div>
          <div><label className="label">Preço Unitário (R$)</label><input className="input" type="number" step="0.01" {...register('unitPrice')} /></div>
          <div><label className="label">Unidade</label><input className="input" {...register('unit')} placeholder="un, cx, par..." /></div>
          <div><label className="label">Validade</label><input className="input" type="date" {...register('expiryDate')} /></div>
          <div><label className="label">Marca</label><input className="input" {...register('brand')} /></div>
          <div><label className="label">Registro ANVISA</label><input className="input" {...register('anvisa')} /></div>
          <div className="col-span-2">
            <label className="label">Fornecedor</label>
            <select className="input" {...register('supplierId')}>
              <option value="">Selecione um fornecedor</option>
              {(suppliers || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="label">Descrição</label><textarea className="input" rows={2} {...register('description')} /></div>
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
