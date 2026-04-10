import { getCurrentHostedSiteSurface, type HostedSiteSurface } from '@/lib/site-surface';
import {
  DEFAULT_OPS_CONSOLE_PATH,
  getLegacyOperatorViewDestination,
  isLegacyOperatorView,
  isOpsConsolePath,
} from '@/surfaces/app/lib/ops-console';

const PENDING_SIGNUP_KEY = 'omnilux:pending-signup';

export interface PendingSignupContext {
  email: string;
  next: string;
}

export const getDefaultAuthRedirect = (surface: HostedSiteSurface = 'app'): string =>
  surface === 'ops' ? DEFAULT_OPS_CONSOLE_PATH : '/dashboard';

export const sanitizeRedirectPath = (
  value: string | null | undefined,
  fallback = getDefaultAuthRedirect(),
): string => {
  if (!value || !value.startsWith('/')) {
    return fallback;
  }

  return value;
};

export const getRedirectPathFromSearch = (
  search: string,
  fallback = getDefaultAuthRedirect(),
): string => sanitizeRedirectPath(new URLSearchParams(search).get('redirect'), fallback);

export const getCurrentHostedSurface = (): HostedSiteSurface => {
  if (typeof window === 'undefined') {
    return 'app';
  }

  return getCurrentHostedSiteSurface(window.location.hostname);
};

export const normalizeHostedRedirectPath = (
  surface: HostedSiteSurface,
  value: string | null | undefined,
): string => {
  const fallback = getDefaultAuthRedirect(surface);
  const safeNext = sanitizeRedirectPath(value, fallback);

  if (surface !== 'ops') {
    return safeNext;
  }

  const parsed = new URL(safeNext, 'https://ops.omnilux.tv');
  const normalizedPathname = parsed.pathname === '/dashboard/' ? '/dashboard' : parsed.pathname;

  if (normalizedPathname.startsWith('/dashboard/operators')) {
    const legacyView = parsed.searchParams.get('view');
    const legacyLookup = parsed.searchParams.get('lookup');
    const legacyDestination =
      legacyView && isLegacyOperatorView(legacyView)
        ? getLegacyOperatorViewDestination(legacyView)
        : '/dashboard/accounts';

    if (legacyDestination === '/dashboard/accounts' && legacyLookup) {
      return `${legacyDestination}?lookup=${encodeURIComponent(legacyLookup)}`;
    }

    return legacyDestination;
  }

  if (
    isOpsConsolePath(normalizedPathname) ||
    normalizedPathname.startsWith('/dashboard/account') ||
    normalizedPathname.startsWith('/forgot-password') ||
    normalizedPathname.startsWith('/reset-password') ||
    normalizedPathname.startsWith('/auth/callback') ||
    normalizedPathname.startsWith('/login')
  ) {
    if (normalizedPathname !== parsed.pathname) {
      const suffix = `${parsed.search}${parsed.hash}`;
      return `${normalizedPathname}${suffix}`;
    }

    return safeNext;
  }

  return fallback;
};

export const buildAuthCallbackUrl = (next = getDefaultAuthRedirect(getCurrentHostedSurface())): string => {
  const safeNext = sanitizeRedirectPath(next);

  if (typeof window === 'undefined') {
    return `/auth/callback?next=${encodeURIComponent(safeNext)}`;
  }

  const url = new URL('/auth/callback', window.location.origin);
  url.searchParams.set('next', safeNext);
  return url.toString();
};

export const setPendingSignup = (pendingSignup: PendingSignupContext) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    PENDING_SIGNUP_KEY,
    JSON.stringify({
      email: pendingSignup.email,
      next: sanitizeRedirectPath(pendingSignup.next),
    }),
  );
};

export const getPendingSignup = (): PendingSignupContext | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(PENDING_SIGNUP_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<PendingSignupContext>;
    if (!parsedValue.email) {
      return null;
    }

    return {
      email: parsedValue.email,
      next: sanitizeRedirectPath(parsedValue.next),
    };
  } catch {
    return null;
  }
};

export const clearPendingSignup = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
};
