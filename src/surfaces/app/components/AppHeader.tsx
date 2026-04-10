import { Link, useRouterState } from '@tanstack/react-router';
import { LogOut, MonitorPlay, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { buildAppHref, buildDocsHref, buildMarketingHref, buildOpsHref, getCurrentSiteSurface } from '@/lib/site-surface';
import { cn } from '@/lib/utils';

export const AppHeader = () => {
  const { user, signOut } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const currentSurface =
    typeof window === 'undefined' ? 'app' : getCurrentSiteSurface(window.location.hostname);
  const isOpsSurface = currentSurface === 'ops';
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'Account';
  const isAuthenticated = Boolean(user);
  const navItemClassName =
    'inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all';
  const inactiveNavItemClassName = 'text-muted hover:bg-white/6 hover:text-foreground';
  const appLinks = isOpsSurface
    ? [
        { to: '/dashboard', label: 'Overview' },
        { to: '/dashboard/operators', label: 'Policy & Access' },
        { to: '/dashboard/account', label: 'Account' },
      ]
    : [
        { to: '/dashboard', label: 'Overview' },
        { to: '/dashboard/media', label: 'Media' },
        { to: '/dashboard/servers', label: 'Servers' },
        { to: '/dashboard/devices', label: 'Devices' },
        { to: '/dashboard/subscription', label: 'Billing' },
        { to: '/dashboard/account', label: 'Account' },
        ...(accessProfile?.isOperator ? [{ to: '/dashboard/operators', label: 'Operators' }] : []),
      ] as const;

  const handleSignOut = async () => {
    await signOut();
    window.location.assign(isOpsSurface ? buildOpsHref('/login') : buildAppHref('/login'));
  };

  return (
    <header className="sticky top-0 z-50 px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="surface-panel rounded-[1.75rem] px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/5"
                  aria-label={isOpsSurface ? 'OmniLux Ops home' : 'OmniLux Cloud home'}
                >
                  <img src="/favicon.svg" alt="" className="h-8 w-8" />
                </Link>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to="/dashboard" className="font-display text-base font-bold text-foreground sm:text-lg">
                      {isOpsSurface ? 'OmniLux Ops' : 'OmniLux Cloud'}
                    </Link>
                    <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                      {isOpsSurface ? 'ops' : 'app'}
                    </span>
                  </div>
                  <p className="hidden text-sm text-muted lg:block">
                    {isOpsSurface
                      ? 'Policy, support tooling, and managed service oversight in the same navigation language as the runtime.'
                      : 'Account, access, billing, and remote services with the same nav treatment as the self-hosted server.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={isOpsSurface ? buildAppHref('/dashboard') : buildMarketingHref('/')}
                    className={cn(navItemClassName, inactiveNavItemClassName)}
                  >
                    <MonitorPlay className="h-4 w-4" />
                    <span>{isOpsSurface ? 'Cloud App' : 'Marketing Site'}</span>
                  </a>
                  <a
                    href={buildDocsHref('/guide/overview')}
                    className={cn(navItemClassName, inactiveNavItemClassName)}
                  >
                    Docs
                  </a>
                </div>

                {isAuthenticated ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3.5 py-2 text-sm text-foreground">
                      <UserCircle2 className="h-4 w-4 shrink-0 text-muted" />
                      <span className="max-w-[16rem] truncate font-medium">{displayName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className={cn(navItemClassName, inactiveNavItemClassName)}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={isOpsSurface ? buildOpsHref('/login') : buildAppHref('/login')}
                      className={cn(navItemClassName, inactiveNavItemClassName)}
                    >
                      Sign in
                    </a>
                    {isOpsSurface ? null : (
                      <a
                        href={buildAppHref('/register')}
                        className={cn(
                          navItemClassName,
                          'bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(242,228,207,0.14)] hover:opacity-95',
                        )}
                      >
                        Create account
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isAuthenticated ? (
              <nav aria-label="App sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
                {appLinks.map(({ to, label }) => {
                  const active = pathname === to || pathname.startsWith(`${to}/`);

                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        navItemClassName,
                        active
                          ? 'bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(242,228,207,0.14)]'
                          : inactiveNavItemClassName,
                      )}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
