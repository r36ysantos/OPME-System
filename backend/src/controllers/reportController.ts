import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import * as XLSX from 'xlsx';

const stepLabels: Record<string, string> = {
  ANALISE_INICIAL: 'Análise Inicial',
  VALIDACAO_TECNICA: 'Validação Técnica',
  COMPRA: 'Compra',
  AUDITORIA_CLINICA: 'Auditoria Clínica',
  APROVACAO_FINAL: 'Aprovação Final',
  CONCLUIDO: 'Concluído',
};

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  EM_COMPRA: 'Em Compra',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  COORDENADOR_OPME: 'Coordenador OPME',
  ANALISTA_OPME: 'Analista OPME',
  ASSISTENTE_OPME: 'Assistente OPME',
  COMPRADOR_OPME: 'Comprador OPME',
  ENFERMEIRO_AUDITOR: 'Enfermeiro Auditor',
};

function formatDate(d: any): string {
  if (!d) return '';
  return new Date(d).toLocaleString('pt-BR');
}

function formatDateOnly(d: any): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR');
}

async function fetchProcedures(filters: any) {
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.doctorId) where.doctorId = filters.doctorId;
  if (filters.patientId) where.patientId = filters.patientId;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  if (filters.workflowStep && filters.workflowStep !== '') {
    where.workflow = { currentStep: filters.workflowStep };
  }

  return prisma.procedure.findMany({
    where,
    include: {
      patient: true,
      doctor: true,
      materials: {
        include: {
          material: { include: { supplier: { select: { name: true } } } },
        },
      },
      workflow: {
        include: {
          history: {
            include: { user: { select: { name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
          tasks: {
            include: { assignedTo: { select: { name: true, role: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Extract step dates from workflow history
function extractStepDates(history: any[]) {
  const steps: Record<string, { start?: string; end?: string; user?: string; notes?: string }> = {};
  for (const h of history) {
    if (h.newStep) {
      if (!steps[h.newStep]) steps[h.newStep] = {};
      steps[h.newStep].start = h.createdAt;
      steps[h.newStep].user = h.user?.name;
    }
    if (h.previousStep) {
      if (!steps[h.previousStep]) steps[h.previousStep] = {};
      steps[h.previousStep].end = h.createdAt;
    }
    if (h.notes && h.newStep) {
      if (!steps[h.newStep]) steps[h.newStep] = {};
      steps[h.newStep].notes = h.notes;
    }
  }
  return steps;
}

function calcDays(start?: string, end?: string): string {
  if (!start) return '';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return diff.toString();
}

export const exportExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const procedures = await fetchProcedures(req.query);

    const wb = XLSX.utils.book_new();

    // ===== SHEET 1: Procedures Summary =====
    const procRows = procedures.map((p) => {
      const stepDates = extractStepDates(p.workflow?.history || []);
      const materialsList = p.materials.map(pm => `${pm.material.name} (Qtd: ${pm.quantity})`).join('; ');
      return {
        'ID': p.id.slice(0, 8).toUpperCase(),
        'Procedimento': p.name,
        'Tipo': p.type,
        'Complexidade': p.complexity,
        'CID': p.cid || '',
        'TUSS': p.tuss || '',
        'Data Agendada': formatDateOnly(p.scheduledAt),
        'Status': statusLabels[p.status] || p.status,
        'Observações': p.notes || '',
        'Paciente': p.patient?.name || '',
        'CPF Paciente': p.patient?.cpf || '',
        'Prontuário': p.patient?.medicalRecord || '',
        'Plano de Saúde': p.patient?.healthPlan || '',
        'Médico': p.doctor?.name || '',
        'CRM': p.doctor?.crm || '',
        'Especialidade': p.doctor?.specialty || '',
        'Materiais': materialsList,
        'Etapa Atual': stepLabels[p.workflow?.currentStep || ''] || '',
        'Status Workflow': p.workflow?.status?.replace(/_/g, ' ') || '',
        'Prioridade': p.workflow?.priority || '',
        'Data Criação': formatDate(p.createdAt),
        'Dt. Início Análise': formatDate(stepDates['ANALISE_INICIAL']?.start),
        'Dt. Fim Análise': formatDate(stepDates['ANALISE_INICIAL']?.end),
        'Dt. Início Val. Técnica': formatDate(stepDates['VALIDACAO_TECNICA']?.start),
        'Dt. Fim Val. Técnica': formatDate(stepDates['VALIDACAO_TECNICA']?.end),
        'Dt. Início Compra': formatDate(stepDates['COMPRA']?.start),
        'Dt. Fim Compra': formatDate(stepDates['COMPRA']?.end),
        'Dt. Início Auditoria': formatDate(stepDates['AUDITORIA_CLINICA']?.start),
        'Dt. Fim Auditoria': formatDate(stepDates['AUDITORIA_CLINICA']?.end),
        'Dt. Início Aprovação': formatDate(stepDates['APROVACAO_FINAL']?.start),
        'Dt. Conclusão': formatDate(stepDates['CONCLUIDO']?.start),
        'Dias Totais': calcDays(stepDates['ANALISE_INICIAL']?.start, stepDates['CONCLUIDO']?.start || undefined),
      };
    });

    const ws1 = XLSX.utils.json_to_sheet(procRows.length > 0 ? procRows : [{ 'Procedimento': 'Nenhum registro encontrado' }]);
    ws1['!cols'] = [
      { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 35 }, { wch: 20 },
      { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Procedimentos');

    // ===== SHEET 2: Workflow History =====
    const histRows: any[] = [];
    for (const p of procedures) {
      for (const h of (p.workflow?.history || [])) {
        histRows.push({
          'Procedimento': p.name,
          'Paciente': p.patient?.name || '',
          'Médico': p.doctor?.name || '',
          'Status Procedimento': statusLabels[p.status] || p.status,
          'Ação': h.action,
          'Etapa Anterior': stepLabels[h.previousStep || ''] || '',
          'Nova Etapa': stepLabels[h.newStep || ''] || '',
          'Responsável': h.user?.name || '',
          'Perfil': roleLabels[h.user?.role || ''] || '',
          'Data/Hora': formatDate(h.createdAt),
          'Observações': h.notes || '',
        });
      }
    }
    const ws2 = XLSX.utils.json_to_sheet(histRows.length > 0 ? histRows : [{ 'Procedimento': 'Nenhum registro' }]);
    ws2['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 14 }, { wch: 12 },
      { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 22 }, { wch: 20 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Histórico de Workflow');

    // ===== SHEET 3: Materials =====
    const matRows: any[] = [];
    for (const p of procedures) {
      for (const pm of p.materials) {
        matRows.push({
          'Procedimento': p.name,
          'Paciente': p.patient?.name || '',
          'Médico': p.doctor?.name || '',
          'Status Procedimento': statusLabels[p.status] || p.status,
          'Material': pm.material?.name || '',
          'Código': pm.material?.code || '',
          'Lote': pm.material?.lot || '',
          'Quantidade': pm.quantity,
          'Fornecedor': pm.material?.supplier?.name || '',
          'Preço Unit. (R$)': pm.material?.unitPrice ? Number(pm.material.unitPrice).toFixed(2) : '',
          'Total (R$)': pm.material?.unitPrice ? (Number(pm.material.unitPrice) * pm.quantity).toFixed(2) : '',
          'Validade': formatDateOnly(pm.material?.expiryDate),
        });
      }
    }
    const ws3 = XLSX.utils.json_to_sheet(matRows.length > 0 ? matRows : [{ 'Material': 'Nenhum material vinculado' }]);
    ws3['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 14 },
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'Materiais Utilizados');

    // ===== SHEET 4: Step Duration Summary =====
    const durationRows = procedures.map((p) => {
      const stepDates = extractStepDates(p.workflow?.history || []);
      return {
        'Procedimento': p.name,
        'Paciente': p.patient?.name || '',
        'Status': statusLabels[p.status] || p.status,
        'Data Criação': formatDate(p.createdAt),
        'Dias em Análise Inicial': calcDays(stepDates['ANALISE_INICIAL']?.start, stepDates['ANALISE_INICIAL']?.end),
        'Dias em Val. Técnica': calcDays(stepDates['VALIDACAO_TECNICA']?.start, stepDates['VALIDACAO_TECNICA']?.end),
        'Dias em Compra': calcDays(stepDates['COMPRA']?.start, stepDates['COMPRA']?.end),
        'Dias em Auditoria': calcDays(stepDates['AUDITORIA_CLINICA']?.start, stepDates['AUDITORIA_CLINICA']?.end),
        'Dias em Aprovação': calcDays(stepDates['APROVACAO_FINAL']?.start, stepDates['APROVACAO_FINAL']?.end),
        'Total de Dias': calcDays(stepDates['ANALISE_INICIAL']?.start, stepDates['CONCLUIDO']?.start || undefined),
        'Concluído em': formatDate(stepDates['CONCLUIDO']?.start),
      };
    });
    const ws4 = XLSX.utils.json_to_sheet(durationRows.length > 0 ? durationRows : [{ 'Procedimento': 'Nenhum registro' }]);
    ws4['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 14 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws4, 'Tempo por Etapa');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `OPME_Relatorio_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
  } catch (error) {
    next(error);
  }
};

export const exportCSV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const procedures = await fetchProcedures(req.query);

    const rows = procedures.map((p) => {
      const stepDates = extractStepDates(p.workflow?.history || []);
      const materials = p.materials.map(pm => pm.material.name).join(' | ');
      return [
        p.id.slice(0, 8).toUpperCase(),
        p.name,
        p.type,
        p.complexity,
        p.cid || '',
        p.tuss || '',
        formatDateOnly(p.scheduledAt),
        statusLabels[p.status] || p.status,
        p.patient?.name || '',
        p.patient?.cpf || '',
        p.patient?.medicalRecord || '',
        p.doctor?.name || '',
        p.doctor?.crm || '',
        materials,
        stepLabels[p.workflow?.currentStep || ''] || '',
        p.workflow?.status || '',
        p.workflow?.priority || '',
        formatDate(p.createdAt),
        formatDate(stepDates['ANALISE_INICIAL']?.start),
        formatDate(stepDates['VALIDACAO_TECNICA']?.start),
        formatDate(stepDates['COMPRA']?.start),
        formatDate(stepDates['AUDITORIA_CLINICA']?.start),
        formatDate(stepDates['APROVACAO_FINAL']?.start),
        formatDate(stepDates['CONCLUIDO']?.start),
        calcDays(stepDates['ANALISE_INICIAL']?.start, stepDates['CONCLUIDO']?.start || undefined),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const header = [
      'ID', 'Procedimento', 'Tipo', 'Complexidade', 'CID', 'TUSS', 'Data Agendada', 'Status',
      'Paciente', 'CPF', 'Prontuário', 'Médico', 'CRM', 'Materiais',
      'Etapa Atual', 'Status Workflow', 'Prioridade', 'Data Criação',
      'Dt. Análise Inicial', 'Dt. Val. Técnica', 'Dt. Compra', 'Dt. Auditoria',
      'Dt. Aprovação', 'Dt. Conclusão', 'Dias Totais',
    ].map(h => `"${h}"`).join(',');

    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const filename = `OPME_Procedimentos_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const getReportSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const procedures = await fetchProcedures(req.query);

    const byStatus = procedures.reduce((acc: any, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    const byComplexity = procedures.reduce((acc: any, p) => {
      acc[p.complexity] = (acc[p.complexity] || 0) + 1;
      return acc;
    }, {});

    const byType = procedures.reduce((acc: any, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {});

    const byDoctor = procedures.reduce((acc: any, p) => {
      const name = p.doctor?.name || 'Sem médico';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    const byStep = procedures.reduce((acc: any, p) => {
      const step = p.workflow?.currentStep || 'SEM_WORKFLOW';
      acc[step] = (acc[step] || 0) + 1;
      return acc;
    }, {});

    // Average days per procedure
    const durations = procedures
      .map((p) => {
        const stepDates = extractStepDates(p.workflow?.history || []);
        const start = stepDates['ANALISE_INICIAL']?.start;
        const end = stepDates['CONCLUIDO']?.start;
        if (start && end) {
          return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
        }
        return null;
      })
      .filter((d) => d !== null) as number[];

    const avgDays = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    res.json({
      total: procedures.length,
      byStatus,
      byComplexity,
      byType,
      byDoctor,
      byStep,
      avgDays,
      procedures: procedures.slice(0, 100).map((p) => {
        const stepDates = extractStepDates(p.workflow?.history || []);
        return {
          id: p.id,
          name: p.name,
          type: p.type,
          complexity: p.complexity,
          status: p.status,
          patient: p.patient?.name,
          doctor: p.doctor?.name,
          currentStep: p.workflow?.currentStep,
          workflowStatus: p.workflow?.status,
          priority: p.workflow?.priority,
          createdAt: p.createdAt,
          scheduledAt: p.scheduledAt,
          materialsCount: p.materials.length,
          stepDates,
          totalDays: calcDays(stepDates['ANALISE_INICIAL']?.start, stepDates['CONCLUIDO']?.start || undefined) || null,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};
