import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { type ComponentType, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ChevronRight,
  ChevronDown,
  Compass,
  Cpu,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { buildDocsHref } from '@/lib/site-surface';
import { cn } from '@/lib/utils';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { type OpsServiceHealthResponse, useOpsServiceHealth } from '@/surfaces/app/lib/ops';
import { opsConsoleGroups, opsConsolePages, type OpsConsolePath } from '@/surfaces/app/lib/ops-console';

const pageByPath = new Map(opsConsolePages.map((page) => [page.to, page]));

export const OPS_CONSOLE_CONTENT_CLASS_NAME = 'min-w-0 flex-1 space-y-4';

type OpsTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const opsStatusToneClassName: Record<OpsTone, string> = {
  neutral: 'border-border bg-white/[0.02] text-foreground/82',
  info: 'border-info/25 bg-info/10 text-info',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  danger: 'border-danger/25 bg-danger/10 text-danger',
};

export const opsButtonClassName = ({
  tone = 'secondary',
  className,
}: {
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
}) =>
  cn(
    'inline-flex min-h-8 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
    tone === 'primary' && 'border-primary/55 bg-primary/14 text-primary hover:bg-primary/20',
    tone === 'secondary' && 'border-border bg-panel-muted text-foreground hover:border-border-hover hover:bg-card-hover',
    tone === 'ghost' && 'border-transparent bg-transparent text-muted hover:bg-white/[0.04] hover:text-foreground',
    tone === 'danger' && 'border-danger/35 bg-danger/10 text-danger hover:bg-danger/16',
    className,
  );

const statusToneFromService = (
  status: OpsServiceHealthResponse['services'][number]['status'] | undefined,
): OpsTone => {
  if (status === 'online') return 'success';
  if (status === 'degraded') return 'warning';
  if (status === 'error') return 'danger';
  return 'neutral';
};

const environmentLabel = () => {
  if (typeof window === 'undefined') return 'prod';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return 'local';
  }
  return import.meta.env.DEV ? 'dev' : 'prod';
};

const isPathActive = (pathname: string, itemPath: string) =>
  itemPath === '/dashboard'
    ? pathname === '/dashboard'
    : pathname === itemPath || pathname.startsWith(`${itemPath}/`);

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

