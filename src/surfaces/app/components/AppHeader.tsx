import { Link, useRouterState } from '@tanstack/react-router';
import { LogOut, MonitorPlay, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { buildAppHref, buildMarketingHref } from '@/lib/site-surface';
import { cn } from '@/lib/utils';

export const AppHeader = () => {
  const { user, signOut } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'Account';
  const isAuthenticated = Boolean(user);
  const appLinks = [
    { to: '/dashboard', label: 'Overview' },
    { to: '/dashboard/servers', label: 'Servers' },
    { to: '/dashboard/devices', label: 'Devices' },
    { to: '/dashboard/subscription', label: 'Billing' },
    { to: '/dashboard/account', label: 'Account' },
    ...(accessProfile?.isOperator ? [{ to: '/dashboard/operators', label: 'Operators' }] : []),
  ] as const;

  const handleSignOut = async () => {
    await signOut();
    window.location.assign(buildAppHref('/login'));
  };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Link to="/dashboard" className="font-display text-lg font-bold text-foreground">
                  OmniLux Cloud
                </Link>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                  app
                </span>
              </div>
              <p className="text-sm text-muted">
                Account, access, billing, and remote services for OmniLux Cloud.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href={buildMarketingHref('/')}
              className="inline-flex items-center gap-1 text-muted transition-colors hover:text-foreground"
            >
              <MonitorPlay className="h-4 w-4" />
              Marketing Site
            </a>
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-foreground">
                  <UserCircle2 className="h-4 w-4 text-muted" />
                  <span className="max-w-[18rem] truncate">{displayName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-muted transition-colors hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <a
                  href={buildAppHref('/login')}
                  className="rounded-full border border-border px-3 py-1.5 text-muted transition-colors hover:text-foreground"
                >
                  Sign in
                </a>
                <a
                  href={buildAppHref('/register')}
                  className="rounded-full bg-accent px-3 py-1.5 font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  Create account
                </a>
              </>
            )}
          </div>
        </div>

        {isAuthenticated ? (
          <nav aria-label="App sections" className="flex flex-wrap gap-2">
            {appLinks.map(({ to, label }) => {
              const active = pathname === to || pathname.startsWith(`${to}/`);

              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-accent text-accent-foreground' : 'bg-surface text-muted hover:text-foreground',
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </header>
  );
};
