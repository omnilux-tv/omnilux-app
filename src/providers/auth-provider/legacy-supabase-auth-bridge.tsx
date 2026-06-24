import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { buildAppHref } from '@/lib/site-surface';
import { setCloudAccessTokenProvider } from '@/lib/supabase';
import { AuthContext, type AuthContextValue, type CloudSession, type CloudUser } from '../auth-context';

export const LegacySupabaseAuthBridge = ({ children, enabled }: { children: ReactNode; enabled: boolean }) => {
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
      if (!active) return;

      void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
        if (!active) return;
        applySession(nextSession);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        applySession(nextSession);
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

  const applySession = (nextSession: Awaited<ReturnType<typeof import('@/lib/supabase')['supabase']['auth']['getSession']>>['data']['session']) => {
    setSession(nextSession
      ? {
          access_token: nextSession.access_token,
          provider: 'supabase_auth',
          user: {
            id: nextSession.user.id,
            email: nextSession.user.email,
            user_metadata: nextSession.user.user_metadata,
            last_sign_in_at: nextSession.user.last_sign_in_at,
          },
        }
      : null);
    setUser(nextSession
      ? {
          id: nextSession.user.id,
          email: nextSession.user.email,
          user_metadata: nextSession.user.user_metadata,
        }
      : null);
  };

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
    <AuthContext.Provider value={{ user, session, loading, provider: 'supabase_auth', getAccessToken, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