export const OpsAppShell = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => (state.location.pathname === '/dashboard/' ? '/dashboard' : state.location.pathname),
  });
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'Operator';
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || 'O';
  const [headerDate, setHeaderDate] = useState(() => new Date());
  const [searchDraft, setSearchDraft] = useState('');
  const [openMenu, setOpenMenu] = useState<'operations' | 'systems' | 'profile' | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const currentPage = pageByPath.get(pathname as OpsConsolePath) ?? null;
  const overviewLink = opsConsolePages.find((page) => page.to === '/dashboard') ?? opsConsolePages[0];
  const operationsLinks = opsConsoleGroups
    .find((group) => group.id === 'operations')
    ?.items.map((path) => pageByPath.get(path))
    .filter((item): item is NonNullable<typeof item> => Boolean(item)) ?? [];
  const systemsLinks = opsConsoleGroups
    .find((group) => group.id === 'systems')
    ?.items.map((path) => pageByPath.get(path))
    .filter((item): item is NonNullable<typeof item> => Boolean(item)) ?? [];
  const opsTime = useMemo(() => formatHeaderTime(headerDate), [headerDate]);
  const opsDate = useMemo(() => formatHeaderDate(headerDate), [headerDate]);
  const alertCount =
    useOpsServiceHealth(Boolean(accessProfile?.isOperator)).data?.services.filter((service) => service.status !== 'online')
      .length ?? 0;

  useEffect(() => {
    const syncDate = () => setHeaderDate(new Date());
    syncDate();
    const intervalId = window.setInterval(syncDate, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const lookup = searchDraft.trim();
    void navigate({
      to: '/dashboard/accounts',
      search: { lookup: lookup || undefined } as never,
    });
  };

  const renderMenu = ({
    menuId,
    label,
    Icon,
    items,
  }: {
    menuId: 'operations' | 'systems';
    label: string;
    Icon: ComponentType<{ className?: string; size?: number }>;
    items: readonly (typeof opsConsolePages)[number][];
  }) => {
    const open = openMenu === menuId;
    const active = items.some((item) => isPathActive(pathname, item.to));

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === menuId ? null : menuId))}
          aria-expanded={open}
          className={cn(
            'group inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition-all',
            active
              ? 'bg-white/[0.06] text-foreground'
              : 'text-foreground/72 hover:bg-white/[0.05] hover:text-foreground',
          )}
        >
          <Icon size={15} className={cn(active ? 'text-foreground/90' : 'text-muted group-hover:text-foreground')} />
          <span>{label}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : 'rotate-0')} />
        </button>

        {open ? (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[14rem] overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#151619]/95 p-2 shadow-2xl backdrop-blur-xl">
            <div className="space-y-1">
              {items.map((item) => {
                const activeItem = isPathActive(pathname, item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpenMenu(null)}
                    className={cn(
                      'block min-h-11 rounded-[0.9rem] px-4 py-3 text-sm transition-colors',
                      activeItem ? 'bg-white/[0.08] text-white' : 'text-white/72 hover:bg-white/[0.05] hover:text-white',
                    )}
                  >
                    <span className="block font-medium">{item.label}</span>
                    <span className="mt-1 block text-[11px] leading-5 text-white/45">{item.description}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="ops-console-theme min-h-dvh bg-background text-foreground">
      <div className="mx-auto min-h-dvh w-full max-w-[1880px] px-2 py-3 lg:px-3">
        <header className="sticky top-2 z-40">
          <div ref={headerRef} className="surface-panel rounded-[1.75rem] px-3 py-3 sm:px-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Link
                    to="/dashboard"
                    className="inline-flex shrink-0 items-center justify-center"
                    aria-label="OmniLux Ops home"
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
                        OmniLux
                      </Link>
                    </div>
                  </div>
                  <nav aria-label="Operator navigation" className="hidden shrink-0 items-center gap-1 lg:flex">
                    <Link
                      to={overviewLink.to}
                      aria-current={isPathActive(pathname, overviewLink.to) ? 'page' : undefined}
                      className={cn(
                        'group inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all',
                        isPathActive(pathname, overviewLink.to)
                          ? 'bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(242,228,207,0.14)]'
                          : 'text-muted hover:bg-white/6 hover:text-foreground',
                      )}
                    >
                      <Compass size={15} className={cn(isPathActive(pathname, overviewLink.to) ? 'text-primary-foreground' : 'text-muted group-hover:text-foreground')} />
                      {overviewLink.label}
                    </Link>
                    {renderMenu({ menuId: 'operations', label: 'Operations', Icon: ShieldCheck, items: operationsLinks })}
                    {renderMenu({ menuId: 'systems', label: 'Systems', Icon: Cpu, items: systemsLinks })}
                    <Link
                      to="/dashboard/account"
                      aria-current={isPathActive(pathname, '/dashboard/account') ? 'page' : undefined}
                      className={cn(
                        'group inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition-all',
                        isPathActive(pathname, '/dashboard/account')
                          ? 'bg-white/[0.06] text-foreground'
                          : 'text-foreground/72 hover:bg-white/[0.05] hover:text-foreground',
                      )}
                    >
                      <WalletCards size={15} className="text-muted group-hover:text-foreground" />
                      Account
                    </Link>
                  </nav>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="relative order-last flex min-w-0 basis-full items-center lg:order-none lg:basis-auto lg:w-[40rem]"
                  >
                    <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted" />
                    <input
                      type="search"
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.currentTarget.value)}
                      placeholder="Search accounts, servers, relay tokens..."
                      className="h-11 w-full rounded-full border border-white/8 bg-white/[0.04] pl-10 pr-4 text-sm text-foreground placeholder:text-muted outline-none transition-all focus:border-white/18"
                    />
                  </form>
                  <Link
                    to="/dashboard/logs"
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-full transition-all',
                      alertCount > 0
                        ? 'bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(242,228,207,0.14)]'
                        : 'bg-white/[0.04] text-muted hover:bg-white/10 hover:text-foreground',
                    )}
                    aria-label="Activity"
                    title="Activity"
                  >
                    <Activity className="h-4 w-4" />
                  </Link>
                  <div className="hidden shrink-0 select-none text-right xl:block">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{opsTime}</p>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted">{opsDate}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenMenu((current) => (current === 'profile' ? null : 'profile'))}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:bg-white/10"
                    aria-label="User menu"
                    aria-haspopup="menu"
                    aria-expanded={openMenu === 'profile'}
                  >
                    {displayInitial}
                  </button>
                  {openMenu === 'profile' ? (
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[14rem] overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/85 p-2 shadow-2xl backdrop-blur-xl">
                      <div className="mb-1.5 border-b border-white/8 px-3.5 py-3">
                        <p className="text-sm font-semibold text-foreground">{displayName}</p>
                        <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em] text-muted">Operator</p>
                      </div>
                      <Link
                        to="/dashboard/account"
                        onClick={() => setOpenMenu(null)}
                        className="flex min-h-11 w-full items-center rounded-[0.9rem] px-4 py-3 text-left text-sm font-medium text-white/65 transition-colors hover:bg-white/6 hover:text-white"
                      >
                        Account
                      </Link>
                      <a
                        href={buildDocsHref('/guide/operator-runbook')}
                        onClick={() => setOpenMenu(null)}
                        className="flex min-h-11 w-full items-center rounded-[0.9rem] px-4 py-3 text-left text-sm font-medium text-white/65 transition-colors hover:bg-white/6 hover:text-white"
                      >
                        Docs
                      </a>
                      <div className="mx-2 my-1.5 border-t border-white/8" />
                      <button
                        type="button"
                        onClick={() => void signOut().then(() => window.location.assign('/login'))}
                        className="flex min-h-11 w-full items-center gap-2.5 rounded-[0.9rem] px-4 py-3 text-left text-sm font-medium text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <nav aria-label="Operator navigation" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:hidden">
                <div className="flex gap-1">
                  {[overviewLink, ...operationsLinks, ...systemsLinks].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={isPathActive(pathname, item.to) ? 'page' : undefined}
                      className={cn(
                        'inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all',
                        isPathActive(pathname, item.to)
                          ? 'bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(242,228,207,0.14)]'
                          : 'border-white/8 bg-white/[0.04] text-foreground/72 hover:bg-white/[0.08] hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </header>

        <div className={cn(OPS_CONSOLE_CONTENT_CLASS_NAME, 'mt-4')}>
          {currentPage ? (
            <div className="flex items-center gap-2 px-1 text-[10px] uppercase tracking-[0.18em] text-muted">
              <span>{currentPage.label}</span>
              <span className="text-muted/60">/</span>
              <span className="truncate">{currentPage.description}</span>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
};

export const OpsPageShell = ({
  eyebrow,
  title,
  description,
  actions,
  metrics = [],
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  metrics?: Array<{
    label: string;
    value: string;
    detail: string;
    tone?: OpsTone;
  }> | ReadonlyArray<{
    label: string;
    value: string;
    detail: string;
    tone?: OpsTone;
  }>;
  children: ReactNode;
}) => (
  <div className="space-y-4">
    <section className="ops-panel rounded-lg px-5 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">{eyebrow}</p>
          <h1 className="mt-2 font-display text-[1.9rem] font-semibold tracking-tight text-foreground lg:text-[2.15rem]">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {metrics.length > 0 ? (
        <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <OpsMetricCard key={metric.label} {...metric} />
          ))}
        </div>
      ) : null}
    </section>

    {children}
  </div>
);

export const OpsMetricCard = ({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: OpsTone;
}) => (
  <div
    className={cn(
      'relative bg-panel-muted px-4 py-3',
      tone !== 'neutral' && 'bg-panel',
    )}
  >
    <span
      className={cn(
        'absolute inset-x-0 top-0 h-px bg-border',
        tone === 'info' && 'bg-info/70',
        tone === 'success' && 'bg-success/70',
        tone === 'warning' && 'bg-warning/70',
        tone === 'danger' && 'bg-danger/70',
      )}
    />
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
    <div className="mt-2 flex items-end justify-between gap-3">
      <p className="font-mono text-[1.35rem] font-semibold text-foreground">{value}</p>
      {tone !== 'neutral' ? <OpsStatusBadge tone={tone}>{tone}</OpsStatusBadge> : null}
    </div>
    <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
  </div>
);

export const OpsPanel = ({
  title,
  description,
  meta,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cn('ops-panel rounded-lg px-5 py-4', className)}>
    <div className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {meta || actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {meta ? <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{meta}</div> : null}
          {actions}
        </div>
      ) : null}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

export const OpsToolbar = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('flex flex-col gap-3 rounded-md border border-border bg-panel-muted px-4 py-3 lg:flex-row lg:items-center lg:justify-between', className)}>
    {children}
  </div>
);

export const OpsStatusBadge = ({
  tone,
  children,
  className,
}: {
  tone: OpsTone;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-md border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]',
      opsStatusToneClassName[tone],
      className,
    )}
  >
    {children}
  </span>
);

