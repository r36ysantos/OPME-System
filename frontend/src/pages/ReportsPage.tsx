import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import Badge from '../components/ui/Badge';
import {
  FileSpreadsheet, FileDown, Filter, BarChart2,
  Users, Clock, TrendingUp, RefreshCw, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente', EM_ANALISE: 'Em Análise', APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado', EM_COMPRA: 'Em Compra', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado',
};

const statusColors: Record<string, string> = {
  PENDENTE: '#f59e0b', EM_ANALISE: '#3b82f6', APROVADO: '#10b981',
  REPROVADO: '#ef4444', EM_COMPRA: '#8b5cf6', FINALIZADO: '#6b7280', CANCELADO: '#9ca3af',
};

const stepLabels: Record<string, string> = {
  ANALISE_INICIAL: 'Análise Inicial', VALIDACAO_TECNICA: 'Val. Técnica',
  COMPRA: 'Compra', AUDITORIA_CLINICA: 'Auditoria', APROVACAO_FINAL: 'Aprovação Final', CONCLUIDO: 'Concluído',
};

const complexityColors: Record<string, string> = {
  BAIXA: '#10b981', MEDIA: '#f59e0b', ALTA: '#ef4444',
};

interface Filters {
  startDate: string;
  endDate: string;
  status: string;
  doctorId: string;
  workflowStep: string;
}

