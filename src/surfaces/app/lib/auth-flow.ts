import type { HostedSiteSurface } from "@/lib/site-surface";

const PENDING_SIGNUP_KEY = "omnilux:pending-signup";
const SUPPORTED_OAUTH_PROVIDERS = ["google", "apple", "github"] as const;

export type OAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number];

export const getConfiguredOAuthProviders = (): OAuthProvider[] => {
  const configuredProviders = import.meta.env.VITE_OAUTH_PROVIDERS;
  if (!configuredProviders) {
    return [];
  }

  const supportedProviders = new Set<string>(SUPPORTED_OAUTH_PROVIDERS);
  return configuredProviders
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider): provider is OAuthProvider =>
      supportedProviders.has(provider)
    );
};

export interface PendingSignupContext {
  email: string;
  next: string;
}

export const getDefaultAuthRedirect = (
  _surface: HostedSiteSurface = "app"
): string => "/dashboard";

export const sanitizeRedirectPath = (
  value: string | null | undefined,
  fallback = getDefaultAuthRedirect()
): string => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
};

export const getRedirectPathFromSearch = (
  search: string,
  fallback = getDefaultAuthRedirect()
): string =>
  sanitizeRedirectPath(new URLSearchParams(search).get("redirect"), fallback);

export interface AuthEntryContext {
  eyebrow: string;
  title: string;
  description: string;
}

export const getAuthEntryContext = (
  redirectPath: string,
  mode: "sign-in" | "sign-up"
): AuthEntryContext => {
  if (redirectPath.startsWith("/invite/")) {
    return {
      eyebrow: "Server invite",
      title:
        mode === "sign-up"
          ? "Create your account to accept this invite"
          : "Sign in to accept this invite",
      description:
        "AuthKit will return you to the OmniLux server invite after authentication so it can be accepted automatically.",
    };
  }

  if (redirectPath.startsWith("/dashboard/claim")) {
    return {
      eyebrow: "Server claim",
      title:
        mode === "sign-up"
          ? "Create your account to attach this server"
          : "Sign in to attach this server",
      description:
        "AuthKit will return you to the claim code flow after authentication so your self-hosted server can be linked to this account.",
    };
  }

  return {
    eyebrow: "OmniLux Cloud",
    title:
      mode === "sign-up"
        ? "Create your OmniLux account"
        : "Sign in to OmniLux Cloud",
    description:
      mode === "sign-up"
        ? "Continue through secure OmniLux Cloud account creation."
        : "Continue through secure OmniLux Cloud sign-in.",
  };
};

export const getCurrentHostedSurface = (): HostedSiteSurface => "app";

export const normalizeHostedRedirectPath = (
  _surface: HostedSiteSurface,
  value: string | null | undefined
): string => sanitizeRedirectPath(value, getDefaultAuthRedirect());

export const buildAuthCallbackUrl = (
  next = getDefaultAuthRedirect()
): string => {
  const safeNext = sanitizeRedirectPath(next);

  if (typeof window === "undefined") {
    return `/auth/callback?next=${encodeURIComponent(safeNext)}`;
  }

  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", safeNext);
  return url.toString();
};

export const getWorkosRedirectCallbackHref = (
  state: { returnTo?: unknown } | null | undefined,
  locationLike?: Pick<Location, "hostname" | "origin" | "protocol" | "port">
): string => {
  const returnTo =
    typeof state?.returnTo === "string"
      ? state.returnTo
      : getDefaultAuthRedirect("app");
  const origin =
    locationLike?.origin ??
    (typeof window === "undefined"
      ? "https://app.omnilux.tv"
      : window.location.origin);
  return new URL(
    normalizeHostedRedirectPath("app", returnTo),
    origin
  ).toString();
};

export const setPendingSignup = (pendingSignup: PendingSignupContext) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    PENDING_SIGNUP_KEY,
    JSON.stringify({
      email: pendingSignup.email,
      next: sanitizeRedirectPath(pendingSignup.next),
    })
  );
};

export const getPendingSignup = (): PendingSignupContext | null => {
  if (typeof window === "undefined") {
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
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
};
