import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, Upload, Trash2, Download, Eye, Search,
  FileText, File, Image, Table2, X, FolderOpen,
  CheckCircle, AlertCircle, RefreshCw, UploadCloud, AlertTriangle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientFile {
  id: string;
  originalName: string;
  name: string;
  mimeType: string;
  size: number;
  category: 'pdf' | 'image' | 'document' | 'other';
  description?: string;
  createdAt: string;
  exists: boolean;
  uploadedBy: { id: string; name: string };
  patient?: { id: string; name: string };
}

interface Patient {
  id: string;
  name: string;
  cpf: string;
  medicalRecord?: string;
  healthPlan?: string;
  birthDate: string;
}

interface FileStats {
  total: number;
  totalSize: number;
  byCategory: { pdf: number; image: number; document: number; other: number };
}

interface SelectedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatCPF(cpf: string) {
  const n = cpf.replace(/\D/g, '');
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getMimeCategory(mimeType: string): 'pdf' | 'image' | 'document' | 'other' {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType.includes('word') || mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') || mimeType.includes('document') ||
    mimeType === 'text/plain' || mimeType === 'text/csv'
  ) return 'document';
  return 'other';
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

// ─── File icon component ──────────────────────────────────────────────────────

function FileIcon({ mimeType, size = 'md' }: { mimeType: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  if (mimeType === 'application/pdf')
    return <FileText className={`${s} text-red-500`} />;
  if (mimeType.startsWith('image/'))
    return <Image className={`${s} text-blue-500`} />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType === 'text/csv')
    return <Table2 className={`${s} text-green-500`} />;
  if (mimeType.includes('word') || mimeType.includes('document') || mimeType === 'text/plain')
    return <FileText className={`${s} text-blue-700`} />;
  return <File className={`${s} text-gray-400`} />;
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

function DeleteConfirmModal({
  file,
  onConfirm,
  onCancel,
  isDeleting,
  error,
}: {
  file: PatientFile;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  error?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={!isDeleting ? onCancel : undefined} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        {/* Icon + title */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Excluir arquivo</h3>
            <p className="text-sm text-gray-500 mt-1">
              Tem certeza que deseja excluir este arquivo? Esta ação não poderá ser desfeita.
            </p>
          </div>
        </div>

        {/* File info */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
          <FileIcon mimeType={file.mimeType} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{file.originalName}</p>
            <p className="text-xs text-gray-400">{formatBytes(file.size)} · enviado por {file.uploadedBy.name}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
          >
            {isDeleting ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Excluindo...</>
            ) : (
              <><Trash2 className="h-4 w-4" /> Excluir arquivo</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Success toast ────────────────────────────────────────────────────────────

function SuccessToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg animate-fade-in">
      <CheckCircle className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onDismiss} className="ml-2 text-green-200 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({ file, onClose }: { file: PatientFile; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const token = localStorage.getItem('opme_token');
      const res = await fetch(`/api/files/${file.id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao carregar arquivo');
      const blob = await res.blob();
      setBlobUrl(URL.createObjectURL(blob));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [file.id]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const handleClose = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    onClose();
  };

  const canPreview = file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon mimeType={file.mimeType} size="sm" />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{file.originalName}</p>
              <p className="text-xs text-gray-500">{formatBytes(file.size)} · {formatDate(file.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={`/api/files/${file.id}/download`}
              onClick={async (e) => {
                e.preventDefault();
                const token = localStorage.getItem('opme_token');
                const res = await fetch(`/api/files/${file.id}/download`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.originalName;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Baixar"
            >
              <Download className="h-4 w-4" />
            </a>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 bg-gray-50 rounded-b-xl min-h-[400px] flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <p>Carregando arquivo...</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-3 text-red-500">
              <AlertCircle className="h-8 w-8" />
              <p>Não foi possível carregar o arquivo.</p>
            </div>
          )}
          {!loading && !error && blobUrl && canPreview && (
            file.mimeType.startsWith('image/') ? (
              <img src={blobUrl} alt={file.originalName} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow" />
            ) : (
              <iframe src={blobUrl} title={file.originalName} className="w-full h-[70vh] rounded-lg border-0" />
            )
          )}
          {!loading && !error && !canPreview && (
            <div className="flex flex-col items-center gap-4 text-gray-500">
              <FileIcon mimeType={file.mimeType} size="lg" />
              <p className="text-sm">Visualização não disponível para este tipo de arquivo.</p>
              <button
                onClick={async () => {
                  if (!blobUrl) return;
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = file.originalName;
                  a.click();
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="h-4 w-4" /> Baixar arquivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Upload modal ─────────────────────────────────────────────────────────────

function UploadModal({
  patientId,
  patientName,
  onClose,
  onSuccess,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles: SelectedFile[] = Array.from(files).map((f) => ({
      file: f,
      id: Math.random().toString(36).slice(2),
      status: ALLOWED_TYPES.includes(f.type) ? 'pending' : 'error',
      error: ALLOWED_TYPES.includes(f.type) ? undefined : 'Tipo não permitido',
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const validFiles = selectedFiles.filter((f) => f.status !== 'error');

  const handleUpload = async () => {
    if (validFiles.length === 0) return;
    setIsUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('patientId', patientId);
    if (description) formData.append('description', description);
    validFiles.forEach((f) => formData.append('files', f.file));

    try {
      await api.post(`/patients/${patientId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setProgress(100);
      setUploadDone(true);
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao enviar arquivos.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={!isUploading ? onClose : undefined} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload de Arquivos</h2>
            <p className="text-sm text-gray-500">Paciente: {patientName}</p>
          </div>
          {!isUploading && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {!uploadDone ? (
            <>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Arraste arquivos aqui ou clique para selecionar</p>
                <p className="text-xs text-gray-400 mt-1">PDF, Imagens (JPG, PNG, GIF, WebP), Word, Excel · Máx. 50 MB por arquivo</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedFiles.map((f) => (
                    <div key={f.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                      f.status === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <FileIcon mimeType={f.file.type} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{f.file.name}</p>
                        <p className="text-xs text-gray-400">{formatBytes(f.file.size)}</p>
                      </div>
                      {f.status === 'error' ? (
                        <span className="text-xs text-red-500 flex-shrink-0">{f.error}</span>
                      ) : (
                        <button onClick={() => removeFile(f.id)} className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="label">Descrição (opcional)</label>
                <input
                  className="input"
                  placeholder="Ex: Laudo pré-operatório, Raio-X do joelho..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Enviando {validFiles.length} arquivo(s)...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} disabled={isUploading} className="btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={validFiles.length === 0 || isUploading}
                  className="btn-primary flex items-center gap-2"
                >
                  {isUploading ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Upload className="h-4 w-4" /> Fazer Upload ({validFiles.length})</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Upload concluído!</p>
                <p className="text-sm text-gray-500">{validFiles.length} arquivo(s) enviado(s) com sucesso.</p>
              </div>
              <button onClick={onClose} className="btn-primary">Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type CategoryTab = 'all' | 'pdf' | 'image' | 'document' | 'other';

export default function PatientFilesPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasModule } = useAuth();

  const [activeTab, setActiveTab]     = useState<CategoryTab>('all');
  const [search, setSearch]           = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PatientFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PatientFile | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [successMsg, setSuccessMsg]   = useState('');

  // ── Queries ──
  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => api.get(`/patients/${patientId}`).then((r) => r.data as Patient),
    enabled: !!patientId,
  });

  const { data: files = [], isLoading: loadingFiles } = useQuery({
    queryKey: ['patient-files', patientId, activeTab, search],
    queryFn: () =>
      api.get('/files', {
        params: {
          patientId,
          ...(activeTab !== 'all' ? { category: activeTab } : {}),
          ...(search ? { search } : {}),
        },
      }).then((r) => r.data as PatientFile[]),
    enabled: !!patientId,
  });

  const { data: stats } = useQuery({
    queryKey: ['patient-file-stats', patientId],
    queryFn: () => api.get(`/patients/${patientId}/files/stats`).then((r) => r.data as FileStats),
    enabled: !!patientId,
  });

  // ── Delete mutation ──
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-files', patientId] });
      qc.invalidateQueries({ queryKey: ['patient-file-stats', patientId] });
      setDeleteTarget(null);
      setDeleteError('');
      setSuccessMsg('Arquivo excluído com sucesso.');
    },
    onError: (err: any) => {
      setDeleteError(err?.response?.data?.error || 'Erro ao excluir o arquivo. Tente novamente.');
    },
  });

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setDeleteError('');
    deleteMutation.mutate(deleteTarget.id);
  };

  const handleDeleteRequest = (file: PatientFile) => {
    setDeleteError('');
    setDeleteTarget(file);
  };

  // ── Download ──
  const downloadFile = async (file: PatientFile) => {
    const token = localStorage.getItem('opme_token');
    const res = await fetch(`/api/files/${file.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.originalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Tabs ──
  const tabs: { key: CategoryTab; label: string; count: number | undefined }[] = [
    { key: 'all',      label: 'Todos',      count: stats?.total },
    { key: 'pdf',      label: 'PDFs',       count: stats?.byCategory.pdf },
    { key: 'image',    label: 'Imagens',    count: stats?.byCategory.image },
    { key: 'document', label: 'Documentos', count: stats?.byCategory.document },
    { key: 'other',    label: 'Outros',     count: stats?.byCategory.other },
  ];

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">Paciente não encontrado.</p>
        <button onClick={() => navigate('/patients')} className="btn-secondary">Voltar</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/patients')}
            className="mt-1 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <span className="hover:text-gray-600 cursor-pointer" onClick={() => navigate('/patients')}>Pacientes</span>
              <span>/</span>
              <span className="text-gray-600 font-medium">{patient.name}</span>
              <span>/</span>
              <span className="text-gray-700 font-semibold">Arquivos</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-primary-600" />
              Arquivos do Paciente
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span>{patient.name}</span>
              <span>·</span>
              <span>CPF: {formatCPF(patient.cpf)}</span>
              {patient.medicalRecord && <><span>·</span><span>Prontuário: {patient.medicalRecord}</span></>}
              {patient.healthPlan && <><span>·</span><span>{patient.healthPlan}</span></>}
            </div>
          </div>
        </div>
        {hasModule('FILES', 'create') && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            <Upload className="h-4 w-4" /> Upload de Arquivos
          </button>
        )}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: stats.total,              sub: formatBytes(stats.totalSize), color: 'text-gray-900' },
            { label: 'PDFs',       value: stats.byCategory.pdf,     sub: 'laudos, receitas',           color: 'text-red-600' },
            { label: 'Imagens',    value: stats.byCategory.image,   sub: 'fotos, raio-x',              color: 'text-blue-600' },
            { label: 'Documentos', value: stats.byCategory.document,sub: 'word, excel',                color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="card py-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm font-medium text-gray-700">{s.label}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Search + File grid */}
      <div className="card">
        <div className="flex items-center gap-1 border-b border-gray-200 -mx-6 px-6 mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome do arquivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {loadingFiles ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FolderOpen className="h-12 w-12 mb-3" />
            <p className="text-sm font-medium">Nenhum arquivo encontrado</p>
            <p className="text-xs mt-1">
              {search ? 'Tente outra busca.' : 'Clique em "Upload de Arquivos" para adicionar.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onPreview={() => setPreviewFile(file)}
                onDownload={() => downloadFile(file)}
                onDelete={() => handleDeleteRequest(file)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {isUploadOpen && (
        <UploadModal
          patientId={patientId!}
          patientName={patient.name}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['patient-files', patientId] });
            qc.invalidateQueries({ queryKey: ['patient-file-stats', patientId] });
            setTimeout(() => setIsUploadOpen(false), 1500);
          }}
        />
      )}

      {/* Preview modal */}
      {previewFile && (
        <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          file={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
          isDeleting={deleteMutation.isPending}
          error={deleteError}
        />
      )}

      {/* Success toast */}
      {successMsg && (
        <SuccessToast message={successMsg} onDismiss={() => setSuccessMsg('')} />
      )}
    </div>
  );
}

// ─── File card ────────────────────────────────────────────────────────────────

function FileCard({
  file,
  onPreview,
  onDownload,
  onDelete,
}: {
  file: PatientFile;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const canPreview = file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf';
  const ext = file.originalName.split('.').pop()?.toUpperCase() || '?';

  return (
    <div className={`group relative border rounded-xl p-3 hover:shadow-md transition-all bg-white ${
      !file.exists ? 'opacity-60 border-dashed border-red-200' : 'border-gray-200 hover:border-primary-200'
    }`}>
      {/* Thumbnail / icon area */}
      <div
        className="flex items-center justify-center h-24 bg-gray-50 rounded-lg mb-3 cursor-pointer overflow-hidden"
        onClick={canPreview && file.exists ? onPreview : undefined}
      >
        {file.mimeType.startsWith('image/') && file.exists ? (
          <ImageThumbnail fileId={file.id} />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <FileIcon mimeType={file.mimeType} size="lg" />
            <span className="text-xs font-bold text-gray-400">{ext}</span>
          </div>
        )}
        {canPreview && file.exists && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <Eye className="h-6 w-6 text-white drop-shadow" />
          </div>
        )}
      </div>

      {/* File info */}
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-gray-800 truncate" title={file.originalName}>
          {file.originalName}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{formatBytes(file.size)}</span>
          <span>·</span>
          <span>{new Date(file.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>
        {file.description && (
          <p className="text-xs text-gray-500 italic truncate">{file.description}</p>
        )}
        <p className="text-xs text-gray-400 truncate">por {file.uploadedBy.name}</p>
      </div>

      {!file.exists && (
        <div className="absolute top-2 right-2">
          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Arquivo ausente</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100">
        {canPreview && file.exists && (
          <button
            onClick={onPreview}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="h-3.5 w-3.5" /> Ver
          </button>
        )}
        <button
          onClick={onDownload}
          disabled={!file.exists}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Baixar
        </button>
        <button
          onClick={onDelete}
          title="Excluir arquivo"
          className="flex items-center justify-center p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Image thumbnail (loads with auth token) ──────────────────────────────────

function ImageThumbnail({ fileId }: { fileId: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('opme_token');
    fetch(`/api/files/${fileId}/view`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => setSrc(URL.createObjectURL(blob)))
      .catch(() => {});
  }, [fileId]);

  if (!src) return <RefreshCw className="h-6 w-6 text-gray-300 animate-spin" />;
  return <img src={src} alt="" className="h-full w-full object-cover rounded-lg" />;
}
