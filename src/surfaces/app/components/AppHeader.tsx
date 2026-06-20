import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { buildAppHref, buildDocsHref, buildMarketingHref, buildOpsHref } from '@/lib/site-surface';
import { cn } from '@/lib/utils';

export const AppHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'Account';
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || 'A';
  const isAuthenticated = Boolean(user);
  const normalizedPathname = pathname === '/dashboard/' ? '/dashboard' : pathname;
  const sectionItemClassName =
    'inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition-all';
  const inactiveSectionItemClassName =
    'border-border bg-surface text-foreground/72 hover:border-border-hover hover:bg-card-hover hover:text-foreground';
  const activeSectionItemClassName =
    'border-transparent bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(47,107,94,0.18)]';
  const utilityItemClassName =
    'inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground/74 transition-all hover:border-border-hover hover:bg-card-hover hover:text-foreground';
  const iconUtilityItemClassName =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground/74 transition-all hover:border-border-hover hover:bg-card-hover hover:text-foreground';
  const mobileItemClassName =
    'inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-card-hover';
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
            <div className="flex items-center gap-3 lg:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center"
                  aria-label="OmniLux Account home"
                >
                  <BrandLogo
                    className="text-foreground"
                    markClassName="h-9 w-9"
                    wordmarkClassName="hidden"
                    showSubtitle={false}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-black text-foreground">
                      OmniLux Cloud
                    </span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted">
                      Account hub
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden flex-wrap items-center gap-2 lg:flex lg:justify-end">
                <ThemeToggle className="shrink-0" />
                <div className="flex flex-wrap items-center gap-2">
                  <a href={buildMarketingHref('/')} className={utilityItemClassName}>
                    <span>omnilux.tv</span>
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
                    <div className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1.5 text-foreground">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-strong text-[11px] font-semibold text-foreground/80">
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
                        'bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(47,107,94,0.18)] hover:opacity-95',
                      )}
                    >
                      Create account
                    </a>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-border-hover hover:bg-card-hover lg:hidden"
                aria-label="Toggle account menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            {mobileOpen ? (
              <div className="border-t border-border pt-3 lg:hidden">
                <div className="mb-3 flex justify-start">
                  <ThemeToggle />
                </div>

                <div className="flex flex-col gap-2">
                  <a href={buildMarketingHref('/')} className={mobileItemClassName}>
                    omnilux.tv
                  </a>
                  <a href={buildDocsHref('/guide/overview')} className={mobileItemClassName}>
                    Docs
                  </a>
                  {accessProfile?.isOperator ? (
                    <a href={buildOpsHref('/dashboard')} className={mobileItemClassName}>
                      Ops Console
                    </a>
                  ) : null}

                  {isAuthenticated ? (
                    <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
                      <div className="inline-flex min-h-11 w-full items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-foreground">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-strong text-xs font-semibold text-foreground/80">
                          {displayInitial}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{displayName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className={cn(mobileItemClassName, 'gap-2')}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
                      <a href={buildAppHref('/login')} className={mobileItemClassName}>
                        Sign in
                      </a>
                      <a
                        href={buildAppHref('/register')}
                        className={cn(mobileItemClassName, 'border-transparent bg-primary text-primary-foreground')}
                      >
                        Create account
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

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
