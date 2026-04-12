import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Users, UserCog, Package, Building2, ClipboardList,
  AlertTriangle, CheckCircle, Clock, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ─── Config ───────────────────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  PENDENTE:   'Pendente',
  EM_ANALISE: 'Em Análise',
  APROVADO:   'Aprovado',
  REPROVADO:  'Reprovado',
  EM_COMPRA:  'Em Compra',
  FINALIZADO: 'Finalizado',
  CANCELADO:  'Cancelado',
};

const statusColors: Record<string, string> = {
  PENDENTE:   '#EAB308',
  EM_ANALISE: '#3B82F6',
  APROVADO:   '#10B981',
  REPROVADO:  '#EF4444',
  EM_COMPRA:  '#8B5CF6',
  FINALIZADO: '#64748B',
  CANCELADO:  '#94A3B8',
};

const statusBadge: Record<string, { bg: string; color: string; border: string }> = {
  PENDENTE:   { bg: '#FEF9C3', color: '#A16207', border: '#FDE047' },
  EM_ANALISE: { bg: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' },
  APROVADO:   { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
  REPROVADO:  { bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' },
  EM_COMPRA:  { bg: '#F3E8FF', color: '#7E22CE', border: '#C4B5FD' },
  FINALIZADO: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
  CANCELADO:  { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' },
};

const stepLabels: Record<string, string> = {
  ANALISE_INICIAL:   'Análise Inicial',
  VALIDACAO_TECNICA: 'Val. Técnica',
  COMPRA:            'Compra',
  AUDITORIA_CLINICA: 'Auditoria',
  APROVACAO_FINAL:   'Aprovação',
  CONCLUIDO:         'Concluído',
};

// ─── KPI stat config ──────────────────────────────────────────────────────────
const getStats = (data: any) => [
  {
    label: 'Pacientes',
    value: data?.summary?.totalPatients   || 0,
    icon: Users,
    accent: '#3B82F6',
    accentLight: '#DBEAFE',
    accentBorder: '#93C5FD',
  },
  {
    label: 'Médicos',
    value: data?.summary?.totalDoctors    || 0,
    icon: UserCog,
    accent: '#10B981',
    accentLight: '#DCFCE7',
    accentBorder: '#86EFAC',
  },
  {
    label: 'Materiais OPME',
    value: data?.summary?.totalMaterials  || 0,
    icon: Package,
    accent: '#8B5CF6',
    accentLight: '#F3E8FF',
    accentBorder: '#C4B5FD',
  },
  {
    label: 'Fornecedores',
    value: data?.summary?.totalSuppliers  || 0,
    icon: Building2,
    accent: '#F97316',
    accentLight: '#FFEDD5',
    accentBorder: '#FDBA74',
  },
  {
    label: 'Minhas Tarefas',
    value: data?.summary?.myPendingTasks  || 0,
    icon: ClipboardList,
    accent: '#EF4444',
    accentLight: '#FEE2E2',
    accentBorder: '#FCA5A5',
  },
];

// ─── Skeleton KPI ─────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 animate-pulse" style={{ border: '2px solid #E2E8F0', boxShadow: '4px 4px 0px 0px rgba(15,23,42,0.08)' }}>
      <div className="skeleton h-12 w-12 rounded-xl mb-4" />
      <div className="skeleton h-9 w-24 rounded mb-2" />
      <div className="skeleton h-4 w-20 rounded" />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, accent, accentLight, accentBorder, delay = 0 }: any) {
  return (
    <div
      className="relative bg-white rounded-2xl p-6 overflow-hidden animate-brutalist-in"
      style={{
        border: '2px solid #E2E8F0',
        borderLeft: `4px solid ${accent}`,
        boxShadow: '4px 4px 0px 0px rgba(15,23,42,0.08)',
        animationDelay: `${delay}ms`,
        /* dot-grid overlay via pseudo element not supported inline, use bg */
        backgroundImage: 'radial-gradient(#2563EB0D 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* Icon box */}
      <div
        className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
        style={{
          background: accentLight,
          border: `2px solid ${accentBorder}`,
          boxShadow: `2px 2px 0px 0px ${accentBorder}`,
        }}
      >
        <Icon className="h-6 w-6" style={{ color: accent }} />
      </div>

      {/* Value */}
      <p
        className="leading-none mb-1"
        style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A' }}
      >
        {value}
      </p>

      {/* Label */}
      <p className="text-sm font-semibold text-sage">{label}</p>

      {/* Decorative accent corner */}
      <div
        className="absolute top-0 right-0 w-16 h-16 opacity-5"
        style={{ background: accent, borderRadius: '0 16px 0 100%' }}
      />
    </div>
  );
}

// ─── Custom tooltip para recharts ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-white px-3 py-2 text-sm"
      style={{ border: '2px solid #0F172A', borderRadius: '8px', boxShadow: '4px 4px 0px 0px #0F172A' }}
    >
      {label && <p className="font-bold text-ink mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color || p.fill || '#2563EB' }}>
          {p.name}: <span className="text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  const stats   = getStats(data);
  const pieData = (data?.proceduresByStatus || []).map((s: any) => ({
    name:  statusLabels[s.status] || s.status,
    value: s._count.status,
    color: statusColors[s.status] || '#64748B',
  }));
  const barData = (data?.workflowsByStep || []).map((s: any) => ({
    name:       stepLabels[s.currentStep] || s.currentStep,
    quantidade: s._count.currentStep,
  }));

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl tracking-tight"
            style={{ fontWeight: 800, color: '#0F172A' }}
          >
            Dashboard
          </h1>
          <p className="text-sm font-semibold text-sage mt-0.5">Visão geral do sistema OPME</p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-sage"
          style={{ border: '2px solid #E2E8F0', borderRadius: '10px', background: '#F8FAFC' }}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Atualiza a cada 30s
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
          : stats.map((s, i) => <KpiCard key={s.label} {...s} delay={i * 60} />)
        }
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pie */}
        <div
          className="bg-white rounded-2xl p-6 animate-brutalist-in"
          style={{ border: '2px solid #E2E8F0', boxShadow: '4px 4px 0px 0px rgba(15,23,42,0.08)', animationDelay: '300ms' }}
        >
          <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '2px solid #F1F5F9' }}>
            <h2 className="text-base font-extrabold text-ink tracking-tight">Procedimentos por Status</h2>
            <span className="badge" style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1.5px solid #93C5FD' }}>
              {pieData.reduce((a: number, b: any) => a + b.value, 0)} total
            </span>
          </div>
          {isLoading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#ffffff"
                >
                  {pieData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          {!isLoading && pieData.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {pieData.map((entry: any) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: entry.color }} />
                  <span className="text-xs font-semibold text-sage">{entry.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bar */}
        <div
          className="bg-white rounded-2xl p-6 animate-brutalist-in"
          style={{ border: '2px solid #E2E8F0', boxShadow: '4px 4px 0px 0px rgba(15,23,42,0.08)', animationDelay: '360ms' }}
        >
          <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '2px solid #F1F5F9' }}>
            <h2 className="text-base font-extrabold text-ink tracking-tight">Workflows por Etapa</h2>
            <span className="badge" style={{ background: '#F3E8FF', color: '#7E22CE', border: '1.5px solid #C4B5FD' }}>
              Em andamento
            </span>
          </div>
          {isLoading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="quantidade" name="Qtd." fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent + Expiring ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent procedures */}
        <div
          className="bg-white rounded-2xl p-6 animate-brutalist-in"
          style={{ border: '2px solid #E2E8F0', boxShadow: '4px 4px 0px 0px rgba(15,23,42,0.08)', animationDelay: '420ms' }}
        >
          <div className="flex items-center gap-2.5 mb-4 pb-3" style={{ borderBottom: '2px solid #F1F5F9' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#DBEAFE', border: '2px solid #93C5FD', boxShadow: '2px 2px 0px 0px #93C5FD' }}>
              <Clock className="h-4 w-4 text-[#1D4ED8]" />
            </div>
            <h2 className="text-base font-extrabold text-ink tracking-tight">Procedimentos Recentes</h2>
          </div>

          <div className="space-y-1">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <div className="skeleton h-4 w-3/4 rounded mb-1.5" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                ))
              : (data?.recentProcedures || []).length === 0
                ? <p className="text-sm text-sage text-center py-8">Nenhum procedimento recente</p>
                : (data?.recentProcedures || []).map((p: any) => {
                    const sb = statusBadge[p.status] || statusBadge.PENDENTE;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-all duration-100 cursor-default"
                        style={{ borderBottom: '1px solid #F1F5F9' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = '#EFF6FF';
                          (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = '';
                          (e.currentTarget as HTMLElement).style.transform = '';
                        }}
                      >
                        <div className="min-w-0 mr-3">
                          <p className="text-sm font-bold text-ink truncate">{p.name}</p>
                          <p className="text-xs font-medium text-sage truncate">{p.patient?.name} · {p.doctor?.name}</p>
                        </div>
                        <span
                          className="badge flex-shrink-0"
                          style={{ background: sb.bg, color: sb.color, border: `1.5px solid ${sb.border}` }}
                        >
                          {statusLabels[p.status]}
                        </span>
                      </div>
                    );
                  })
            }
          </div>
        </div>

        {/* Expiring materials */}
        <div
          className="bg-white rounded-2xl p-6 animate-brutalist-in"
          style={{
            border: '2px solid #E2E8F0',
            borderLeft: '4px solid #EAB308',
            boxShadow: '4px 4px 0px 0px rgba(15,23,42,0.08)',
            animationDelay: '480ms',
            backgroundImage: 'linear-gradient(to right, #FEF9C308, #FFFFFF)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-4 pb-3" style={{ borderBottom: '2px solid #F1F5F9' }}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center animate-hard-pulse"
              style={{ background: '#FEF9C3', border: '2px solid #FDE047', boxShadow: '2px 2px 0px 0px #EAB308' }}
            >
              <AlertTriangle className="h-4 w-4 text-[#A16207]" />
            </div>
            <h2 className="text-base font-extrabold text-ink tracking-tight">Materiais Próx. do Vencimento</h2>
          </div>

          <div className="space-y-1">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <div className="skeleton h-4 w-3/4 rounded mb-1.5" />
                    <div className="skeleton h-3 w-1/3 rounded" />
                  </div>
                ))
              : (data?.expiringMaterials || []).length === 0
                ? (
                  <div className="flex items-center gap-3 py-6 justify-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: '#DCFCE7', border: '2px solid #86EFAC', boxShadow: '2px 2px 0px 0px #86EFAC' }}>
                      <CheckCircle className="h-4 w-4 text-[#15803D]" />
                    </div>
                    <span className="text-sm font-semibold text-sage">Nenhum material vencendo nos próximos 30 dias</span>
                  </div>
                )
                : (data?.expiringMaterials || []).map((m: any) => {
                    const daysLeft = Math.ceil((new Date(m.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysLeft <= 7;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-all duration-100 cursor-default"
                        style={{ borderBottom: '1px solid #F1F5F9' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = '#FEFCE8';
                          (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = '';
                          (e.currentTarget as HTMLElement).style.transform = '';
                        }}
                      >
                        <div className="min-w-0 mr-3">
                          <p className="text-sm font-bold text-ink truncate">{m.name}</p>
                          <p className="text-xs font-medium text-sage truncate">{m.supplier?.name || '—'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span
                            className="badge"
                            style={isUrgent
                              ? { background: '#FEE2E2', color: '#B91C1C', border: '1.5px solid #FCA5A5' }
                              : { background: '#FEF9C3', color: '#A16207', border: '1.5px solid #FDE047' }
                            }
                          >
                            {isUrgent ? 'URGENTE' : `${daysLeft}d`}
                          </span>
                          <span className="text-[10px] font-semibold text-sage">
                            {new Date(m.expiryDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    );
                  })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