export default function ReportsPage() {
  const [filters, setFilters] = useState<Filters>({
    startDate: '', endDate: '', status: '', doctorId: '', workflowStep: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: doctors } = useQuery({
    queryKey: ['doctors-select'],
    queryFn: () => api.get('/doctors', { params: { limit: 200 } }).then(r => r.data.data),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-summary', appliedFilters],
    queryFn: () => api.get('/reports/summary', { params: appliedFilters }).then(r => r.data),
  });

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    const empty = { startDate: '', endDate: '', status: '', doctorId: '', workflowStep: '' };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  const downloadFile = async (type: 'excel' | 'csv') => {
    setDownloading(type);
    try {
      const params = new URLSearchParams(appliedFilters as any);
      // Remove empty params
      [...params.entries()].forEach(([k, v]) => { if (!v) params.delete(k); });

      const token = localStorage.getItem('opme_token');
      const response = await fetch(`/api/reports/export/${type}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erro ao gerar relatório');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'excel'
        ? `OPME_Relatorio_${new Date().toISOString().split('T')[0]}.xlsx`
        : `OPME_Procedimentos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setDownloading(null);
    }
  };

  const statusChartData = data
    ? Object.entries(data.byStatus || {}).map(([k, v]) => ({
        name: statusLabels[k] || k, value: v as number, color: statusColors[k] || '#6b7280',
      }))
    : [];

  const complexityChartData = data
    ? Object.entries(data.byComplexity || {}).map(([k, v]) => ({
        name: k, value: v as number, color: complexityColors[k] || '#6b7280',
      }))
    : [];

  const stepChartData = data
    ? Object.entries(data.byStep || {}).map(([k, v]) => ({
        name: stepLabels[k] || k, quantidade: v as number,
      }))
    : [];

  const typeChartData = data
    ? Object.entries(data.byType || {}).map(([k, v]) => ({
        name: k, quantidade: v as number,
      }))
    : [];

  const doctorChartData = data
    ? Object.entries(data.byDoctor || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 8)
        .map(([k, v]) => ({ name: k, quantidade: v as number }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">Análise e exportação de dados de procedimentos OPME</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadFile('excel')}
            disabled={downloading === 'excel' || isLoading}
            className="btn-primary flex items-center gap-2"
          >
            {downloading === 'excel'
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <FileSpreadsheet className="h-4 w-4" />}
            Exportar Excel
          </button>
          <button
            onClick={() => downloadFile('csv')}
            disabled={downloading === 'csv' || isLoading}
            className="btn-secondary flex items-center gap-2"
          >
            {downloading === 'csv'
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />}
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Export Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">O Excel exportado contém 4 abas completas:</p>
            <ul className="space-y-0.5 list-disc list-inside text-blue-600">
              <li><strong>Procedimentos</strong> — todos os campos + datas de cada etapa do workflow</li>
              <li><strong>Histórico de Workflow</strong> — cada ação realizada com responsável e data</li>
              <li><strong>Materiais Utilizados</strong> — materiais por procedimento com preços</li>
              <li><strong>Tempo por Etapa</strong> — dias gastos em cada etapa do fluxo</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Filtros</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="label">Data Início</label>
            <input
              type="date" className="input"
              value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Data Fim</label>
            <input
              type="date" className="input"
              value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">Todos</option>
              {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Médico</label>
            <select className="input" value={filters.doctorId} onChange={e => setFilters(f => ({ ...f, doctorId: e.target.value }))}>
              <option value="">Todos</option>
              {(doctors || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Etapa Workflow</label>
            <select className="input" value={filters.workflowStep} onChange={e => setFilters(f => ({ ...f, workflowStep: e.target.value }))}>
              <option value="">Todas</option>
              {Object.entries(stepLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={clearFilters} className="btn-secondary text-sm">Limpar Filtros</button>
          <button onClick={applyFilters} className="btn-primary text-sm flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" /> Aplicar Filtros
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-primary-600">{data?.total || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Total de Procedimentos</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-green-600">
                {data?.byStatus?.FINALIZADO || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">Finalizados</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-blue-600">
                {(data?.byStatus?.EM_ANALISE || 0) + (data?.byStatus?.EM_COMPRA || 0) + (data?.byStatus?.PENDENTE || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Em Andamento</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-purple-600">{data?.avgDays || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Média de Dias (concluídos)</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Distribuição por Status</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {statusChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Procedimentos por Etapa do Workflow</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stepChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Por Tipo de Procedimento</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Por Médico (Top 8)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={doctorChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Complexity */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Por Complexidade</h2>
            <div className="flex gap-6">
              {complexityChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-3 flex-1 bg-gray-50 rounded-lg p-4">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <div>
                    <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-sm text-gray-500">{item.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Procedure Table Preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Preview — Procedimentos ({data?.procedures?.length || 0} registros)
              </h2>
              <p className="text-xs text-gray-400">Exibindo até 100 registros. Use exportar para dados completos.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Procedimento', 'Paciente', 'Médico', 'Tipo', 'Complexidade', 'Status', 'Etapa', 'Prioridade', 'Dt. Criação', 'Dias Totais'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {(data?.procedures || []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap max-w-[200px] truncate">{p.name}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.patient}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.doctor}</td>
                      <td className="px-3 py-2 text-gray-600">{p.type}</td>
                      <td className="px-3 py-2">
                        <Badge variant={p.complexity === 'ALTA' ? 'danger' : p.complexity === 'MEDIA' ? 'warning' : 'success'}>
                          {p.complexity}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={
                          p.status === 'FINALIZADO' ? 'success' :
                          p.status === 'REPROVADO' || p.status === 'CANCELADO' ? 'danger' :
                          p.status === 'EM_COMPRA' ? 'purple' : 'info'
                        }>
                          {statusLabels[p.status] || p.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">
                        {stepLabels[p.currentStep] || '—'}
                      </td>
                      <td className="px-3 py-2">
                        {p.priority && (
                          <Badge variant={p.priority === 'URGENTE' ? 'danger' : p.priority === 'ALTA' ? 'warning' : 'default'}>
                            {p.priority}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {p.totalDays ? (
                          <Badge variant={Number(p.totalDays) > 30 ? 'danger' : Number(p.totalDays) > 15 ? 'warning' : 'success'}>
                            {p.totalDays}d
                          </Badge>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                  {(!data?.procedures || data.procedures.length === 0) && (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-gray-400">
                        Nenhum procedimento encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
