import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthContext, useAuth } from './auth-context';

export { useAuth };

export const AuthProvider = ({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setUser(null);
      setSession(null);
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

        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
        if (!active) {
          return;
        }

        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      });

      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [enabled]);

  const signOut = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
