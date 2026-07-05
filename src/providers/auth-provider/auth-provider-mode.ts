export type AuthProviderMode = "workos" | "legacy-supabase" | "unconfigured";

export const parseEnvFlag = (value: string | undefined): boolean => {
  const normalizedValue = value?.trim().toLowerCase() ?? "";
  return normalizedValue === "true" || normalizedValue === "1";
};

export const isLegacySupabaseAuthEnabled = ({
  isDev,
  viteEnableLegacySupabaseAuth,
}: {
  isDev: boolean;
  viteEnableLegacySupabaseAuth?: string;
}): boolean => isDev && parseEnvFlag(viteEnableLegacySupabaseAuth);

export const getAuthProviderMode = ({
  legacySupabaseAuthEnabled,
  workosClientId,
}: {
  legacySupabaseAuthEnabled: boolean;
  workosClientId: string;
}): AuthProviderMode => {
  if (workosClientId.trim().length > 0) {
    return "workos";
  }

  if (legacySupabaseAuthEnabled) {
    return "legacy-supabase";
  }

  return "unconfigured";
};
