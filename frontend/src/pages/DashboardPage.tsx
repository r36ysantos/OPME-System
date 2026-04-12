import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Users, UserCog, Package, Building2, ClipboardList, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  EM_COMPRA: 'Em Compra',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

const statusColors: Record<string, string> = {
  PENDENTE: '#f59e0b',
  EM_ANALISE: '#3b82f6',
  APROVADO: '#10b981',
  REPROVADO: '#ef4444',
  EM_COMPRA: '#8b5cf6',
  FINALIZADO: '#6b7280',
  CANCELADO: '#9ca3af',
};

const stepLabels: Record<string, string> = {
  ANALISE_INICIAL: 'Análise Inicial',
  VALIDACAO_TECNICA: 'Val. Técnica',
  COMPRA: 'Compra',
  AUDITORIA_CLINICA: 'Auditoria',
  APROVACAO_FINAL: 'Aprovação Final',
  CONCLUIDO: 'Concluído',
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  const stats = [
    { label: 'Pacientes', value: data?.summary?.totalPatients || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Médicos', value: data?.summary?.totalDoctors || 0, icon: UserCog, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Materiais OPME', value: data?.summary?.totalMaterials || 0, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Fornecedores', value: data?.summary?.totalSuppliers || 0, icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Minhas Tarefas', value: data?.summary?.myPendingTasks || 0, icon: ClipboardList, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const pieData = (data?.proceduresByStatus || []).map((s: any) => ({
    name: statusLabels[s.status] || s.status,
    value: s._count.status,
    color: statusColors[s.status] || '#6b7280',
  }));

  const barData = (data?.workflowsByStep || []).map((s: any) => ({
    name: stepLabels[s.currentStep] || s.currentStep,
    quantidade: s._count.currentStep,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do sistema OPME</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`inline-flex p-2.5 rounded-lg ${bg} mb-3`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Procedimentos por Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Workflows em Andamento por Etapa</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent + Expiring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Procedimentos Recentes</h2>
          </div>
          <div className="space-y-3">
            {(data?.recentProcedures || []).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.patient?.name} · {p.doctor?.name}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: statusColors[p.status] + '20', color: statusColors[p.status] }}>
                  {statusLabels[p.status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h2 className="text-base font-semibold text-gray-900">Materiais Próximos do Vencimento</h2>
          </div>
          <div className="space-y-3">
            {(data?.expiringMaterials || []).length === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm">Nenhum material vencendo nos próximos 30 dias</span>
              </div>
            ) : (
              (data?.expiringMaterials || []).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.supplier?.name}</p>
                  </div>
                  <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                    {new Date(m.expiryDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
