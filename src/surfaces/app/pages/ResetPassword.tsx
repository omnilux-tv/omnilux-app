import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { getCurrentHostedSurface, getDefaultAuthRedirect } from '@/surfaces/app/lib/auth-flow';
import { buildAppHref } from '@/lib/site-surface';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const currentSurface = getCurrentHostedSurface();
  const { provider, signIn } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);

    if (provider === 'workos') {
      await signIn({ returnTo: getDefaultAuthRedirect(currentSurface) });
      return;
    }

    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    navigate({ to: getDefaultAuthRedirect(currentSurface) });
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center font-display text-2xl font-bold text-foreground">
          {provider === 'workos' ? 'Continue account recovery' : 'Set new password'}
        </h1>

        {provider === 'workos' && (
          <p className="mb-8 text-center text-sm text-muted">
            Password changes are handled by the secure OmniLux sign-in flow.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>
          )}

          {provider !== 'workos' && (
            <>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-ring"
                  placeholder="Min. 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-foreground">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-ring"
                  placeholder="Repeat password"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? 'Continuing...' : provider === 'workos' ? 'Continue' : 'Update password'}
          </button>

          {provider === 'workos' && (
            <a href={buildAppHref('/login')} className="block text-center text-sm text-accent hover:underline">
              Back to sign in
            </a>
          )}
        </form>
      </div>
    </div>
  );
};
