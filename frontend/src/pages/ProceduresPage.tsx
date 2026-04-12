import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import {
  Plus, Search, Edit, Trash2, GitBranch, X, Package,
  AlertCircle, AlertTriangle, Loader2, ArrowDownCircle,
  ArrowUpCircle, History,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Material {
  id: string;
  name: string;
  code: string;
  unit?: string;
  brand?: string;
  quantity: number;
  unitPrice?: number;
  supplier?: { id: string; name: string };
}

interface MaterialItem {
  tempId: string;
  materialId: string;
  name: string;
  code: string;
  defaultUnit: string;
  quantity: number;
  unit: string;
  notes: string;
  stockQuantity: number; // available stock at the time of selection
}

interface StockMovement {
  id: string;
  type: 'SAIDA' | 'ESTORNO' | 'CANCELAMENTO';
  quantity: number;
  previousStock: number;
  newStock: number;
  notes?: string;
  createdAt: string;
  material: { id: string; name: string; code: string; unit?: string };
  user: { id: string; name: string };
}

// ─── Status / complexity config ───────────────────────────────────────────────

const statusConfig: Record<string, { label: string; variant: any }> = {
  PENDENTE:   { label: 'Pendente',   variant: 'warning' },
  EM_ANALISE: { label: 'Em Análise', variant: 'info' },
  APROVADO:   { label: 'Aprovado',   variant: 'success' },
  REPROVADO:  { label: 'Reprovado',  variant: 'danger' },
  EM_COMPRA:  { label: 'Em Compra',  variant: 'purple' },
  FINALIZADO: { label: 'Finalizado', variant: 'default' },
  CANCELADO:  { label: 'Cancelado',  variant: 'danger' },
};

const complexityConfig: Record<string, any> = {
  BAIXA: 'success', MEDIA: 'warning', ALTA: 'danger',
};

const movementTypeConfig: Record<string, { label: string; color: string; Icon: any }> = {
  SAIDA:        { label: 'Saída',        color: 'text-red-600 bg-red-50',    Icon: ArrowDownCircle },
  ESTORNO:      { label: 'Estorno',      color: 'text-green-600 bg-green-50', Icon: ArrowUpCircle },
  CANCELAMENTO: { label: 'Cancelamento', color: 'text-yellow-700 bg-yellow-50', Icon: ArrowUpCircle },
};

// ─── Quick Add Material Modal ─────────────────────────────────────────────────

function QuickAddMaterialModal({
  onCreated,
  onClose,
}: {
  onCreated: (m: Material) => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn: () => api.get('/suppliers', { params: { limit: 100 } }).then(r => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/materials', d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      onCreated(res.data);
    },
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Cadastrar novo Material OPME</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nome *</label>
            <input className="input" {...register('name', { required: true })} placeholder="Ex: Prótese total de quadril" />
            {errors.name && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
          </div>
          <div>
            <label className="label">Código *</label>
            <input className="input" {...register('code', { required: true })} placeholder="PT-001" />
            {errors.code && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
          </div>
          <div>
            <label className="label">Unidade</label>
            <input className="input" {...register('unit')} placeholder="un, cx, par..." />
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
            <label className="label">Marca</label>
            <input className="input" {...register('brand')} />
          </div>
          <div>
            <label className="label">Registro ANVISA</label>
            <input className="input" {...register('anvisa')} />
          </div>
          <div>
            <label className="label">Lote</label>
            <input className="input" {...register('lot')} />
          </div>
          <div>
            <label className="label">Validade</label>
            <input className="input" type="date" {...register('expiryDate')} />
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

          {mutation.isError && (
            <div className="col-span-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {(mutation.error as any)?.response?.data?.error || 'Erro ao cadastrar material.'}
            </div>
          )}

          <div className="col-span-2 flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mutation.isPending ? 'Salvando...' : 'Cadastrar e Vincular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Material Search Autocomplete ─────────────────────────────────────────────

function MaterialSearch({
  onAdd,
  existingIds,
}: {
  onAdd: (m: Material) => void;
  existingIds: Set<string>;
}) {
  const [term, setTerm]             = useState('');
  const [debounced, setDebounced]   = useState('');
  const [open, setOpen]             = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(t);
  }, [term]);

  const { data: results = [], isFetching } = useQuery<Material[]>({
    queryKey: ['material-search', debounced],
    queryFn: () =>
      api.get('/materials', { params: { search: debounced, limit: 8 } })
        .then(r => r.data.data),
    enabled: debounced.length >= 1,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node) &&
          !inputRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (m: Material) => {
    if (!existingIds.has(m.id)) onAdd(m);
    setTerm('');
    setDebounced('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleQuickAdded = (m: Material) => {
    setShowQuickAdd(false);
    onAdd(m);
    setTerm('');
    setDebounced('');
  };

  const available = results.filter(m => !existingIds.has(m.id));

  return (
    <>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            className="input pl-9 pr-10"
            placeholder="Buscar material pelo nome ou código..."
            value={term}
            onChange={e => { setTerm(e.target.value); setOpen(true); }}
            onFocus={() => term.length >= 1 && setOpen(true)}
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
          )}
          {term && !isFetching && (
            <button
              type="button"
              onClick={() => { setTerm(''); setDebounced(''); setOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {open && debounced.length >= 1 && (
          <div
            ref={dropRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          >
            {available.length === 0 && !isFetching ? (
              <div className="p-3 space-y-2">
                <p className="text-sm text-gray-500 text-center py-1">
                  {results.length > 0
                    ? 'Todos os resultados já foram adicionados.'
                    : `Nenhum material encontrado para "${debounced}".`}
                </p>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setShowQuickAdd(true); }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" /> Cadastrar novo OPME: "{debounced}"
                </button>
              </div>
            ) : (
              <ul className="py-1 max-h-56 overflow-y-auto">
                {available.map(m => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(m)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors"
                    >
                      <Package className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                        <p className="text-xs text-gray-400">
                          Cód: {m.code}
                          {m.brand && ` · ${m.brand}`}
                          {m.unit && ` · ${m.unit}`}
                          {m.supplier && ` · ${m.supplier.name}`}
                        </p>
                      </div>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        m.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        Estoque: {m.quantity}
                      </span>
                    </button>
                  </li>
                ))}
                <li className="border-t border-gray-100 mt-1">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setShowQuickAdd(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Cadastrar novo OPME
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>

      {showQuickAdd && (
        <QuickAddMaterialModal
          onCreated={handleQuickAdded}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
    </>
  );
}

// ─── OPME Materials Section ───────────────────────────────────────────────────

function OpmeMaterialsSection({
  items,
  onChange,
}: {
  items: MaterialItem[];
  onChange: (items: MaterialItem[]) => void;
}) {
  const addMaterial = (m: Material) => {
    onChange([
      ...items,
      {
        tempId:        crypto.randomUUID(),
        materialId:    m.id,
        name:          m.name,
        code:          m.code,
        defaultUnit:   m.unit || '',
        quantity:      1,
        unit:          m.unit || '',
        notes:         '',
        stockQuantity: m.quantity, // capture available stock at add time
      },
    ]);
  };

  const updateItem = (tempId: string, field: keyof MaterialItem, value: any) => {
    onChange(items.map(it => it.tempId === tempId ? { ...it, [field]: value } : it));
  };

  const removeItem = (tempId: string) => {
    onChange(items.filter(it => it.tempId !== tempId));
  };

  const existingIds = new Set(items.map(i => i.materialId));

  // Check if any item has insufficient stock
  const hasStockIssues = items.some(it => it.quantity > it.stockQuantity);

  return (
    <div className="space-y-3">
      <MaterialSearch onAdd={addMaterial} existingIds={existingIds} />

      {hasStockIssues && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Um ou mais materiais têm quantidade solicitada maior que o estoque disponível.
            O sistema bloqueará o lançamento até que o estoque seja suficiente.
          </span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <Package className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">Nenhum material vinculado</p>
          <p className="text-xs mt-0.5">Use o campo de busca acima para adicionar</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 w-full">Material</th>
                <th className="text-center px-2 py-2.5 font-semibold text-gray-600 whitespace-nowrap w-20">Qtd. *</th>
                <th className="text-center px-2 py-2.5 font-semibold text-gray-600 whitespace-nowrap w-24">Estoque</th>
                <th className="text-center px-2 py-2.5 font-semibold text-gray-600 whitespace-nowrap w-24">Unidade</th>
                <th className="text-left px-2 py-2.5 font-semibold text-gray-600 w-40">Observação</th>
                <th className="px-2 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => {
                const insufficient = item.quantity > item.stockQuantity;
                return (
                  <tr key={item.tempId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${insufficient ? 'bg-red-50/40' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {insufficient && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-gray-800 leading-tight">{item.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Cód: {item.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateItem(item.tempId, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className={`w-full text-center border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                          insufficient
                            ? 'border-red-300 bg-red-50 focus:ring-red-400'
                            : 'border-gray-200 focus:ring-primary-500'
                        }`}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                        item.stockQuantity > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {item.stockQuantity}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={e => updateItem(item.tempId, 'unit', e.target.value)}
                        placeholder={item.defaultUnit || 'un'}
                        className="w-full text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={e => updateItem(item.tempId, 'notes', e.target.value)}
                        placeholder="Observação..."
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.tempId)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>{items.length} material(is) vinculado(s)</span>
            <span>Quantidade total: {items.reduce((s, i) => s + i.quantity, 0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stock Movements Section (read-only, shown when editing) ──────────────────

function StockMovementsSection({ procedureId }: { procedureId: string }) {
  const [open, setOpen] = useState(false);

  const { data: movements = [], isLoading } = useQuery<StockMovement[]>({
    queryKey: ['procedure-movements', procedureId],
    queryFn: () => api.get(`/procedures/${procedureId}/movements`).then(r => r.data),
    enabled: open,
  });

  return (
    <div className="border-t border-gray-200 pt-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
      >
        <History className="h-4 w-4" />
        Histórico de Movimentações de Estoque
        {movements.length > 0 && !isLoading && (
          <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full normal-case">
            {movements.length}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">{open ? '▲ Ocultar' : '▼ Exibir'}</span>
      </button>

      {open && (
        <div className="mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-16 text-gray-400 gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : movements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Nenhuma movimentação de estoque registrada para este procedimento.
            </p>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Tipo</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Material</th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-600">Qtd</th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-600">Saldo Ant.</th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-600">Saldo Novo</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Usuário</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map(mv => {
                    const cfg = movementTypeConfig[mv.type];
                    const Icon = cfg.Icon;
                    return (
                      <tr key={mv.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800">{mv.material.name}</p>
                          <p className="text-gray-400">Cód: {mv.material.code}</p>
                        </td>
                        <td className="px-2 py-2 text-center font-semibold text-gray-700">{mv.quantity}</td>
                        <td className="px-2 py-2 text-center text-gray-500">{mv.previousStock}</td>
                        <td className="px-2 py-2 text-center font-semibold text-gray-700">{mv.newStock}</td>
                        <td className="px-3 py-2 text-gray-500">{mv.user.name}</td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                          {new Date(mv.createdAt).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProceduresPage() {
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing]         = useState<any>(null);
  const [materialItems, setMaterialItems] = useState<MaterialItem[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['procedures', search, page, statusFilter],
    queryFn: () =>
      api.get('/procedures', { params: { search, page, limit: 15, status: statusFilter || undefined } })
        .then(r => r.data),
  });

  const { data: patients } = useQuery({
    queryKey: ['patients-select'],
    queryFn: () => api.get('/patients', { params: { limit: 200 } }).then(r => r.data.data),
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors-select'],
    queryFn: () => api.get('/doctors', { params: { limit: 200 } }).then(r => r.data.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm();

  // ── Submit ──
  const mutation = useMutation({
    mutationFn: (d: any) => {
      const payload = {
        ...d,
        materials: materialItems.map(it => ({
          materialId: it.materialId,
          quantity:   it.quantity,
          unit:       it.unit || null,
          notes:      it.notes || null,
        })),
      };
      return editing
        ? api.put(`/procedures/${editing.id}`, payload)
        : api.post('/procedures', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procedures'] });
      qc.invalidateQueries({ queryKey: ['materials'] }); // refresh stock counts
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/procedures/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procedures'] });
      qc.invalidateQueries({ queryKey: ['materials'] }); // refresh stock after cancellation
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setMaterialItems([]);
    reset();
  };

  const openNew = () => {
    setEditing(null);
    setMaterialItems([]);
    reset();
    setIsModalOpen(true);
  };

  const openEdit = async (p: any) => {
    setEditing(p);
    setLoadingEdit(true);
    setIsModalOpen(true);

    setValue('name',       p.name);
    setValue('type',       p.type);
    setValue('complexity', p.complexity);
    setValue('patientId',  p.patientId);
    setValue('doctorId',   p.doctorId);
    setValue('notes',      p.notes || '');
    setValue('cid',        p.cid || '');
    setValue('tuss',       p.tuss || '');
    setValue('status',     p.status || '');
    if (p.scheduledAt) setValue('scheduledAt', p.scheduledAt.split('T')[0]);

    try {
      const { data: full } = await api.get(`/procedures/${p.id}`);
      // Fetch live stock for each material so warnings are accurate
      const materialIds: string[] = (full.materials || []).map((pm: any) => pm.materialId);
      let liveStock: Record<string, number> = {};
      if (materialIds.length > 0) {
        const stockRes = await Promise.allSettled(
          materialIds.map((id: string) => api.get(`/materials/${id}`).then(r => ({ id, qty: r.data.quantity }))),
        );
        for (const r of stockRes) {
          if (r.status === 'fulfilled') liveStock[r.value.id] = r.value.qty;
        }
      }

      const items: MaterialItem[] = (full.materials || []).map((pm: any) => ({
        tempId:        crypto.randomUUID(),
        materialId:    pm.materialId,
        name:          pm.material.name,
        code:          pm.material.code,
        defaultUnit:   pm.material.unit || '',
        quantity:      pm.quantity,
        unit:          pm.unit || pm.material.unit || '',
        notes:         pm.notes || '',
        // Stock shown is current live stock PLUS the already-committed quantity for this procedure
        // so the user sees how much is available if they were to change the amount
        stockQuantity: (liveStock[pm.materialId] ?? 0) + pm.quantity,
      }));
      setMaterialItems(items);
    } catch {
      setMaterialItems([]);
    } finally {
      setLoadingEdit(false);
    }
  };

  // ── Table columns ──
  const columns = [
    { key: 'name',      header: 'Procedimento' },
    { key: 'patient',   header: 'Paciente',  render: (p: any) => p.patient?.name || '—' },
    { key: 'doctor',    header: 'Médico',    render: (p: any) => p.doctor?.name || '—' },
    { key: 'type',      header: 'Tipo' },
    {
      key: 'complexity', header: 'Complexidade',
      render: (p: any) => <Badge variant={complexityConfig[p.complexity] || 'default'}>{p.complexity}</Badge>,
    },
    {
      key: 'materials', header: 'OPMEs',
      render: (p: any) => (
        <Badge variant={p._count?.materials > 0 ? 'info' : 'default'}>
          {p._count?.materials || 0}
        </Badge>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (p: any) => {
        const c = statusConfig[p.status];
        return <Badge variant={c?.variant || 'default'}>{c?.label || p.status}</Badge>;
      },
    },
    {
      key: 'workflow', header: 'Etapa',
      render: (p: any) =>
        p.workflow
          ? <Badge variant="info">{p.workflow.currentStep.replace(/_/g, ' ')}</Badge>
          : '—',
    },
    {
      key: 'actions', header: 'Ações',
      render: (p: any) => (
        <div className="flex gap-2">
          {p.workflow && (
            <button
              onClick={() => navigate(`/workflows/${p.workflow.id}`)}
              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
              title="Ver Workflow"
            >
              <GitBranch className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Cancelar procedimento? Todos os OPMEs vinculados serão estornados ao estoque automaticamente.'))
                deleteMutation.mutate(p.id);
            }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
            title="Cancelar Procedimento"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procedimentos</h1>
          <p className="text-sm text-gray-500">Controle de procedimentos e solicitações OPME</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Procedimento
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="mb-4 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por procedimento, paciente ou médico..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input w-48"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <Table
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          pagination={data ? { page, pages: data.pages, total: data.total, limit: 15, onPageChange: setPage } : undefined}
        />
      </div>

      {/* Modal Procedimento */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? 'Editar Procedimento' : 'Novo Procedimento'}
        size="xl"
      >
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">

          {/* ── Dados básicos ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Dados do Procedimento
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nome do Procedimento *</label>
                <input className="input" {...register('name', { required: true })} />
              </div>
              <div>
                <label className="label">Paciente *</label>
                <select className="input" {...register('patientId', { required: true })}>
                  <option value="">Selecione o paciente</option>
                  {(patients || []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Médico *</label>
                <select className="input" {...register('doctorId', { required: true })}>
                  <option value="">Selecione o médico</option>
                  {(doctors || []).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name} — {d.crm}</option>
                  ))}
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
              <div>
                <label className="label">CID</label>
                <input className="input" {...register('cid')} placeholder="M16.1" />
              </div>
              <div>
                <label className="label">TUSS</label>
                <input className="input" {...register('tuss')} />
              </div>
              <div>
                <label className="label">Data Agendada</label>
                <input className="input" type="date" {...register('scheduledAt')} />
              </div>
              {editing && (
                <div>
                  <label className="label">Status</label>
                  <select className="input" {...register('status')}>
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className="label">Observações</label>
                <textarea className="input" rows={2} {...register('notes')} />
              </div>
            </div>
          </div>

          {/* ── Materiais OPME ── */}
          <div className="border-t border-gray-200 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Materiais OPME
              </h3>
              {materialItems.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  {materialItems.length}
                </span>
              )}
            </div>

            {loadingEdit ? (
              <div className="flex items-center justify-center h-20 text-gray-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando materiais...</span>
              </div>
            ) : (
              <OpmeMaterialsSection items={materialItems} onChange={setMaterialItems} />
            )}
          </div>

          {/* ── Stock Movements (edit only) ── */}
          {editing && (
            <StockMovementsSection procedureId={editing.id} />
          )}

          {/* ── Error ── */}
          {mutation.isError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {(mutation.error as any)?.response?.data?.error || 'Erro ao salvar procedimento.'}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={closeModal} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mutation.isPending ? 'Salvando...' : 'Salvar Procedimento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
