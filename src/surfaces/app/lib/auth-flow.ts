const DEFAULT_AUTH_REDIRECT = '/dashboard';
const PENDING_SIGNUP_KEY = 'omnilux:pending-signup';

export interface PendingSignupContext {
  email: string;
  next: string;
}

export const sanitizeRedirectPath = (
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
) => {
  if (!value || !value.startsWith('/')) {
    return fallback;
  }

  return value;
};

export const getRedirectPathFromSearch = (
  search: string,
  fallback = DEFAULT_AUTH_REDIRECT,
) => sanitizeRedirectPath(new URLSearchParams(search).get('redirect'), fallback);

export const buildAuthCallbackUrl = (next = DEFAULT_AUTH_REDIRECT) => {
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
