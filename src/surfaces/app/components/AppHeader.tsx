import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowUpRight, ChevronDown, LogOut, Search } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { opsConsolePages } from '@/surfaces/app/lib/ops-console';
import { buildAppHref, buildDocsHref, buildMarketingHref, buildOpsHref, getCurrentSiteSurface } from '@/lib/site-surface';
import { cn } from '@/lib/utils';

const OPS_CONTAINER_CLASS_NAME = 'mx-auto w-full max-w-[2200px]';
type OpsNavItem = (typeof opsConsolePages)[number];

const formatHeaderTime = (value: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);

const formatHeaderDate = (value: Date) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(value);

export const AppHeader = () => {
  const { user, signOut } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const currentSurface =
    typeof window === 'undefined' ? 'app' : getCurrentSiteSurface(window.location.hostname);
  const isOpsSurface = currentSurface === 'ops';
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'Account';
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || 'A';
  const isAuthenticated = Boolean(user);
  const [opsSearchDraft, setOpsSearchDraft] = useState('');
  const [headerDate, setHeaderDate] = useState(() => new Date());
  const [openOpsMenu, setOpenOpsMenu] = useState<'workspace' | 'organization' | 'platform' | null>(null);
  const opsNavRef = useRef<HTMLDivElement | null>(null);
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
    ...(accessProfile?.isOperator ? [{ to: '/dashboard/accounts', label: 'Ops' }] : []),
  ] as const;
  const opsLinks = opsConsolePages;
  const opsOverviewLink = opsLinks.find((item) => item.to === '/dashboard') ?? opsLinks[0];
  const opsWorkspaceLinks = opsLinks.filter((item) =>
    ['/dashboard/accounts', '/dashboard/logs'].includes(item.to),
  );
  const opsOrganizationLinks = opsLinks.filter((item) =>
    ['/dashboard/financials', '/dashboard/staff'].includes(item.to),
  );
  const opsPlatformLinks = opsLinks.filter((item) =>
    ['/dashboard/control-plane', '/dashboard/media-control', '/dashboard/health'].includes(item.to),
  );
  const opsTime = useMemo(() => formatHeaderTime(headerDate), [headerDate]);
  const opsDate = useMemo(() => formatHeaderDate(headerDate), [headerDate]);
  const isSectionActive = (item: { to: string }) =>
    item.to === '/dashboard'
      ? normalizedPathname === '/dashboard'
      : normalizedPathname === item.to || normalizedPathname.startsWith(`${item.to}/`);

  const handleSignOut = async () => {
    await signOut();
    window.location.assign(isOpsSurface ? buildOpsHref('/login') : buildAppHref('/login'));
  };

  useEffect(() => {
    if (!isOpsSurface) {
      return;
    }

    const syncDate = () => setHeaderDate(new Date());
    syncDate();
    const intervalId = window.setInterval(syncDate, 30_000);
    return () => window.clearInterval(intervalId);
  }, [isOpsSurface]);

  useEffect(() => {
    if (!isOpsSurface || typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setOpsSearchDraft(params.get('lookup') ?? '');
  }, [isOpsSurface, pathname, routerState.location.search]);

  useEffect(() => {
    setOpenOpsMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!isOpsSurface || !openOpsMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!opsNavRef.current?.contains(event.target as Node)) {
        setOpenOpsMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenOpsMenu(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpsSurface, openOpsMenu]);

  const handleOpsSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const lookup = opsSearchDraft.trim();
    void navigate({
      to: '/dashboard/accounts',
      search: { lookup: lookup || undefined } as never,
    });
  };

  const renderOpsMenu = ({
    menuId,
    label,
    items,
  }: {
    menuId: 'workspace' | 'organization' | 'platform';
    label: string;
    items: readonly OpsNavItem[];
  }) => {
    const open = openOpsMenu === menuId;
    const active = items.some((item) => isSectionActive(item));

    return (
      <div key={menuId} className="relative">
        <button
          type="button"
          onClick={() => setOpenOpsMenu((current) => (current === menuId ? null : menuId))}
          aria-expanded={open}
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2.5 text-sm font-semibold transition-all 2xl:px-4',
            active || open
              ? 'bg-primary text-primary-foreground shadow-[0_18px_48px_rgba(242,228,207,0.14)]'
              : 'text-foreground/68 hover:bg-white/[0.06] hover:text-foreground',
          )}
        >
          <span>{label}</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : 'rotate-0')}
          />
        </button>

        {open ? (
          <div className="absolute left-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-[1.25rem] border border-white/10 bg-[#121317]/96 p-2 shadow-[0_28px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <div className="space-y-1.5">
              {items.map((item) => {
                const activeItem = isSectionActive(item);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpenOpsMenu(null)}
                    className={cn(
                      'block rounded-[1rem] px-4 py-3 transition-colors',
                      activeItem ? 'bg-primary/16 text-foreground' : 'hover:bg-white/[0.05]',
                    )}
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{item.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  if (isOpsSurface) {
    return (
      <header className="sticky top-0 z-50 px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:px-6 lg:px-8">
        <div className={OPS_CONTAINER_CLASS_NAME}>
          <div className="surface-panel rounded-[1.75rem] px-3 py-3 sm:px-4">
            <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.7fr)_auto] xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.8fr)_auto]">
              <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                <Link
                  to="/dashboard"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.04] transition-colors hover:bg-white/[0.08]"
                  aria-label="OmniLux Ops home"
                >
                  <img
                    src="/favicon.svg"
                    alt=""
                    className="h-9 w-9 drop-shadow-[0_0_18px_rgba(255,126,61,0.16)]"
                  />
                </Link>

                <div className="hidden min-w-0 shrink-0 xl:block">
                  <p className="font-display text-lg font-bold text-foreground">OmniLux Ops</p>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Operator console</p>
                </div>

                {isAuthenticated ? (
                  <nav
                    aria-label="Ops sections"
                    ref={opsNavRef}
                    className="-mx-1 flex min-w-0 flex-1 items-center gap-1 px-1"
                  >
                    <Link
                      to={opsOverviewLink.to}
                      aria-current={isSectionActive(opsOverviewLink) ? 'page' : undefined}
                      className={cn(
                        'inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3.5 py-2.5 text-sm font-semibold transition-all 2xl:px-4',
                        isSectionActive(opsOverviewLink)
                          ? 'bg-primary text-primary-foreground shadow-[0_18px_48px_rgba(242,228,207,0.14)]'
                          : 'text-foreground/68 hover:bg-white/[0.06] hover:text-foreground',
                      )}
                    >
                      {opsOverviewLink.label}
                    </Link>
                    {renderOpsMenu({
                      menuId: 'workspace',
                      label: 'Workspace',
                      items: opsWorkspaceLinks,
                    })}
                    {renderOpsMenu({
                      menuId: 'organization',
                      label: 'Organization',
                      items: opsOrganizationLinks,
                    })}
                    {renderOpsMenu({
                      menuId: 'platform',
                      label: 'Platform',
                      items: opsPlatformLinks,
                    })}
                  </nav>
                ) : (
                  <div className="min-w-0 flex-1" />
                )}
              </div>

              {isAuthenticated ? (
                <form
                  onSubmit={handleOpsSearchSubmit}
                  className="relative flex min-w-0 items-center lg:max-w-[300px] xl:max-w-[360px]"
                >
                  <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted" />
                  <input
                    type="search"
                    value={opsSearchDraft}
                    onChange={(event) => setOpsSearchDraft(event.currentTarget.value)}
                    placeholder="Search accounts, relay, billing, staff..."
                    className="h-11 w-full rounded-full border border-white/8 bg-white/[0.05] pl-10 pr-4 text-sm text-foreground placeholder:text-muted outline-none transition-all focus:border-white/18"
                  />
                </form>
              ) : (
                <div className="hidden lg:block" />
              )}

              <div className="flex shrink-0 items-center justify-end gap-2">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard/logs"
                    className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-foreground/78 transition-all hover:bg-white/[0.08] hover:text-foreground"
                  >
                    <Activity className="h-4 w-4" />
                    <span>Activity</span>
                  </Link>
                ) : null}

                <a
                  href={buildAppHref('/dashboard')}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-foreground/78 transition-all hover:bg-white/[0.08] hover:text-foreground"
                >
                  <span>Cloud App</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>

                <div className="hidden shrink-0 text-right lg:block">
                  <p className="text-sm font-semibold tabular-nums text-foreground">{opsTime}</p>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">{opsDate}</p>
                </div>

                {isAuthenticated ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to="/dashboard/account"
                      className="inline-flex min-h-10 max-w-[12rem] items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1.5 text-foreground transition-all hover:bg-white/[0.08]"
                    >
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-foreground/84">
                        {displayInitial}
                      </span>
                      <span className="truncate pr-1 text-sm font-medium">
                        <span className="hidden xl:inline">{displayName}</span>
                        <span className="xl:hidden">{displayName.split(' ')[0] || displayName}</span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-foreground/74 transition-all hover:bg-white/[0.08] hover:text-foreground"
                      aria-label="Sign out"
                      title="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <a
                    href={buildOpsHref('/login')}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-sm font-medium text-foreground/78 transition-all hover:bg-white/[0.08] hover:text-foreground"
                  >
                    Sign in
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

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
                  aria-label={isOpsSurface ? 'OmniLux Ops home' : 'OmniLux Cloud home'}
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
                      {isOpsSurface ? 'OmniLux Ops' : 'OmniLux Cloud'}
                    </Link>
                    <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                      {isOpsSurface ? 'ops' : 'app'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={isOpsSurface ? buildAppHref('/dashboard') : buildMarketingHref('/')}
                    className={utilityItemClassName}
                  >
                    <span>{isOpsSurface ? 'Cloud App' : 'Marketing Site'}</span>
                  </a>
                  <a
                    href={buildDocsHref('/guide/overview')}
                    className={utilityItemClassName}
                  >
                    Docs
                  </a>
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
                    <a
                      href={isOpsSurface ? buildOpsHref('/login') : buildAppHref('/login')}
                      className={utilityItemClassName}
                    >
                      Sign in
                    </a>
                    {isOpsSurface ? null : (
                      <a
                        href={buildAppHref('/register')}
                        className={cn(
                          utilityItemClassName,
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
