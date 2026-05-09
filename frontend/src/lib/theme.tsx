import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeCtx {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'system',
  resolved: 'light',
  setTheme: () => {},
});

let themeTimer: ReturnType<typeof setTimeout> | undefined;

function applyThemeClass(dark: boolean) {
  const root = document.documentElement;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.toggle('dark', dark);
    return;
  }

  clearTimeout(themeTimer);
  root.classList.add('theme-transition');
  requestAnimationFrame(() => {
    root.classList.toggle('dark', dark);
  });
  themeTimer = setTimeout(() => root.classList.remove('theme-transition'), 450);
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('flowy-theme') as Theme) ?? 'system';
  });

  const resolved = resolve(theme);
  const mounted = useRef(false);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('flowy-theme', t);
  };

  useEffect(() => {
    if (!mounted.current) {
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      mounted.current = true;
      return;
    }
    applyThemeClass(resolved === 'dark');
  }, [resolved]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeClass(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
