import { useEffect, useState } from 'react';
import {
  clearPendingSignup,
  getCurrentHostedSurface,
  getDefaultAuthRedirect,
  normalizeHostedRedirectPath,
} from '@/surfaces/app/lib/auth-flow';
import { buildAppHref, buildOpsHref, buildSurfaceHrefForPath } from '@/lib/site-surface';
import { supabase } from '@/lib/supabase';

interface AccessProfileSummary {
  isOperator: boolean;
}

export const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const completeAuthFlow = async () => {
      try {
        const currentUrl = new URL(window.location.href);
        const code = currentUrl.searchParams.get('code');
        const currentSurface = getCurrentHostedSurface();
        const next = normalizeHostedRedirectPath(
          currentSurface,
          currentUrl.searchParams.get('next') ?? getDefaultAuthRedirect(currentSurface),
        );

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        if (!data.session) {
          throw new Error('Authentication session could not be established. Request a new link and try again.');
        }

        if (currentSurface === 'ops') {
          const { data: accessProfile, error: accessError } =
            await supabase.functions.invoke<AccessProfileSummary>('get-access-profile');
          if (accessError || !accessProfile?.isOperator) {
            await supabase.auth.signOut();
            throw new Error('This account does not have operator access. Use an internal operator account for OmniLux Ops.');
          }
        }

        clearPendingSignup();
        window.location.replace(buildSurfaceHrefForPath(next));
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Authentication could not be completed.',
        );
      }
    };

    completeAuthFlow();

    return () => {
      isActive = false;
    };
  }, []);

  if (!error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
          <p className="mt-4 text-sm text-muted">Completing sign-in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Auth link failed</h1>
        <p className="mt-3 text-sm text-muted">{error}</p>
        <a
          href={getCurrentHostedSurface() === 'ops' ? buildOpsHref('/login') : buildAppHref('/login')}
          className="mt-6 inline-block text-sm text-accent hover:underline"
        >
          Back to login
        </a>
      </div>
    </div>
  );
};
