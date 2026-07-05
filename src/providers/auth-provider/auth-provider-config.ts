import {
  getAuthProviderMode,
  isLegacySupabaseAuthEnabled,
  parseEnvFlag,
} from "./auth-provider-mode";

export const workosClientId =
  (import.meta.env.VITE_WORKOS_CLIENT_ID as string | undefined)?.trim() ?? "";
export const workosApiHostname =
  (import.meta.env.VITE_WORKOS_API_HOSTNAME as string | undefined)?.trim() ??
  "";
export const workosDevMode = parseEnvFlag(
  import.meta.env.VITE_WORKOS_DEV_MODE as string | undefined
);
export const legacySupabaseAuthEnabled = isLegacySupabaseAuthEnabled({
  isDev: import.meta.env.DEV,
  viteEnableLegacySupabaseAuth: import.meta.env
    .VITE_ENABLE_LEGACY_SUPABASE_AUTH as string | undefined,
});
export const authProviderMode = getAuthProviderMode({
  workosClientId,
  legacySupabaseAuthEnabled,
});
export const hasWorkosConfig = authProviderMode === "workos";

export const getReturnTo = () => {
  if (typeof window === "undefined") {
    return "/dashboard";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};
