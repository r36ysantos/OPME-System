import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Activity } from 'lucide-react';

const entityColors: Record<string, any> = {
  Patient: 'info', Doctor: 'success', Material: 'purple',
  Supplier: 'warning', Procedure: 'danger', Workflow: 'default', User: 'info',
};

const actionColors: Record<string, any> = {
  CREATE: 'success', UPDATE: 'info', DELETE: 'danger',
  LOGIN: 'default', ADVANCE: 'purple', REPROVADO: 'danger', CRIADO: 'success',
};

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, entityFilter],
    queryFn: () => api.get('/audit-logs', { params: { page, limit: 20, entity: entityFilter || undefined } }).then(r => r.data),
  });

  const columns = [
    {
      key: 'createdAt', header: 'Data/Hora',
      render: (l: any) => new Date(l.createdAt).toLocaleString('pt-BR'),
    },
    { key: 'user', header: 'Usuário', render: (l: any) => l.user?.name || <span className="text-gray-400">Sistema</span> },
    {
      key: 'action', header: 'Ação',
      render: (l: any) => <Badge variant={actionColors[l.action] || 'default'}>{l.action}</Badge>,
    },
    {
      key: 'entity', header: 'Entidade',
      render: (l: any) => <Badge variant={entityColors[l.entity] || 'default'}>{l.entity}</Badge>,
    },
    {
      key: 'entityId', header: 'ID',
      render: (l: any) => l.entityId
        ? <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">{l.entityId.slice(0, 8)}...</code>
        : '—',
    },
    { key: 'ipAddress', header: 'IP', render: (l: any) => l.ipAddress || '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Log de Auditoria</h1>
          <p className="text-sm text-gray-500">Registro de todas as ações realizadas no sistema</p>
        </div>
      </div>

      <div className="card">
        <div className="mb-4">
          <select className="input w-52" value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1); }}>
            <option value="">Todas as entidades</option>
            {Object.keys(entityColors).map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <Table
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          pagination={data ? { page, pages: data.pages, total: data.total, limit: 20, onPageChange: setPage } : undefined}
        />
      </div>
    </div>
  );
}
