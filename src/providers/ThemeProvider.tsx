import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  applyThemePreference,
  readThemePreference,
  resolveThemePreference,
  setThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemePreference>(() => readThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveThemePreference(readThemePreference()),
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const initialTheme = readThemePreference();
    setThemeState(initialTheme);
    setResolvedTheme(applyThemePreference(initialTheme));

    const mediaQuery = window.matchMedia(MEDIA_QUERY);
    const handleChange = () => {
      const currentTheme = readThemePreference();
      if (currentTheme === 'system') {
        setResolvedTheme(applyThemePreference(currentTheme));
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = (nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    setResolvedTheme(setThemePreference(nextTheme));
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [resolvedTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
