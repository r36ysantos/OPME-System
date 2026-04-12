import { useState } from 'react';
import { Menu, Bell, LogOut, KeyRound, Eye, EyeOff, CheckCircle2, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import Modal from '../ui/Modal';

const roleLabels: Record<string, string> = {
  ADMIN:              'Administrador',
  COORDENADOR_OPME:   'Coordenador OPME',
  ANALISTA_OPME:      'Analista OPME',
  ASSISTENTE_OPME:    'Assistente OPME',
  COMPRADOR_OPME:     'Comprador OPME',
  ENFERMEIRO_AUDITOR: 'Enfermeiro Auditor',
};

const roleBadgeStyle: Record<string, { bg: string; color: string; border: string }> = {
  ADMIN:              { bg: '#F3E8FF', color: '#7E22CE', border: '#C4B5FD' },
  COORDENADOR_OPME:   { bg: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' },
  ANALISTA_OPME:      { bg: '#E0F2FE', color: '#0369A1', border: '#7DD3FC' },
  ASSISTENTE_OPME:    { bg: '#CCFBF1', color: '#0F766E', border: '#5EEAD4' },
  COMPRADOR_OPME:     { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
  ENFERMEIRO_AUDITOR: { bg: '#FEF9C3', color: '#A16207', border: '#FDE047' },
};

// ─── Password strength ────────────────────────────────────────────────────────
function strengthOf(p: string) {
  if (!p) return { score: 0, label: '', color: '' };
  let s = 0;
  if (p.length >= 8)          s++;
  if (/[A-Z]/.test(p))        s++;
  if (/[a-z]/.test(p))        s++;
  if (/[0-9]/.test(p))        s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const map = [
    { label: '',            color: '' },
    { label: 'Muito fraca', color: 'bg-red-500' },
    { label: 'Fraca',       color: 'bg-orange-400' },
    { label: 'Razoável',    color: 'bg-yellow-400' },
    { label: 'Boa',         color: 'bg-blue-500' },
    { label: 'Forte',       color: 'bg-green-500' },
  ];
  return { score: s, ...map[s] };
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show,    setShow]    = useState({ current: false, next: false, confirm: false });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = strengthOf(form.newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      await api.put('/auth/change-password', form);
      setSuccess(true);
      setTimeout(() => { logout(); navigate('/login'); }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao alterar senha.');
    } finally { setLoading(false); }
  };

  const field = (label: string, key: keyof typeof form, showKey: keyof typeof show) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show[showKey] ? 'text' : 'password'}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="input pr-10"
          required disabled={loading || success}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 px-3 text-sage hover:text-ink transition-colors"
          onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
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
        <div className="py-8 flex flex-col items-center gap-3 text-center animate-pop-in">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: '#DCFCE7', border: '2px solid #86EFAC', boxShadow: '4px 4px 0px 0px #86EFAC' }}>
            <CheckCircle2 className="h-8 w-8 text-[#15803D]" />
          </div>
          <p className="font-extrabold text-ink">Senha alterada com sucesso!</p>
          <p className="text-sm text-sage">Você será desconectado automaticamente.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Alterar senha">
      <form onSubmit={handleSubmit} className="space-y-4">
        {field('Senha atual', 'currentPassword', 'current')}
        {field('Nova senha', 'newPassword', 'next')}
        {form.newPassword && (
          <div className="space-y-2 animate-brutalist-in">
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded transition-all duration-200 ${strength.score >= i ? strength.color : 'bg-[#F1F5F9]'}`}
                  style={{ border: '1px solid #E2E8F0' }} />
              ))}
            </div>
            {strength.label && <p className="text-xs text-sage">Força: <span className="font-bold text-ink">{strength.label}</span></p>}
            <ul className="text-xs space-y-1">
              {([
                [/.{8,}/, 'Mínimo 8 caracteres'],
                [/[A-Z]/, 'Letra maiúscula'],
                [/[a-z]/, 'Letra minúscula'],
                [/[0-9]/, 'Número'],
                [/[^A-Za-z0-9]/, 'Caractere especial'],
              ] as [RegExp, string][]).map(([re, hint]) => (
                <li key={hint} className={`flex items-center gap-2 transition-colors duration-150 ${re.test(form.newPassword) ? 'text-[#15803D]' : 'text-sage'}`}>
                  <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={re.test(form.newPassword)
                      ? { background: '#DCFCE7', border: '1.5px solid #86EFAC', color: '#15803D' }
                      : { background: '#F1F5F9', border: '1.5px solid #E2E8F0', color: '#94A3B8' }}>
                    {re.test(form.newPassword) ? '✓' : '·'}
                  </span>
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        )}
        {field('Confirmar nova senha', 'confirmPassword', 'confirm')}
        {error && (
          <div className="text-sm text-[#B91C1C] px-3 py-2.5 animate-brutalist-in"
            style={{ background: '#FEE2E2', border: '2px solid #FCA5A5', borderRadius: '10px' }}>
            {error}
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading || strength.score < 5}>
            {loading ? 'Alterando…' : 'Alterar senha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
interface HeaderProps { onMenuToggle: () => void; }

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const role = user?.role || '';
  const badge = roleBadgeStyle[role] || { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30"
        style={{
          background: 'rgba(248,250,252,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '2px solid #E2E8F0',
          boxShadow: '0 2px 0px 0px rgba(15,23,42,0.05)',
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="p-2 text-sage transition-all duration-150"
            style={{ border: '2px solid #E2E8F0', borderRadius: '8px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0F172A'; (e.currentTarget as HTMLElement).style.color = '#0F172A'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="font-extrabold text-brand tracking-tight">OPME</span>
            <span className="text-[#CBD5E1] font-bold">/</span>
            <span className="text-sage font-semibold">Sistema de Gestão</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Bell */}
          <button
            data-tooltip="Notificações"
            className="relative p-2 text-sage transition-all duration-150"
            style={{ border: '2px solid #E2E8F0', borderRadius: '8px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0F172A'; (e.currentTarget as HTMLElement).style.color = '#0F172A'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
          >
            <Bell className="h-5 w-5" />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: '#2563EB', border: '1.5px solid white' }}
            />
          </button>

          <div style={{ width: '1px', height: '28px', background: '#E2E8F0', margin: '0 4px' }} />

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2.5 px-3 py-2 transition-all duration-150"
              style={{
                border: menuOpen ? '2px solid #0F172A' : '2px solid #E2E8F0',
                borderRadius: '10px',
                background: menuOpen ? '#F1F5F9' : 'transparent',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0F172A'; (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
              onMouseLeave={e => {
                if (!menuOpen) {
                  (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              {/* Avatar — square with hard shadow */}
              <div
                className="w-9 h-9 flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                style={{
                  background: '#2563EB',
                  border: '2px solid #0F172A',
                  borderRadius: '10px',
                  boxShadow: '2px 2px 0px 0px #0F172A',
                }}
              >
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-extrabold text-ink leading-tight">{user?.name}</p>
                <span
                  className="badge mt-0.5 inline-block"
                  style={{ background: badge.bg, color: badge.color, border: `1.5px solid ${badge.border}` }}
                >
                  {roleLabels[role] || role}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-sage transition-transform duration-200 hidden sm:block ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-2 w-60 bg-white z-20 py-2 animate-pop-in"
                  style={{
                    border: '2px solid #0F172A',
                    borderRadius: '14px',
                    boxShadow: '6px 6px 0px 0px #0F172A',
                  }}
                >
                  {/* User info */}
                  <div className="px-4 py-3 mb-1" style={{ borderBottom: '2px solid #F1F5F9' }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0"
                        style={{ background: '#2563EB', border: '2px solid #0F172A', borderRadius: '10px', boxShadow: '2px 2px 0px 0px #0F172A' }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-ink truncate">{user?.name}</p>
                        <p className="text-xs text-sage truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setMenuOpen(false); setShowPasswordModal(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-ink transition-all duration-100"
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.paddingLeft = '20px'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.paddingLeft = ''; }}
                  >
                    <KeyRound className="h-4 w-4 text-sage" />
                    Alterar senha
                  </button>

                  <div style={{ borderTop: '1px solid #F1F5F9', margin: '4px 12px' }} />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-all duration-100"
                    style={{ color: '#B91C1C' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEE2E2'; (e.currentTarget as HTMLElement).style.paddingLeft = '20px'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.paddingLeft = ''; }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair do sistema
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </>
  );
}
