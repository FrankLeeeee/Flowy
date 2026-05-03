import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { checkAuthStatus, login as apiLogin, logout as apiLogout, setupPassword as apiSetup } from '../api/client';

type AuthStatus = 'loading' | 'setup' | 'unauthenticated' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  setupPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    checkAuthStatus()
      .then(({ authenticated, setupRequired }) => {
        if (setupRequired) setStatus('setup');
        else if (authenticated) setStatus('authenticated');
        else setStatus('unauthenticated');
      })
      .catch(() => setStatus('unauthenticated'));
  }, []);

  const login = async (password: string) => {
    await apiLogin(password);
    setStatus('authenticated');
  };

  const logout = async () => {
    await apiLogout();
    setStatus('unauthenticated');
  };

  const setupPassword = async (password: string) => {
    await apiSetup(password);
    setStatus('authenticated');
  };

  return (
    <AuthContext.Provider value={{ status, login, logout, setupPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
