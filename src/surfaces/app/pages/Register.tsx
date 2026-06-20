import { useEffect, useState } from 'react';
import { getRedirectPathFromSearch } from '@/surfaces/app/lib/auth-flow';
import { buildAppHref } from '@/lib/site-surface';
import { useAuth } from '@/providers/AuthProvider';

export const Register = () => {
  const { signUp, provider } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const redirectPath = typeof window === 'undefined'
    ? '/dashboard'
    : getRedirectPathFromSearch(window.location.search);

  useEffect(() => {
    if (provider !== 'workos') {
      return;
    }

    void signUp({ returnTo: redirectPath }).catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : 'Account creation could not be started.');
    });
  }, [provider, redirectPath, signUp]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Create your OmniLux account</h1>
        <p className="mt-3 text-sm text-muted">
          {provider === 'workos'
            ? 'Redirecting to secure OmniLux Cloud account creation.'
            : 'Continuing through the account creation flow configured for this environment.'}
        </p>

        {error ? (
          <div className="mt-6 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>
        ) : (
          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
        )}

        {provider !== 'workos' ? (
          <a href={buildAppHref('/login')} className="mt-6 inline-flex min-h-11 items-center text-sm text-accent hover:underline">
            Back to login
          </a>
        ) : null}
      </div>
    </div>
  );
};
