import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  buildAuthCallbackUrl,
  getRedirectPathFromSearch,
  setPendingSignup,
} from '@/surfaces/app/lib/auth-flow';
import { buildAppHref, buildMarketingHref } from '@/lib/site-surface';
import { supabase } from '@/lib/supabase';

const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
  if (pw.length < 6) return { label: 'Too short', color: 'bg-danger', width: 'w-1/5' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-danger', width: 'w-2/5' };
  if (score === 2) return { label: 'Fair', color: 'bg-warning', width: 'w-3/5' };
  if (score === 3) return { label: 'Good', color: 'bg-success', width: 'w-4/5' };
  return { label: 'Strong', color: 'bg-success', width: 'w-full' };
};

export const Register = () => {
  const navigate = useNavigate();
  const redirectPath = typeof window === 'undefined'
    ? '/dashboard'
    : getRedirectPathFromSearch(window.location.search);
  const loginHref = buildAppHref(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tosAccepted) {
      setError('You must accept the Terms of Service.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: buildAuthCallbackUrl(redirectPath),
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setPendingSignup({ email, next: redirectPath });
    navigate({ to: '/verify-email' });
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
        <h1 className="mb-8 text-center font-display text-2xl font-bold text-foreground">
          Create your OmniLux Cloud account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>
          )}

          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-foreground">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-ring"
              placeholder="Your name"
            />
          </div>

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
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-ring"
              placeholder="Min. 6 characters"
            />
            {password.length > 0 && (
              <div className="mt-2">
                <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                  <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                </div>
                <p className="mt-1 text-xs text-muted">{strength.label}</p>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span>
              I agree to the{' '}
              <a href={buildMarketingHref('/terms')} className="text-accent hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href={buildMarketingHref('/privacy')} className="text-accent hover:underline">Privacy Policy</a>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
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
          Already have a cloud account?{' '}
          <a href={loginHref} className="text-accent hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
};