export const OpsCallout = ({
  title,
  body,
  tone,
  action,
}: {
  title: string;
  body: ReactNode;
  tone: OpsTone;
  action?: ReactNode;
}) => (
  <section className={cn('rounded-md border px-5 py-4', opsStatusToneClassName[tone])}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="border-l-2 border-current pl-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-1 text-sm leading-6 text-foreground/88">{body}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  </section>
);

export const OpsLoadingState = ({ label = 'Loading operator console' }: { label?: string }) => (
  <div className="ops-panel flex min-h-[220px] items-center justify-center rounded-lg px-5 py-5">
    <div className="flex items-center gap-3 text-sm text-muted">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted/40 border-t-accent" />
      <span>{label}</span>
    </div>
  </div>
);

export const OpsNotice = ({
  title,
  body,
  tone = 'warning',
}: {
  title: string;
  body: ReactNode;
  tone?: 'warning' | 'danger';
}) => (
  <section
    className={cn(
      'rounded-lg border px-5 py-5',
      tone === 'danger' ? opsStatusToneClassName.danger : opsStatusToneClassName.warning,
    )}
  >
    <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
    <div className="mt-2 text-sm leading-6 text-foreground/88">{body}</div>
  </section>
);

export const OpsEmptyState = ({
  title,
  body,
}: {
  title: string;
  body: ReactNode;
}) => (
  <div className="rounded-md border border-dashed border-border bg-panel-muted px-4 py-6 text-sm">
    <p className="font-medium text-foreground">{title}</p>
    <div className="mt-1 leading-6 text-muted">{body}</div>
  </div>
);

