import { useState } from 'react';
import { Menu, Bell, LogOut, User, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import Modal from '../ui/Modal';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  COORDENADOR_OPME: 'Coordenador OPME',
  ANALISTA_OPME: 'Analista OPME',
  ASSISTENTE_OPME: 'Assistente OPME',
  COMPRADOR_OPME: 'Comprador OPME',
  ENFERMEIRO_AUDITOR: 'Enfermeiro Auditor',
};

// ─── Password strength bar ────────────────────────────────────────────────────

function strengthOf(p: string): { score: number; label: string; color: string } {
  if (!p) return { score: 0, label: '', color: '' };
  let s = 0;
  if (p.length >= 8)          s++;
  if (/[A-Z]/.test(p))        s++;
  if (/[a-z]/.test(p))        s++;
  if (/[0-9]/.test(p))        s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const map = [
    { label: '', color: '' },
    { label: 'Muito fraca', color: 'bg-red-500' },
    { label: 'Fraca',       color: 'bg-orange-400' },
    { label: 'Razoável',    color: 'bg-yellow-400' },
    { label: 'Boa',         color: 'bg-blue-500' },
    { label: 'Forte',       color: 'bg-green-500' },
  ];
  return { score: s, ...map[s] };
}

// ─── Change-password modal ────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const [form,    setForm]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show,    setShow]    = useState({ current: false, next: false, confirm: false });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = strengthOf(form.newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', form);
      setSuccess(true);
      // After success, log out so the user gets a fresh token with the new tokenVersion
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    key:   keyof typeof form,
    showKey: keyof typeof show,
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show[showKey] ? 'text' : 'password'}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="input-field pr-10"
          required
          disabled={loading || success}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
          onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))}
          tabIndex={-1}
        >
          {show[showKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  if (success) {
    return (
      <Modal isOpen onClose={onClose} title="Senha alterada">
        <div className="py-8 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <p className="text-gray-700 font-medium">Senha alterada com sucesso!</p>
          <p className="text-sm text-gray-500">Você será desconectado automaticamente para aplicar a alteração.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Alterar senha">
      <form onSubmit={handleSubmit} className="space-y-4">
        {field('Senha atual', 'currentPassword', 'current')}
        {field('Nova senha', 'newPassword', 'next')}

        {/* Strength bar */}
        {form.newPassword && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1,2,3,4,5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    strength.score >= i ? strength.color : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            {strength.label && (
              <p className="text-xs text-gray-500">Força da senha: <span className="font-medium">{strength.label}</span></p>
            )}
            <ul className="text-xs text-gray-400 space-y-0.5 mt-1">
              {[
                [/.{8,}/, 'Mínimo 8 caracteres'],
                [/[A-Z]/, 'Letra maiúscula'],
                [/[a-z]/, 'Letra minúscula'],
                [/[0-9]/, 'Número'],
                [/[^A-Za-z0-9]/, 'Caractere especial'],
              ].map(([re, hint]) => (
                <li key={hint as string} className={`flex items-center gap-1 ${(re as RegExp).test(form.newPassword) ? 'text-green-600' : ''}`}>
                  <span>{(re as RegExp).test(form.newPassword) ? '✓' : '○'}</span> {hint as string}
                </li>
              ))}
            </ul>
          </div>
        )}

        {field('Confirmar nova senha', 'confirmPassword', 'confirm')}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={loading || strength.score < 5}>
            {loading ? 'Alterando…' : 'Alterar senha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold text-primary-600">OPME</span>
            <span>/</span>
            <span>Sistema de Gestão</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            {/* User info — click opens dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 bg-primary-50 rounded-lg px-3 py-1.5 hover:bg-primary-100 transition-colors"
              >
                <User className="h-4 w-4 text-primary-600" />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                  <p className="text-xs text-primary-600">{roleLabels[user?.role || ''] || user?.role}</p>
                </div>
              </button>

              {menuOpen && (
                <>
                  {/* backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                    <button
                      onClick={() => { setMenuOpen(false); setShowPasswordModal(true); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <KeyRound className="h-4 w-4 text-gray-400" />
                      Alterar senha
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </>
  );
}
