import { AuthContext, type AuthContextValue } from "../auth-context";

export const missingWorkosConfigTitle =
  "OmniLux Cloud authentication is not configured";
export const missingWorkosConfigMessage =
  "VITE_WORKOS_CLIENT_ID is required for OmniLux Cloud authentication. Legacy Supabase auth is disabled unless explicitly enabled for local development with VITE_ENABLE_LEGACY_SUPABASE_AUTH=true.";

const unavailableAuthAction = async () => {
  throw new Error(missingWorkosConfigMessage);
};

const unconfiguredAuthContext: AuthContextValue = {
  user: null,
  session: null,
  loading: false,
  provider: "unconfigured",
  getAccessToken: async () => null,
  signIn: unavailableAuthAction,
  signUp: unavailableAuthAction,
  signOut: async () => {},
};

export const UnconfiguredAuthBridge = () => (
  <AuthContext.Provider value={unconfiguredAuthContext}>
    <div
      className="flex min-h-[70vh] items-center justify-center px-4 py-16"
      role="alert"
    >
      <div className="w-full max-w-xl rounded-2xl border border-danger/30 bg-danger/10 p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-danger">
          Configuration error
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold text-foreground">
          {missingWorkosConfigTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {missingWorkosConfigMessage}
        </p>
      </div>
    </div>
  </AuthContext.Provider>
);