export const OpsTable = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('overflow-hidden rounded-md border border-border bg-panel-muted', className)}>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  </div>
);

export const OpsTableHead = ({ children }: { children: ReactNode }) => (
  <thead className="border-b border-border bg-black/20">{children}</thead>
);

export const OpsTableHeaderCell = ({
  children,
  align = 'left',
  className,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) => (
  <th
    className={cn(
      'px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted',
      align === 'right' ? 'text-right' : 'text-left',
      className,
    )}
  >
    {children}
  </th>
);

export const OpsTableBody = ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>;

export const OpsTableRow = ({
  children,
  active = false,
  className,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}) => (
  <tr
    onClick={onClick}
    className={cn(
      'border-b border-border/70 last:border-b-0 odd:bg-white/[0.01]',
      onClick && 'cursor-pointer transition-colors hover:bg-white/[0.04]',
      active && 'bg-primary/8 shadow-[inset_2px_0_0_0_rgba(93,157,255,0.85)]',
      className,
    )}
  >
    {children}
  </tr>
);

export const OpsTableCell = ({
  children,
  className,
  align = 'left',
}: {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) => (
  <td className={cn('px-4 py-3 align-top text-sm text-foreground', align === 'right' ? 'text-right' : 'text-left', className)}>
    {children}
  </td>
);

export const OpsKeyValueList = ({
  items,
  columns = 2,
}: {
  items: Array<{
    label: string;
    value: ReactNode;
    detail?: ReactNode;
    tone?: OpsTone;
  }> | ReadonlyArray<{
    label: string;
    value: ReactNode;
    detail?: ReactNode;
    tone?: OpsTone;
  }>;
  columns?: 1 | 2 | 3 | 4;
}) => (
  <div
    className={cn(
      'grid gap-px overflow-hidden rounded-md border border-border bg-border',
      columns === 1 && 'grid-cols-1',
      columns === 2 && 'grid-cols-1 md:grid-cols-2',
      columns === 3 && 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
      columns === 4 && 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
    )}
  >
    {items.map((item) => (
      <div key={item.label} className="bg-panel-muted px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{item.label}</p>
          {item.tone ? <OpsStatusBadge tone={item.tone}>{item.tone}</OpsStatusBadge> : null}
        </div>
        <div className="mt-2 text-sm font-semibold text-foreground">{item.value}</div>
        {item.detail ? <div className="mt-1 text-xs leading-5 text-muted">{item.detail}</div> : null}
      </div>
    ))}
  </div>
);

export const OpsLinkList = ({
  items,
}: {
  items: Array<{
    href?: string;
    to?: OpsConsolePath;
    label: string;
    description?: string;
    meta?: string;
  }> | ReadonlyArray<{
    href?: string;
    to?: OpsConsolePath;
    label: string;
    description?: string;
    meta?: string;
  }>;
}) => (
  <div className="divide-y divide-border rounded-md border border-border bg-panel-muted">
    {items.map((item) => {
      const content = (
        <span className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-card-hover">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{item.label}</span>
            {item.description ? <span className="mt-1 block text-sm leading-6 text-muted">{item.description}</span> : null}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {item.meta ? <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{item.meta}</span> : null}
            <ChevronRight className="h-4 w-4 text-muted" />
          </span>
        </span>
      );

      if (item.to) {
        return (
          <Link key={item.label} to={item.to} className="block">
            {content}
          </Link>
        );
      }

      return (
        <a key={item.label} href={item.href} className="block">
          {content}
        </a>
      );
    })}
  </div>
);

export const OpsConfirmDialog = ({
  open,
  title,
  body,
  confirmLabel,
  confirmTone = 'danger',
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  confirmTone?: 'primary' | 'danger';
  onClose: () => void;
  onConfirm: () => void;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4">
      <div className="ops-panel-elevated w-full max-w-lg rounded-xl px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Confirmation required</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">{title}</h2>
        <div className="mt-3 text-sm leading-6 text-muted">{body}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={opsButtonClassName({ tone: 'ghost' })}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={opsButtonClassName({ tone: confirmTone === 'danger' ? 'danger' : 'primary' })}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const opsServiceTone = statusToneFromService;
