import axios from 'axios';
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

const PRIOR_AUTH_KEY = 'flowy:prior-auth';

function rememberAuthenticated() {
  try { localStorage.setItem(PRIOR_AUTH_KEY, '1'); } catch { /* ignore */ }
}

function forgetAuthenticated() {
  try { localStorage.removeItem(PRIOR_AUTH_KEY); } catch { /* ignore */ }
}

function wasPreviouslyAuthenticated(): boolean {
  try { return localStorage.getItem(PRIOR_AUTH_KEY) === '1'; } catch { return false; }
}

// Distinguishes a network-down failure (server unreachable, offline) from a
// real server response. We only fall back to the offline-trusted path when
// the auth check failed for connectivity reasons.
function isNetworkError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  return !err.response;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    checkAuthStatus()
      .then(({ authenticated, setupRequired }) => {
        if (setupRequired) {
          forgetAuthenticated();
          setStatus('setup');
        } else if (authenticated) {
          rememberAuthenticated();
          setStatus('authenticated');
        } else {
          forgetAuthenticated();
          setStatus('unauthenticated');
        }
      })
      .catch((err) => {
        // Server unreachable: keep the user in the app if they had a prior
        // successful login. Falling through to the login page would be a
        // dead end since logging in also requires the server.
        if (isNetworkError(err) && wasPreviouslyAuthenticated()) {
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      });
  }, []);

  const login = async (password: string) => {
    await apiLogin(password);
    rememberAuthenticated();
    setStatus('authenticated');
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      forgetAuthenticated();
      setStatus('unauthenticated');
    }
  };

  const setupPassword = async (password: string) => {
    await apiSetup(password);
    rememberAuthenticated();
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
