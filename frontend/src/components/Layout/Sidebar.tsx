import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCog, Building2, Package,
  ClipboardList, GitBranch, Settings, BarChart2,
  ChevronLeft, Activity, FolderOpen,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/dashboard',  module: 'DASHBOARD',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workflows',  module: 'WORKFLOWS',  icon: GitBranch,        label: 'Workflows' },
  { to: '/procedures', module: 'PROCEDURES', icon: ClipboardList,    label: 'Procedimentos' },
  { to: '/patients',   module: 'PATIENTS',   icon: Users,            label: 'Pacientes' },
  { to: '/doctors',    module: 'DOCTORS',    icon: UserCog,          label: 'Médicos' },
  { to: '/materials',  module: 'MATERIALS',  icon: Package,          label: 'Materiais OPME' },
  { to: '/suppliers',  module: 'SUPPLIERS',  icon: Building2,        label: 'Fornecedores' },
  { to: '/reports',    module: 'REPORTS',    icon: BarChart2,        label: 'Relatórios' },
  { to: '/files',      module: 'FILES',      icon: FolderOpen,       label: 'Arquivos' },
];

const adminItems = [
  { to: '/users', module: 'USERS', icon: Settings, label: 'Usuários & Permissões', adminOnly: true },
  { to: '/audit', module: 'AUDIT', icon: Activity,  label: 'Auditoria' },
];

interface SidebarProps { open: boolean; onToggle: () => void; }

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const { hasModule, isAdmin } = useAuth();

  const visibleNavItems   = navItems.filter(i => hasModule(i.module));
  const visibleAdminItems = adminItems.filter(i =>
    (i as any).adminOnly ? isAdmin : hasModule(i.module),
  );

  return (
    <aside
      className={`${open ? 'w-64' : 'w-[68px]'} flex flex-col flex-shrink-0 transition-all duration-300 relative`}
      style={{
        background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
        borderRight: '2px solid #334155',
      }}
    >
      {/* ── Logo / Toggle ── */}
      <div
        className={`flex items-center h-16 px-3 flex-shrink-0 ${open ? 'justify-between' : 'justify-center'}`}
        style={{
          background: '#2563EB',
          borderBottom: '2px solid #0F172A',
          boxShadow: '0 4px 0px 0px #0F172A',
        }}
      >
        {open && (
          <div className="flex items-center gap-2.5 min-w-0 pl-1 animate-fade-in">
            {/* Logo icon — black square with bolt */}
            <div
              className="w-8 h-8 flex items-center justify-center flex-shrink-0"
              style={{ background: '#0F172A', borderRadius: '6px' }}
            >
              <Package className="h-4 w-4 text-[#2563EB]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-white leading-none tracking-tight">OPME System</h1>
              <p className="text-[10px] text-blue-200 mt-0.5 font-semibold uppercase tracking-widest">Gestão Hospitalar</p>
            </div>
          </div>
        )}

        <button
          onClick={onToggle}
          data-tooltip={open ? undefined : 'Expandir menu'}
          className="p-2 text-white transition-all duration-150 flex-shrink-0"
          style={{ border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.8)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${!open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleNavItems.map(({ to, icon: Icon, label }, idx) => (
          <NavLink
            key={to}
            to={to}
            data-tooltip={!open ? label : undefined}
            style={{ animationDelay: `${idx * 30}ms` }}
            className="animate-slide-right block"
          >
            {({ isActive }) => (
              <div
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-[10px]
                  transition-all duration-150 cursor-pointer
                  ${!isActive ? 'text-[#94A3B8]' : 'text-white font-bold'}
                `}
                style={isActive ? {
                  background: '#2563EB',
                  border: '2px solid #60A5FA',
                  boxShadow: '3px 3px 0px 0px #1D4ED8',
                } : {
                  border: '2px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
                    (e.currentTarget as HTMLElement).style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.transform = '';
                    (e.currentTarget as HTMLElement).style.color = '#94A3B8';
                  }
                }}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {open && <span className="text-sm truncate animate-fade-in">{label}</span>}
              </div>
            )}
          </NavLink>
        ))}

        {/* ── Admin section ── */}
        {visibleAdminItems.length > 0 && (
          <div className="mt-4">
            <div style={{ borderTop: '1px solid #334155', marginBottom: '8px', marginTop: '8px' }} />
            {open && (
              <p
                className="px-3 pb-2 animate-fade-in"
                style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase' }}
              >
                Administração
              </p>
            )}
            {visibleAdminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                data-tooltip={!open ? label : undefined}
                className="block"
              >
                {({ isActive }) => (
                  <div
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-[10px]
                      transition-all duration-150 cursor-pointer
                      ${!isActive ? 'text-[#94A3B8]' : 'text-white font-bold'}
                    `}
                    style={isActive ? {
                      background: '#2563EB',
                      border: '2px solid #60A5FA',
                      boxShadow: '3px 3px 0px 0px #1D4ED8',
                    } : {
                      border: '2px solid transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
                        (e.currentTarget as HTMLElement).style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.transform = '';
                        (e.currentTarget as HTMLElement).style.color = '#94A3B8';
                      }
                    }}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {open && <span className="text-sm truncate animate-fade-in">{label}</span>}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
