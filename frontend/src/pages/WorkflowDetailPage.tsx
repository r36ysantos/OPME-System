import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { ArrowLeft, CheckCircle, XCircle, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const stepLabels: Record<string, string> = {
  ANALISE_INICIAL: 'Análise Inicial',
  VALIDACAO_TECNICA: 'Validação Técnica',
  COMPRA: 'Compra',
  AUDITORIA_CLINICA: 'Auditoria Clínica',
  APROVACAO_FINAL: 'Aprovação Final',
  CONCLUIDO: 'Concluído',
};

const stepOrder = ['ANALISE_INICIAL', 'VALIDACAO_TECNICA', 'COMPRA', 'AUDITORIA_CLINICA', 'APROVACAO_FINAL', 'CONCLUIDO'];

const stepRoles: Record<string, string[]> = {
  ANALISE_INICIAL: ['ANALISTA_OPME', 'ASSISTENTE_OPME', 'ADMIN'],
  VALIDACAO_TECNICA: ['ANALISTA_OPME', 'ADMIN'],
  COMPRA: ['COMPRADOR_OPME', 'ADMIN'],
  AUDITORIA_CLINICA: ['ENFERMEIRO_AUDITOR', 'ADMIN'],
  APROVACAO_FINAL: ['COORDENADOR_OPME', 'ADMIN'],
  CONCLUIDO: ['COORDENADOR_OPME', 'ADMIN'],
};

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advancing, setAdvancing] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => api.get(`/workflows/${id}`).then(r => r.data),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ approved, notes }: { approved: boolean; notes: string }) =>
      api.post(`/workflows/${id}/advance`, { approved, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow', id] });
      qc.invalidateQueries({ queryKey: ['workflows'] });
      setIsAdvanceModalOpen(false);
      setNotes('');
    },
  });

  const priorityMutation = useMutation({
    mutationFn: (priority: string) => api.patch(`/workflows/${id}/priority`, { priority }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow', id] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;
  if (!workflow) return <div className="card text-center text-gray-500">Workflow não encontrado</div>;

  const currentStepIdx = stepOrder.indexOf(workflow.currentStep);
  const canAct = stepRoles[workflow.currentStep]?.includes(user?.role || '') && workflow.status === 'EM_ANDAMENTO';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/workflows')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{workflow.procedure?.name}</h1>
          <p className="text-sm text-gray-500">Workflow #{workflow.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <select value={workflow.priority} onChange={e => priorityMutation.mutate(e.target.value)} className="input w-36 text-sm">
          <option value="URGENTE">Urgente</option>
          <option value="ALTA">Alta</option>
          <option value="NORMAL">Normal</option>
          <option value="BAIXA">Baixa</option>
        </select>
      </div>

      {/* Step Progress */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-6">Progresso do Workflow</h2>
        <div className="flex items-start">
          {stepOrder.map((step, idx) => (
            <div key={step} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0 ${
                  idx < currentStepIdx ? 'bg-green-500 border-green-500 text-white' :
                  idx === currentStepIdx ? 'bg-primary-600 border-primary-600 text-white' :
                  'bg-white border-gray-300 text-gray-400'
                }`}>
                  {idx < currentStepIdx ? '✓' : idx + 1}
                </div>
                <span className={`text-xs mt-1.5 text-center leading-tight px-1 ${idx === currentStepIdx ? 'text-primary-600 font-semibold' : 'text-gray-400'}`}>
                  {stepLabels[step]}
                </span>
              </div>
              {idx < stepOrder.length - 1 && (
                <div className={`h-0.5 flex-1 -mt-6 mx-1 ${idx < currentStepIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Procedure Info */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Informações do Procedimento</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-gray-500 text-xs mb-0.5">Paciente</dt><dd className="font-medium">{workflow.procedure?.patient?.name}</dd></div>
              <div><dt className="text-gray-500 text-xs mb-0.5">Médico</dt><dd className="font-medium">{workflow.procedure?.doctor?.name}</dd></div>
              <div><dt className="text-gray-500 text-xs mb-0.5">Tipo</dt><dd className="font-medium">{workflow.procedure?.type}</dd></div>
              <div><dt className="text-gray-500 text-xs mb-0.5">Complexidade</dt><dd className="font-medium">{workflow.procedure?.complexity}</dd></div>
              {workflow.procedure?.cid && <div><dt className="text-gray-500 text-xs mb-0.5">CID</dt><dd className="font-medium">{workflow.procedure.cid}</dd></div>}
              {workflow.procedure?.scheduledAt && <div><dt className="text-gray-500 text-xs mb-0.5">Agendado</dt><dd className="font-medium">{new Date(workflow.procedure.scheduledAt).toLocaleDateString('pt-BR')}</dd></div>}
            </dl>
            {workflow.procedure?.notes && <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{workflow.procedure.notes}</p>}
          </div>

          {/* Materials */}
          {workflow.procedure?.materials?.length > 0 && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Materiais OPME</h2>
              <div className="space-y-2">
                {workflow.procedure.materials.map((pm: any) => (
                  <div key={pm.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{pm.material?.name}</p>
                      <p className="text-xs text-gray-500">{pm.material?.code} · {pm.material?.supplier?.name}</p>
                    </div>
                    <Badge variant="info">Qtd: {pm.quantity}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Histórico de Ações</h2>
            {(workflow.history || []).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum histórico registrado.</p>
            ) : (
              <div className="space-y-4">
                {(workflow.history || []).map((h: any) => (
                  <div key={h.id} className="flex gap-3 text-sm">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {h.user?.name} <span className="text-gray-500 font-normal">— {h.action}</span>
                      </p>
                      {h.previousStep && (
                        <p className="text-xs text-gray-500">{stepLabels[h.previousStep]} → {stepLabels[h.newStep]}</p>
                      )}
                      {h.notes && <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded mt-1">{h.notes}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(h.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Status Atual</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Etapa:</span>
                <Badge variant="info">{stepLabels[workflow.currentStep]}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status:</span>
                <Badge variant={workflow.status === 'EM_ANDAMENTO' ? 'info' : workflow.status === 'CONCLUIDO' ? 'success' : 'danger'}>
                  {workflow.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Prioridade:</span>
                <Badge variant={workflow.priority === 'URGENTE' ? 'danger' : workflow.priority === 'ALTA' ? 'warning' : 'default'}>
                  {workflow.priority}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Criado:</span>
                <span className="text-gray-700">{new Date(workflow.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {canAct && (
            <div className="card space-y-3">
              <h2 className="text-base font-semibold text-gray-900">Ações Disponíveis</h2>
              <p className="text-xs text-gray-500">
                Você é responsável pela etapa: <span className="font-semibold text-primary-600">{stepLabels[workflow.currentStep]}</span>
              </p>
              <button
                onClick={() => { setAdvancing('approve'); setIsAdvanceModalOpen(true); }}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" /> Aprovar e Avançar
              </button>
              <button
                onClick={() => { setAdvancing('reject'); setIsAdvanceModalOpen(true); }}
                className="btn-danger w-full flex items-center justify-center gap-2"
              >
                <XCircle className="h-4 w-4" /> Reprovar
              </button>
            </div>
          )}

          {!canAct && workflow.status === 'EM_ANDAMENTO' && (
            <div className="card">
              <div className="flex items-center gap-2 text-yellow-600 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">Aguardando ação</p>
              </div>
              <p className="text-xs text-gray-500">Esta etapa requer ação de outro perfil de usuário.</p>
            </div>
          )}

          {workflow.status === 'REPROVADO' && (
            <div className="card border-red-200 bg-red-50">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <p className="text-sm font-semibold">Workflow Reprovado</p>
              </div>
            </div>
          )}

          {workflow.status === 'CONCLUIDO' && (
            <div className="card border-green-200 bg-green-50">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <p className="text-sm font-semibold">Workflow Concluído</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isAdvanceModalOpen}
        onClose={() => { setIsAdvanceModalOpen(false); setNotes(''); }}
        title={advancing === 'approve' ? 'Aprovar e Avançar Workflow' : 'Reprovar Workflow'}
      >
        <div className="space-y-4">
          {advancing === 'approve' ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>Avançar para: <strong>{stepLabels[stepOrder[currentStepIdx + 1]] || 'Concluído'}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <XCircle className="h-5 w-5 flex-shrink-0" />
              <span>Reprovar e encerrar este workflow</span>
            </div>
          )}
          <div>
            <label className="label">
              Observações {advancing === 'reject' ? <span className="text-red-500">*</span> : '(opcional)'}
            </label>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Descreva o motivo ou adicione observações..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setIsAdvanceModalOpen(false); setNotes(''); }} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => advanceMutation.mutate({ approved: advancing === 'approve', notes })}
              disabled={advanceMutation.isPending || (advancing === 'reject' && !notes.trim())}
              className={advancing === 'approve' ? 'btn-primary' : 'btn-danger'}
            >
              {advanceMutation.isPending ? 'Processando...' : advancing === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Reprovação'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
