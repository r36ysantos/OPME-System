import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCog, Building2, Package,
  ClipboardList, GitBranch, Settings, BarChart2, ChevronLeft, Activity, FolderOpen,
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
  { to: '/users',  module: 'USERS', icon: Settings,  label: 'Usuários & Permissões', adminOnly: true },
  { to: '/audit',  module: 'AUDIT', icon: Activity,  label: 'Auditoria' },
];

interface SidebarProps { open: boolean; onToggle: () => void; }

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const { hasModule, isAdmin } = useAuth();

  const visibleNavItems   = navItems.filter((item) => hasModule(item.module));
  const visibleAdminItems = adminItems.filter((item) =>
    (item as any).adminOnly ? isAdmin : hasModule(item.module),
  );

  return (
    <aside className={`${open ? 'w-64' : 'w-16'} bg-primary-900 text-white flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}>
      <div className="flex items-center justify-between p-4 border-b border-primary-700">
        {open && (<div><h1 className="text-lg font-bold text-white">OPME System</h1><p className="text-xs text-primary-300">Gestão Hospitalar</p></div>)}
        <button onClick={onToggle} className="p-1 rounded-lg hover:bg-primary-700 transition-colors ml-auto">
          <ChevronLeft className={`h-5 w-5 transition-transform ${!open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {visibleNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-primary-200 hover:bg-primary-700 hover:text-white'}`}
              title={!open ? label : undefined}>
              <Icon className="h-5 w-5 flex-shrink-0" />
              {open && <span className="text-sm font-medium">{label}</span>}
            </NavLink>
          ))}
          {visibleAdminItems.length > 0 && (
            <>
              {open && <p className="px-3 pt-4 pb-1 text-xs font-semibold text-primary-400 uppercase tracking-wider">Administração</p>}
              {visibleAdminItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-primary-200 hover:bg-primary-700 hover:text-white'}`}
                  title={!open ? label : undefined}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {open && <span className="text-sm font-medium">{label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </div>
      </nav>
    </aside>
  );
}
