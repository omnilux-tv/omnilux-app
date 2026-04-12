import { Link, useRouterState } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { buildAppHref, buildDocsHref, buildMarketingHref, buildOpsHref } from '@/lib/site-surface';
import { cn } from '@/lib/utils';

export const AppHeader = () => {
  const { user, signOut } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'Account';
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || 'A';
  const isAuthenticated = Boolean(user);
  const normalizedPathname = pathname === '/dashboard/' ? '/dashboard' : pathname;
  const sectionItemClassName =
    'inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all';
  const inactiveSectionItemClassName =
    'border-white/8 bg-white/[0.04] text-foreground/72 hover:bg-white/[0.08] hover:text-foreground';
  const activeSectionItemClassName =
    'border-transparent bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(242,228,207,0.14)]';
  const utilityItemClassName =
    'inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-sm font-medium text-foreground/74 transition-all hover:bg-white/[0.08] hover:text-foreground';
  const iconUtilityItemClassName =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-foreground/74 transition-all hover:bg-white/[0.08] hover:text-foreground';
  const appLinks = [
    { to: '/dashboard', label: 'Overview' },
    { to: '/dashboard/media', label: 'Media' },
    { to: '/dashboard/servers', label: 'Servers' },
    { to: '/dashboard/devices', label: 'Devices' },
    { to: '/dashboard/subscription', label: 'Billing' },
    { to: '/dashboard/account', label: 'Account' },
  ] as const;
  const isSectionActive = (item: { to: string }) =>
    item.to === '/dashboard'
      ? normalizedPathname === '/dashboard'
      : normalizedPathname === item.to || normalizedPathname.startsWith(`${item.to}/`);

  const handleSignOut = async () => {
    await signOut();
    window.location.assign(buildAppHref('/login'));
  };

  return (
    <header className="sticky top-0 z-50 px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="surface-panel rounded-[1.75rem] px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex shrink-0 items-center justify-center"
                  aria-label="OmniLux Cloud home"
                >
                  <img
                    src="/favicon.svg"
                    alt=""
                    className="h-9 w-9 drop-shadow-[0_0_18px_rgba(255,126,61,0.16)]"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to="/dashboard" className="font-display text-lg font-bold text-foreground">
                      OmniLux Cloud
                    </Link>
                    <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                      app
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={buildMarketingHref('/')} className={utilityItemClassName}>
                    <span>Marketing Site</span>
                  </a>
                  <a href={buildDocsHref('/guide/overview')} className={utilityItemClassName}>
                    Docs
                  </a>
                  {accessProfile?.isOperator ? (
                    <a href={buildOpsHref('/dashboard')} className={utilityItemClassName}>
                      Ops Console
                    </a>
                  ) : null}
                </div>

                {isAuthenticated ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1.5 text-foreground">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-foreground/80">
                        {displayInitial}
                      </span>
                      <span className="max-w-[12rem] truncate pr-1 text-sm font-medium">{displayName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className={iconUtilityItemClassName}
                      aria-label="Sign out"
                      title="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={buildAppHref('/login')} className={utilityItemClassName}>
                      Sign in
                    </a>
                    <a
                      href={buildAppHref('/register')}
                      className={cn(
                        utilityItemClassName,
                        'bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(242,228,207,0.14)] hover:opacity-95',
                      )}
                    >
                      Create account
                    </a>
                  </div>
                )}
              </div>
            </div>

            {isAuthenticated ? (
              <nav aria-label="App sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
                {appLinks.map(({ to, label }) => {
                  const active = isSectionActive({ to });

                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        sectionItemClassName,
                        active ? activeSectionItemClassName : inactiveSectionItemClassName,
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
