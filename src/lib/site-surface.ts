export type SiteSurface = 'marketing' | 'app';

const APP_SUBDOMAIN = 'app';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const DEFAULT_MARKETING_SITE_URL = 'https://omnilux.tv';
const DEFAULT_APP_SITE_URL = 'https://app.omnilux.tv';

const normalizeOrigin = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;

  try {
    return new URL(value).origin;
  } catch {
    return fallback;
  }
};

export const MARKETING_SITE_ORIGIN = normalizeOrigin(
  import.meta.env.VITE_MARKETING_SITE_URL,
  DEFAULT_MARKETING_SITE_URL,
);
export const APP_SITE_ORIGIN = normalizeOrigin(import.meta.env.VITE_APP_SITE_URL, DEFAULT_APP_SITE_URL);

const stripHashAndSearch = (path: string) => path.split('#', 1)[0]?.split('?', 1)[0] ?? path;
const splitRelativeUrl = (path: string) => {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, 'https://surface.local');
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };
};

const isIpAddress = (hostname: string) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');

export const isLocalSurfaceMode = (hostname: string) =>
  LOCAL_HOSTNAMES.has(hostname) || isIpAddress(hostname);

export const getCurrentSiteSurface = (hostname: string): SiteSurface =>
  hostname.startsWith(`${APP_SUBDOMAIN}.`) ? 'app' : 'marketing';

export const getSiteSurfaceForPath = (path: string): SiteSurface => {
  const pathname = stripHashAndSearch(path);

  if (
    pathname === '/' ||
    pathname === '/about' ||
    pathname === '/blog' ||
    pathname === '/changelog' ||
    pathname === '/contact' ||
    pathname === '/docs' ||
    pathname === '/download' ||
    pathname === '/features' ||
    pathname === '/privacy' ||
    pathname === '/pricing' ||
    pathname === '/terms' ||
    pathname === '/investors' ||
    pathname === '/marketplace' ||
    pathname.startsWith('/marketplace/')
  ) {
    return 'marketing';
  }

  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/verify-email' ||
    pathname === '/auth/callback' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/invite/')
  ) {
    return 'app';
  }

  return 'marketing';
};

const getBaseHostname = (hostname: string) =>
  hostname.startsWith(`${APP_SUBDOMAIN}.`) ? hostname.slice(APP_SUBDOMAIN.length + 1) : hostname;

const isPrerenderSnapshot = () => {
  if (typeof window === 'undefined') return false;

  const prerenderWindow = window as Window & { snapSaveState?: unknown };
  return typeof prerenderWindow.snapSaveState !== 'undefined';
};

export const buildSurfaceHref = (
  surface: SiteSurface,
  path: string,
  locationLike: Pick<Location, 'hostname' | 'origin' | 'protocol' | 'port'> = window.location,
) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const parts = splitRelativeUrl(normalizedPath);

  if (isLocalSurfaceMode(locationLike.hostname)) {
    if (import.meta.env.PROD || isPrerenderSnapshot()) {
      const base = surface === 'app' ? APP_SITE_ORIGIN : MARKETING_SITE_ORIGIN;
      return new URL(normalizedPath, base).toString();
    }

    return `${locationLike.origin}${normalizedPath}`;
  }

  const url = new URL(locationLike.origin);
  const baseHostname = getBaseHostname(locationLike.hostname);
  url.hostname = surface === 'app' ? `${APP_SUBDOMAIN}.${baseHostname}` : baseHostname;

  if (!locationLike.port) {
    url.port = '';
  }

  url.pathname = parts.pathname;
  url.search = parts.search;
  url.hash = parts.hash;
  return url.toString();
};

export const buildAppHref = (
  path: string,
  locationLike?: Pick<Location, 'hostname' | 'origin' | 'protocol' | 'port'>,
) => buildSurfaceHref('app', path, locationLike);

export const buildMarketingHref = (
  path: string,
  locationLike?: Pick<Location, 'hostname' | 'origin' | 'protocol' | 'port'>,
) => buildSurfaceHref('marketing', path, locationLike);

export const buildSurfaceHrefForPath = (
  path: string,
  locationLike: Pick<Location, 'hostname' | 'origin' | 'protocol' | 'port'> = window.location,
) => buildSurfaceHref(getSiteSurfaceForPath(path), path, locationLike);
