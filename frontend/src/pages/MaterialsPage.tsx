import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import {
  Plus, Search, Edit, Trash2, AlertTriangle,
  History, ArrowDownCircle, ArrowUpCircle, Loader2, X,
} from 'lucide-react';
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

interface StockMovement {
  id: string;
  type: 'SAIDA' | 'ESTORNO' | 'CANCELAMENTO';
  quantity: number;
  previousStock: number;
  newStock: number;
  notes?: string;
  createdAt: string;
  procedure?: {
    id: string;
    name: string;
    status: string;
    patient?: { id: string; name: string };
  };
  user: { id: string; name: string };
}

const movementTypeConfig: Record<string, { label: string; color: string; Icon: any }> = {
  SAIDA:        { label: 'Saída (Lançamento)',  color: 'text-red-600 bg-red-50',     Icon: ArrowDownCircle },
  ESTORNO:      { label: 'Estorno (Remoção)',   color: 'text-green-600 bg-green-50', Icon: ArrowUpCircle },
  CANCELAMENTO: { label: 'Estorno (Cancel.)',   color: 'text-yellow-700 bg-yellow-50', Icon: ArrowUpCircle },
};

// ─── Stock Movement History Modal ─────────────────────────────────────────────

function StockMovementsModal({
  material,
  onClose,
}: {
  material: Material;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['material-movements', material.id, page],
    queryFn: () =>
      api.get(`/materials/${material.id}/movements`, { params: { page, limit } }).then(r => r.data),
  });

  const movements: StockMovement[] = data?.data || [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Histórico de Movimentações</h3>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {material.name} — Cód: {material.code}
              <span className={`ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                material.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                Saldo atual: {material.quantity} {material.unit || ''}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center justify-center h-24 text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando movimentações...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma movimentação registrada</p>
              <p className="text-xs mt-1">Movimentações aparecem automaticamente quando OPMEs são lançados em procedimentos.</p>
            </div>
          ) : (
            <>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-3 font-semibold text-gray-600">Tipo</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-600">Qtd</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-600">Saldo Ant.</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-600">Saldo Novo</th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-600">Procedimento</th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-600">Paciente</th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-600">Usuário</th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-600">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movements.map(mv => {
                      const cfg = movementTypeConfig[mv.type];
                      const Icon = cfg.Icon;
                      return (
                        <tr key={mv.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                              <Icon className="h-3.5 w-3.5" />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`font-bold text-base ${mv.type === 'SAIDA' ? 'text-red-600' : 'text-green-600'}`}>
                              {mv.type === 'SAIDA' ? '-' : '+'}{mv.quantity}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-500">{mv.previousStock}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="font-semibold text-gray-800">{mv.newStock}</span>
                          </td>
                          <td className="px-3 py-3">
                            {mv.procedure ? (
                              <div>
                                <p className="font-medium text-gray-800 text-xs leading-tight">{mv.procedure.name}</p>
                                <p className="text-xs text-gray-400">{mv.procedure.status}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">
                            {mv.procedure?.patient?.name || '—'}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500">{mv.user.name}</td>
                          <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(mv.createdAt).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.pages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                  <span>{data.total} movimentação(ões) no total</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1.5 bg-gray-50 rounded-lg font-medium text-gray-700">
                      {page} / {data.pages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                      disabled={page === data.pages}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MaterialsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [movementsFor, setMovementsFor] = useState<Material | null>(null);
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
    {
      key: 'quantity', header: 'Estoque',
      render: (m: Material) => (
        <Badge variant={m.quantity > 0 ? 'success' : 'danger'}>{m.quantity} {m.unit || ''}</Badge>
      ),
    },
    {
      key: 'expiryDate', header: 'Validade',
      render: (m: Material) => {
        if (!m.expiryDate) return '—';
        const variant = isExpired(m.expiryDate) ? 'danger' : isExpiringSoon(m.expiryDate) ? 'warning' : 'default';
        return (
          <div className="flex items-center gap-1">
            {(isExpiringSoon(m.expiryDate) || isExpired(m.expiryDate)) && (
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
            )}
            <Badge variant={variant}>{new Date(m.expiryDate).toLocaleDateString('pt-BR')}</Badge>
          </div>
        );
      },
    },
    {
      key: 'unitPrice', header: 'Preço',
      render: (m: Material) => m.unitPrice ? `R$ ${Number(m.unitPrice).toFixed(2)}` : '—',
    },
    {
      key: 'active', header: 'Status',
      render: (m: Material) => <Badge variant={m.active ? 'success' : 'danger'}>{m.active ? 'Ativo' : 'Inativo'}</Badge>,
    },
    {
      key: 'actions', header: 'Ações',
      render: (m: Material) => (
        <div className="flex gap-2">
          <button
            onClick={() => setMovementsFor(m)}
            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
            title="Histórico de movimentações"
          >
            <History className="h-4 w-4" />
          </button>
          <button
            onClick={() => openEdit(m)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => { if (confirm('Desativar material?')) deleteMutation.mutate(m.id); }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
            title="Desativar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
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
        <button
          onClick={() => { setEditing(null); reset(); setIsModalOpen(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Novo Material
        </button>
      </div>

      <div className="card">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome, código ou lote..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Table
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          pagination={data ? { page, pages: data.pages, total: data.total, limit: 15, onPageChange: setPage } : undefined}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); reset(); }}
        title={editing ? 'Editar Material' : 'Novo Material OPME'}
        size="xl"
      >
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nome *</label>
            <input className="input" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Código *</label>
            <input className="input" {...register('code', { required: true })} placeholder="PT-001" />
          </div>
          <div>
            <label className="label">Lote</label>
            <input className="input" {...register('lot')} />
          </div>
          <div>
            <label className="label">Quantidade em Estoque</label>
            <input className="input" type="number" {...register('quantity')} defaultValue={0} />
          </div>
          <div>
            <label className="label">Preço Unitário (R$)</label>
            <input className="input" type="number" step="0.01" {...register('unitPrice')} />
          </div>
          <div>
            <label className="label">Unidade</label>
            <input className="input" {...register('unit')} placeholder="un, cx, par..." />
          </div>
          <div>
            <label className="label">Validade</label>
            <input className="input" type="date" {...register('expiryDate')} />
          </div>
          <div>
            <label className="label">Marca</label>
            <input className="input" {...register('brand')} />
          </div>
          <div>
            <label className="label">Registro ANVISA</label>
            <input className="input" {...register('anvisa')} />
          </div>
          <div className="col-span-2">
            <label className="label">Fornecedor</label>
            <select className="input" {...register('supplierId')}>
              <option value="">Selecione um fornecedor</option>
              {(suppliers || []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Descrição</label>
            <textarea className="input" rows={2} {...register('description')} />
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Movements Modal */}
      {movementsFor && (
        <StockMovementsModal
          material={movementsFor}
          onClose={() => setMovementsFor(null)}
        />
      )}
    </div>
  );
}
