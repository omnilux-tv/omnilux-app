import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { type ComponentType, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  Building2,
  ChevronDown,
  Cpu,
  LayoutDashboard,
  LogOut,
  Search,
} from 'lucide-react';
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
  const [openOpsMenu, setOpenOpsMenu] = useState<'workspace' | 'organization' | 'platform' | 'profile' | null>(null);
  const opsHeaderRef = useRef<HTMLDivElement | null>(null);
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
  const isOpsLogsActive =
    normalizedPathname === '/dashboard/logs' || normalizedPathname.startsWith('/dashboard/logs/');
  const isSectionActive = (item: { to: string }) =>
    item.to === '/dashboard'
      ? normalizedPathname === '/dashboard'
      : normalizedPathname === item.to || normalizedPathname.startsWith(`${item.to}/`);
  const hideForOpsShell = isOpsSurface && isAuthenticated && normalizedPathname.startsWith('/dashboard');

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
      if (!opsHeaderRef.current?.contains(event.target as Node)) {
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
    Icon,
    items,
  }: {
    menuId: 'workspace' | 'organization' | 'platform';
    label: string;
    Icon: ComponentType<{ size?: number; className?: string }>;
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
            'group inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all',
            active || open
              ? 'bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(242,228,207,0.14)]'
              : 'text-muted hover:bg-white/6 hover:text-foreground',
          )}
        >
          <Icon
            size={16}
            className={cn(
              active || open
                ? 'text-primary-foreground'
                : 'text-muted transition-colors group-hover:text-foreground',
            )}
          />
          <span>{label}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              active || open
                ? 'text-primary-foreground/70'
                : 'text-muted group-hover:text-foreground',
              open ? 'rotate-180' : 'rotate-0',
            )}
          />
        </button>

        {open ? (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[12rem] overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/85 p-2 shadow-2xl backdrop-blur-xl">
            <div className="space-y-1">
              {items.map((item) => {
                const activeItem = isSectionActive(item);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpenOpsMenu(null)}
                    className={cn(
                      'block min-h-11 rounded-[0.9rem] px-4 py-3 text-sm font-medium transition-colors',
                      activeItem ? 'bg-white/12 text-white' : 'text-white/65 hover:bg-white/6 hover:text-white',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  if (hideForOpsShell) {
    return null;
  }

  if (isOpsSurface) {
    return (
      <header className="sticky top-0 z-50 px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:px-6 lg:px-8">
        <div className={OPS_CONTAINER_CLASS_NAME}>
          <div
            ref={opsHeaderRef}
            className="surface-panel flex flex-wrap items-center gap-3 rounded-[1.75rem] px-3 py-3 md:px-4"
          >
            <div className="flex min-w-0 shrink-0 items-center gap-2">
                <Link
                  to="/dashboard"
                  className="inline-flex shrink-0 items-center rounded-full text-left"
                  aria-label="OmniLux Ops home"
                >
                  <img
                    src="/favicon.svg"
                    alt=""
                    className="h-9 w-9"
                  />
                </Link>

                {isAuthenticated ? (
                  <nav
                    aria-label="Ops sections"
                    className="hidden shrink-0 items-center gap-1 md:flex"
                  >
                    <Link
                      to={opsOverviewLink.to}
                      aria-current={isSectionActive(opsOverviewLink) ? 'page' : undefined}
                      className={cn(
                        'group inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all',
                        isSectionActive(opsOverviewLink)
                          ? 'bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(242,228,207,0.14)]'
                          : 'text-muted hover:bg-white/6 hover:text-foreground',
                      )}
                    >
                      <LayoutDashboard
                        size={16}
                        className={cn(
                          isSectionActive(opsOverviewLink)
                            ? 'text-primary-foreground'
                            : 'text-muted transition-colors group-hover:text-foreground',
                        )}
                      />
                      {opsOverviewLink.label}
                    </Link>
                    {renderOpsMenu({
                      menuId: 'workspace',
                      label: 'Workspace',
                      Icon: Briefcase,
                      items: opsWorkspaceLinks,
                    })}
                    {renderOpsMenu({
                      menuId: 'organization',
                      label: 'Organization',
                      Icon: Building2,
                      items: opsOrganizationLinks,
                    })}
                    {renderOpsMenu({
                      menuId: 'platform',
                      label: 'Platform',
                      Icon: Cpu,
                      items: opsPlatformLinks,
                    })}
                  </nav>
                ) : (
                  <p className="hidden text-sm font-semibold text-foreground md:block">OmniLux Ops</p>
                )}
            </div>

            {isAuthenticated ? (
              <form
                onSubmit={handleOpsSearchSubmit}
                className="relative order-last flex min-w-0 basis-full items-center md:order-none md:flex-1 md:basis-auto md:max-w-[16rem] lg:max-w-[22rem] xl:max-w-[28rem]"
              >
                <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted" />
                <input
                  type="search"
                  value={opsSearchDraft}
                  onChange={(event) => setOpsSearchDraft(event.currentTarget.value)}
                  placeholder="Search accounts, relay, billing, staff..."
                  className="h-11 w-full rounded-full border border-white/8 bg-white/5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted outline-none transition-all focus:border-white/18"
                />
              </form>
            ) : null}

            <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard/logs"
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-full transition-all md:h-10 md:w-10',
                      isOpsLogsActive
                        ? 'bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(242,228,207,0.14)]'
                        : 'bg-white/5 text-muted hover:bg-white/10 hover:text-foreground',
                    )}
                    aria-label="Activity"
                    title="Activity"
                  >
                    <Activity className="h-4 w-4" />
                  </Link>
                ) : null}

                <div className="hidden shrink-0 select-none text-right xl:block">
                  <p className="text-sm font-semibold tabular-nums text-foreground">{opsTime}</p>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">{opsDate}</p>
                </div>

                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenOpsMenu((current) => (current === 'profile' ? null : 'profile'))}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/5 text-sm font-semibold text-foreground transition-colors hover:bg-white/10"
                      aria-label="User menu"
                      aria-haspopup="menu"
                      aria-expanded={openOpsMenu === 'profile'}
                    >
                      {displayInitial}
                    </button>

                    {openOpsMenu === 'profile' ? (
                      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[14rem] overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/85 p-2 shadow-2xl backdrop-blur-xl">
                        <div className="mb-1.5 border-b border-white/8 px-3.5 py-3">
                          <p className="text-sm font-semibold text-foreground">{displayName}</p>
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em] text-muted">Operator</p>
                        </div>
                        <Link
                          to="/dashboard/account"
                          onClick={() => setOpenOpsMenu(null)}
                          className="flex min-h-11 w-full items-center rounded-[0.9rem] px-4 py-3 text-left text-sm font-medium text-white/65 transition-colors hover:bg-white/6 hover:text-white"
                        >
                          Account
                        </Link>
                        <a
                          href={buildAppHref('/dashboard')}
                          onClick={() => setOpenOpsMenu(null)}
                          className="flex min-h-11 w-full items-center gap-2.5 rounded-[0.9rem] px-4 py-3 text-left text-sm font-medium text-white/65 transition-colors hover:bg-white/6 hover:text-white"
                        >
                          <span>Cloud App</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                        <div className="mx-2 my-1.5 border-t border-white/8" />
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="flex min-h-11 w-full items-center gap-2.5 rounded-[0.9rem] px-4 py-3 text-left text-sm font-medium text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Log out</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <a
                    href={buildOpsHref('/login')}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm font-medium text-foreground/78 transition-all hover:bg-white/10 hover:text-foreground"
                  >
                    Sign in
                  </a>
                )}
            </div>

            {isAuthenticated ? (
              <nav aria-label="Ops sections" className="-mx-1 flex w-full gap-1 overflow-x-auto px-1 pb-1 md:hidden">
                {opsLinks.map((item) => {
                  const active = isSectionActive(item);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        sectionItemClassName,
                        active ? activeSectionItemClassName : inactiveSectionItemClassName,
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
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
