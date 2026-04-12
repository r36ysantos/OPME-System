import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const stepLabels: Record<string, { label: string; variant: any }> = {
  ANALISE_INICIAL: { label: 'Análise Inicial', variant: 'info' },
  VALIDACAO_TECNICA: { label: 'Val. Técnica', variant: 'info' },
  COMPRA: { label: 'Compra', variant: 'purple' },
  AUDITORIA_CLINICA: { label: 'Auditoria', variant: 'warning' },
  APROVACAO_FINAL: { label: 'Aprovação Final', variant: 'warning' },
  CONCLUIDO: { label: 'Concluído', variant: 'success' },
};

const statusConfig: Record<string, any> = {
  EM_ANDAMENTO: 'info', APROVADO: 'success', REPROVADO: 'danger', CONCLUIDO: 'default',
};

const priorityConfig: Record<string, any> = {
  URGENTE: 'danger', ALTA: 'warning', NORMAL: 'default', BAIXA: 'default',
};

export default function WorkflowPage() {
  const [page, setPage] = useState(1);
  const [stepFilter, setStepFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('EM_ANDAMENTO');
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', page, stepFilter, statusFilter],
    queryFn: () => api.get('/workflows', { params: { page, limit: 15, step: stepFilter || undefined, status: statusFilter || undefined } }).then(r => r.data),
  });

  const columns = [
    { key: 'procedure', header: 'Procedimento', render: (w: any) => w.procedure?.name || '—' },
    { key: 'patient', header: 'Paciente', render: (w: any) => w.procedure?.patient?.name || '—' },
    { key: 'doctor', header: 'Médico', render: (w: any) => w.procedure?.doctor?.name || '—' },
    {
      key: 'currentStep', header: 'Etapa Atual',
      render: (w: any) => { const c = stepLabels[w.currentStep]; return <Badge variant={c?.variant || 'default'}>{c?.label || w.currentStep}</Badge>; }
    },
    { key: 'status', header: 'Status', render: (w: any) => <Badge variant={statusConfig[w.status] || 'default'}>{w.status.replace(/_/g, ' ')}</Badge> },
    { key: 'priority', header: 'Prioridade', render: (w: any) => <Badge variant={priorityConfig[w.priority] || 'default'}>{w.priority}</Badge> },
    { key: 'createdAt', header: 'Criado em', render: (w: any) => new Date(w.createdAt).toLocaleDateString('pt-BR') },
    {
      key: 'actions', header: 'Ações',
      render: (w: any) => (
        <button onClick={() => navigate(`/workflows/${w.id}`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Ver detalhes">
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
        <p className="text-sm text-gray-500">Controle de fluxo de trabalho OPME</p>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap gap-3">
          <select className="input w-48" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="APROVADO">Aprovado</option>
            <option value="REPROVADO">Reprovado</option>
            <option value="CONCLUIDO">Concluído</option>
          </select>
          <select className="input w-52" value={stepFilter} onChange={e => { setStepFilter(e.target.value); setPage(1); }}>
            <option value="">Todas as etapas</option>
            {Object.entries(stepLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <Table columns={columns} data={data?.data || []} isLoading={isLoading}
          pagination={data ? { page, pages: data.pages, total: data.total, limit: 15, onPageChange: setPage } : undefined} />
      </div>
    </div>
  );
}
