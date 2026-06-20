import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Mail } from 'lucide-react';
import {
  buildAuthCallbackUrl,
  clearPendingSignup,
  getPendingSignup,
} from '@/surfaces/app/lib/auth-flow';
import { buildSurfaceHrefForPath } from '@/lib/site-surface';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const { provider, session, signIn } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const pendingSignup = getPendingSignup();

  useEffect(() => {
    if (provider === 'workos') {
      if (session) {
        clearPendingSignup();
        navigate({ to: '/dashboard' });
      }

      return undefined;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        clearPendingSignup();

        if (pendingSignup?.next && pendingSignup.next !== '/dashboard') {
          window.location.assign(buildSurfaceHrefForPath(pendingSignup.next));
          return;
        }

        navigate({ to: '/dashboard' });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, pendingSignup?.next, provider, session]);

  const handleResend = async () => {
    setResending(true);
    if (provider === 'workos') {
      await signIn({
        returnTo: pendingSignup?.next ?? '/dashboard',
        loginHint: pendingSignup?.email,
      });
      return;
    }

    const { data } = await supabase.auth.getSession();
    const email = pendingSignup?.email ?? data.session?.user?.email;
    if (email) {
      await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: buildAuthCallbackUrl(pendingSignup?.next),
        },
      });
    }
    setResending(false);
    setResent(true);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <Mail className="h-8 w-8 text-accent" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">Check your email</h1>
        <p className="mt-3 text-sm text-muted">
          {provider === 'workos'
            ? 'Email verification is handled by the secure OmniLux sign-in flow.'
            : `We sent a verification link${pendingSignup?.email ? ` to ${pendingSignup.email}` : ''}. Click it to activate your account and get started.`}
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resent}
          className="mt-6 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50"
        >
          {provider === 'workos'
            ? resending ? 'Continuing...' : 'Continue'
            : resent ? 'Email sent!' : resending ? 'Sending...' : 'Resend verification email'}
        </button>
      </div>
    </div>
  );
};
