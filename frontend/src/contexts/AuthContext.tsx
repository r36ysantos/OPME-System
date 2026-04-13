import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Permission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

type ModuleAction = 'view' | 'create' | 'edit' | 'delete';

const actionField: Record<ModuleAction, keyof Permission> = {
  view:   'canView',
  create: 'canCreate',
  edit:   'canEdit',
  delete: 'canDelete',
};

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: Permission[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  hasRole: (...roles: string[]) => boolean;
  /** Returns true if the user has access to a module with the given action.
   *  Admins always return true. Other users need an explicit permission record. */
  hasModule: (module: string, action?: ModuleAction) => boolean;
  setPermissions: (perms: Permission[]) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]             = useState<User | null>(null);
  const [token, setToken]           = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading]   = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('sgp_token');
    const savedUser  = localStorage.getItem('sgp_user');
    const savedPerms = localStorage.getItem('sgp_permissions');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setPermissions(savedPerms ? JSON.parse(savedPerms) : []);
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    setPermissions(data.permissions ?? []);

    localStorage.setItem('sgp_token',       data.token);
    localStorage.setItem('sgp_user',        JSON.stringify(data.user));
    localStorage.setItem('sgp_permissions', JSON.stringify(data.permissions ?? []));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    localStorage.removeItem('sgp_token');
    localStorage.removeItem('sgp_user');
    localStorage.removeItem('sgp_permissions');
    delete api.defaults.headers.common['Authorization'];
  };

  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role) || user.role === 'ADMIN';
  };

  const hasModule = (module: string, action: ModuleAction = 'view'): boolean => {
    if (!user) return false;
    // Admin bypasses all checks
    if (user.role === 'ADMIN') return true;
    const perm = permissions.find((p) => p.module === module);
    if (!perm) return false;
    return perm[actionField[action]] === true;
  };

  return (
    <AuthContext.Provider value={{
      user, token, permissions,
      login, logout, isLoading,
      isAdmin: user?.role === 'ADMIN',
      isCoordinator: user?.role === 'COORDENADOR_OPME' || user?.role === 'ADMIN',
      hasRole,
      hasModule,
      setPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
