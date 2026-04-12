export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'omnilux-theme-preference';
const THEME_COOKIE_KEY = 'omnilux-theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#f4f7ff',
  dark: '#0b1020',
};

const isThemePreference = (value: string | null | undefined): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

const getCookieDomain = (hostname: string) =>
  hostname === 'omnilux.tv' || hostname.endsWith('.omnilux.tv') ? '; domain=.omnilux.tv' : '';

const readCookieThemePreference = (): ThemePreference | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE_KEY}=([^;]+)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isThemePreference(value) ? value : null;
};

export const getSystemTheme = (): ResolvedTheme =>
  typeof window !== 'undefined' && window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';

export const resolveThemePreference = (preference: ThemePreference): ResolvedTheme =>
  preference === 'system' ? getSystemTheme() : preference;

export const readThemePreference = (): ThemePreference => {
  if (typeof window !== 'undefined') {
    const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(storedValue)) {
      return storedValue;
    }
  }

  return readCookieThemePreference() ?? 'system';
};

const writeThemePreference = (preference: ThemePreference) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  }

  if (typeof document !== 'undefined') {
    const domain = typeof window !== 'undefined' ? getCookieDomain(window.location.hostname) : '';
    document.cookie =
      `${THEME_COOKIE_KEY}=${encodeURIComponent(preference)}; path=/; max-age=31536000; samesite=lax${domain}`;
  }
};

const updateThemeColorMeta = (resolvedTheme: ResolvedTheme) => {
  if (typeof document === 'undefined') {
    return;
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', THEME_COLORS[resolvedTheme]);
  }
};

export const applyThemePreference = (preference: ThemePreference): ResolvedTheme => {
  const resolvedTheme = resolveThemePreference(preference);

  if (typeof document === 'undefined') {
    return resolvedTheme;
  }

  const root = document.documentElement;
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;
  updateThemeColorMeta(resolvedTheme);

  return resolvedTheme;
};

export const setThemePreference = (preference: ThemePreference): ResolvedTheme => {
  writeThemePreference(preference);
  return applyThemePreference(preference);
};

export const getThemeInitScript = () => `
(() => {
  const STORAGE_KEY = ${JSON.stringify(THEME_STORAGE_KEY)};
  const COOKIE_KEY = ${JSON.stringify(THEME_COOKIE_KEY)};
  const COLORS = ${JSON.stringify(THEME_COLORS)};
  const MEDIA_QUERY = ${JSON.stringify(MEDIA_QUERY)};
  const isThemePreference = (value) => value === 'system' || value === 'light' || value === 'dark';
  const getCookieDomain = (hostname) =>
    hostname === 'omnilux.tv' || hostname.endsWith('.omnilux.tv') ? '; domain=.omnilux.tv' : '';
  const readCookiePreference = () => {
    const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_KEY + '=([^;]+)'));
    const value = match ? decodeURIComponent(match[1]) : null;
    return isThemePreference(value) ? value : null;
  };
  const resolveTheme = (preference) =>
    preference === 'system' && window.matchMedia(MEDIA_QUERY).matches ? 'dark' : preference === 'system' ? 'light' : preference;
  const applyTheme = (preference) => {
    const resolvedTheme = resolveTheme(preference);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolvedTheme;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', COLORS[resolvedTheme]);
    }
    document.cookie =
      COOKIE_KEY + '=' + encodeURIComponent(preference) + '; path=/; max-age=31536000; samesite=lax' + getCookieDomain(window.location.hostname);
  };
  let preference = 'system';
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    preference = isThemePreference(storedValue) ? storedValue : readCookiePreference() || 'system';
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    preference = readCookiePreference() || 'system';
  }
  applyTheme(preference);
})();
`.trim();
