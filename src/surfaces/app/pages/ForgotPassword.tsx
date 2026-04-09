import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { buildAuthCallbackUrl } from '@/surfaces/app/lib/auth-flow';
import { buildAppHref } from '@/lib/site-surface';
import { supabase } from '@/lib/supabase';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAuthCallbackUrl('/reset-password'),
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Check your email</h1>
          <p className="mt-3 text-sm text-muted">
            If an account exists for {email}, we sent a password reset link.
          </p>
          <a href={buildAppHref('/login')} className="mt-6 inline-block text-sm text-accent hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center font-display text-2xl font-bold text-foreground">
          Reset password
        </h1>
        <p className="mb-8 text-center text-sm text-muted">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-ring"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <a href={buildAppHref('/login')} className="text-accent hover:underline">Back to sign in</a>
        </p>
      </div>
    </div>
  );
};
