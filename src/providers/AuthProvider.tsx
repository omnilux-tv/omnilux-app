import { AuthKitProvider, useAuth as useWorkosAuth } from '@workos-inc/authkit-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { buildAppHref } from '@/lib/site-surface';
import { setCloudAccessTokenProvider } from '@/lib/supabase';
import { AuthContext, useAuth, type AuthContextValue, type CloudSession, type CloudUser } from './auth-context';
import { resolveWorkosAccessToken } from './workos-token';

export { useAuth };

const workosClientId = (import.meta.env.VITE_WORKOS_CLIENT_ID as string | undefined)?.trim() ?? '';
const workosApiHostname = (import.meta.env.VITE_WORKOS_API_HOSTNAME as string | undefined)?.trim() ?? '';
const workosDevMode =
  ((import.meta.env.VITE_WORKOS_DEV_MODE as string | undefined)?.trim().toLowerCase() ?? '') === 'true';

const hasWorkosConfig = workosClientId.length > 0;

const getReturnTo = () => {
  if (typeof window === 'undefined') {
    return '/dashboard';
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const getDisplayName = (user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.email || 'OmniLux user';
};

const toCloudUser = (user: NonNullable<ReturnType<typeof useWorkosAuth>['user']>): CloudUser => {
  const displayName = getDisplayName(user);

  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      display_name: displayName,
      full_name: displayName,
      avatar_url: user.profilePictureUrl,
      picture: user.profilePictureUrl,
      workos_user_id: user.id,
    },
  };
};

const WorkosAuthBridge = ({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) => {
  const {
    isLoading,
    user: workosUser,
    getAccessToken: getWorkosAccessToken,
    signIn: workosSignIn,
    signUp: workosSignUp,
    signOut: workosSignOut,
  } = useWorkosAuth();
  const [session, setSession] = useState<CloudSession | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const user = session?.user ?? null;

  const getAccessToken = useCallback(async () => {
    if (!workosUser) {
      return null;
    }

    return resolveWorkosAccessToken(getWorkosAccessToken);
  }, [getWorkosAccessToken, workosUser]);

  useEffect(() => {
    if (!enabled || !workosUser) {
      setCloudAccessTokenProvider(null);
      setSession(null);
      setTokenLoading(false);
      return;
    }

    setCloudAccessTokenProvider(getAccessToken);

    let active = true;
    setTokenLoading(true);
    void getAccessToken()
      .then((accessToken) => {
        if (!active) {
          return;
        }

        if (!accessToken) {
          setSession(null);
          setCloudAccessTokenProvider(null);
          return;
        }

        setSession({
          access_token: accessToken,
          provider: 'workos',
          user: {
            ...toCloudUser(workosUser),
            last_sign_in_at: workosUser.lastSignInAt,
          },
        });
      })
      .finally(() => {
        if (active) {
          setTokenLoading(false);
        }
      });

    return () => {
      active = false;
      setCloudAccessTokenProvider(null);
    };
  }, [enabled, getAccessToken, workosUser]);

  const signIn = useCallback<AuthContextValue['signIn']>(async (options) => {
    await workosSignIn({
      state: { returnTo: options?.returnTo ?? getReturnTo() },
      loginHint: options?.loginHint,
    });
  }, [workosSignIn]);

  const signUp = useCallback<AuthContextValue['signUp']>(async (options) => {
    await workosSignUp({
      state: { returnTo: options?.returnTo ?? getReturnTo() },
      loginHint: options?.loginHint,
    });
  }, [workosSignUp]);

  const signOut = useCallback(async () => {
    setCloudAccessTokenProvider(null);
    setSession(null);
    await workosSignOut({ returnTo: buildAppHref('/login') });
  }, [workosSignOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: enabled ? isLoading || tokenLoading : false,
        provider: 'workos',
        getAccessToken,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const LegacySupabaseAuthBridge = ({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) => {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [session, setSession] = useState<CloudSession | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setUser(null);
      setSession(null);
      setCloudAccessTokenProvider(null);
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;

    void import('@/lib/supabase').then(({ supabase }) => {
      if (!active) {
        return;
      }

      void supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (!active) {
          return;
        }

        setSession(s
          ? {
            access_token: s.access_token,
            provider: 'supabase_auth',
            user: {
              id: s.user.id,
              email: s.user.email,
              user_metadata: s.user.user_metadata,
              last_sign_in_at: s.user.last_sign_in_at,
            },
          }
          : null);
        setUser(s
          ? {
            id: s.user.id,
            email: s.user.email,
            user_metadata: s.user.user_metadata,
          }
          : null);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
        if (!active) {
          return;
        }

        setSession(s
          ? {
            access_token: s.access_token,
            provider: 'supabase_auth',
            user: {
              id: s.user.id,
              email: s.user.email,
              user_metadata: s.user.user_metadata,
              last_sign_in_at: s.user.last_sign_in_at,
            },
          }
          : null);
        setUser(s
          ? {
            id: s.user.id,
            email: s.user.email,
            user_metadata: s.user.user_metadata,
          }
          : null);
        setLoading(false);
      });

      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      active = false;
      unsubscribe?.();
      setCloudAccessTokenProvider(null);
    };
  }, [enabled]);

  const getAccessToken = useCallback(async () => session?.access_token ?? null, [session?.access_token]);

  const signIn = useCallback<AuthContextValue['signIn']>(async (options) => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: buildAppHref(`/auth/callback?next=${encodeURIComponent(options?.returnTo ?? '/dashboard')}`) },
    });
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async (options) => {
    await signIn(options);
  }, [signIn]);

  const signOut = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.auth.signOut();
    setCloudAccessTokenProvider(null);
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        provider: 'supabase_auth',
        getAccessToken,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider = ({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) => {
  if (!hasWorkosConfig) {
    return <LegacySupabaseAuthBridge enabled={enabled}>{children}</LegacySupabaseAuthBridge>;
  }

  return (
    <AuthKitProvider
      clientId={workosClientId}
      apiHostname={workosApiHostname || undefined}
      devMode={workosDevMode}
      redirectUri={buildAppHref('/auth/callback')}
      onRedirectCallback={({ state }) => {
        const returnTo = typeof state?.returnTo === 'string' ? state.returnTo : '/dashboard';
        window.location.replace(returnTo);
      }}
    >
      <WorkosAuthBridge enabled={enabled}>{children}</WorkosAuthBridge>
    </AuthKitProvider>
  );
};
