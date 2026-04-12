import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  buildAuthCallbackUrl,
  getRedirectPathFromSearch,
} from '@/surfaces/app/lib/auth-flow';
import { buildAppHref, buildSurfaceHrefForPath } from '@/lib/site-surface';
import { supabase } from '@/lib/supabase';

export const Login = () => {
  const navigate = useNavigate();
  const redirectPath =
    typeof window === 'undefined'
      ? '/dashboard'
      : getRedirectPathFromSearch(window.location.search, '/dashboard');
  const registerHref = buildAppHref(`/register?redirect=${encodeURIComponent(redirectPath)}`);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    if (redirectPath === '/dashboard') {
      navigate({ to: '/dashboard' });
      return;
    }

    window.location.assign(buildSurfaceHrefForPath(redirectPath));
  };

  const handleOAuth = async (provider: 'google' | 'apple' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: buildAuthCallbackUrl(redirectPath) },
    });
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center font-display text-2xl font-bold text-foreground">Sign in to your OmniLux account</h1>

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

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-ring"
              placeholder="Enter your password"
            />
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-accent hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or continue with</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(['google', 'apple', 'github'] as const).map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => handleOAuth(provider)}
              className="rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface capitalize"
            >
              {provider}
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Need a cloud account?{' '}
          <a href={registerHref} className="text-accent hover:underline">Register</a>
        </p>
      </div>
    </div>
  );
};
