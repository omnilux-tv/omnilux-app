export type SiteSurface = 'marketing' | 'app' | 'ops';
export type HostedSiteSurface = Exclude<SiteSurface, 'marketing'>;

const APP_SUBDOMAIN = 'app';
const OPS_SUBDOMAIN = 'ops';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const DEFAULT_MARKETING_SITE_URL = 'https://omnilux.tv';
const DEFAULT_APP_SITE_URL = 'https://app.omnilux.tv';
const DEFAULT_OPS_SITE_URL = 'https://ops.omnilux.tv';
const DEFAULT_DOCS_SITE_URL = 'https://docs.omnilux.tv';
const HOSTED_SURFACE_SUBDOMAINS: Record<HostedSiteSurface, string> = {
  app: APP_SUBDOMAIN,
  ops: OPS_SUBDOMAIN,
};

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
export const OPS_SITE_ORIGIN = normalizeOrigin(import.meta.env.VITE_OPS_SITE_URL, DEFAULT_OPS_SITE_URL);
export const DOCS_SITE_ORIGIN = normalizeOrigin(import.meta.env.VITE_DOCS_SITE_URL, DEFAULT_DOCS_SITE_URL);

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

export const getCurrentSiteSurface = (hostname: string): SiteSurface => {
  if (isLocalSurfaceMode(hostname)) {
    return 'app';
  }

  if (hostname.startsWith(`${OPS_SUBDOMAIN}.`)) {
    return 'ops';
  }

  if (hostname.startsWith(`${APP_SUBDOMAIN}.`)) {
    return 'app';
  }

  return 'marketing';
};

export const getCurrentHostedSiteSurface = (hostname: string): HostedSiteSurface =>
  getCurrentSiteSurface(hostname) === 'ops' ? 'ops' : 'app';

export const getSiteSurfaceForPath = (
  path: string,
  currentSurface: SiteSurface =
    typeof window === 'undefined' ? 'app' : getCurrentSiteSurface(window.location.hostname),
): SiteSurface => {
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
    return currentSurface === 'ops' ? 'ops' : 'app';
  }

  return currentSurface === 'ops' ? 'ops' : 'marketing';
};

const getBaseHostname = (hostname: string) => {
  for (const subdomain of Object.values(HOSTED_SURFACE_SUBDOMAINS)) {
    if (hostname.startsWith(`${subdomain}.`)) {
      return hostname.slice(subdomain.length + 1);
    }
  }

  return hostname;
};

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
      const base =
        surface === 'app'
          ? APP_SITE_ORIGIN
          : surface === 'ops'
            ? OPS_SITE_ORIGIN
            : MARKETING_SITE_ORIGIN;
      return new URL(normalizedPath, base).toString();
    }

    return `${locationLike.origin}${normalizedPath}`;
  }

  const url = new URL(locationLike.origin);
  const baseHostname = getBaseHostname(locationLike.hostname);
  url.hostname = surface === 'marketing' ? baseHostname : `${HOSTED_SURFACE_SUBDOMAINS[surface]}.${baseHostname}`;

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

export const buildOpsHref = (
  path: string,
  locationLike?: Pick<Location, 'hostname' | 'origin' | 'protocol' | 'port'>,
) => buildSurfaceHref('ops', path, locationLike);

export const buildMarketingHref = (
  path: string,
  locationLike?: Pick<Location, 'hostname' | 'origin' | 'protocol' | 'port'>,
) => buildSurfaceHref('marketing', path, locationLike);

export const buildDocsHref = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, DOCS_SITE_ORIGIN).toString();
};

export const buildSurfaceHrefForPath = (
  path: string,
  locationLike: Pick<Location, 'hostname' | 'origin' | 'protocol' | 'port'> = window.location,
) => buildSurfaceHref(getSiteSurfaceForPath(path, getCurrentSiteSurface(locationLike.hostname)), path, locationLike);
