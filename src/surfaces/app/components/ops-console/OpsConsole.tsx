import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import type { FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  BookOpen,
  Building2,
  Cpu,
  LayoutDashboard,
  LogOut,
  RadioTower,
  Search,
  Settings2,
  ShieldCheck,
  UserCog,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { buildAppHref, buildDocsHref } from '@/lib/site-surface';
import { cn } from '@/lib/utils';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { type OpsServiceHealthResponse, useOpsServiceHealth } from '@/surfaces/app/lib/ops';
import { opsConsoleGroups, opsConsolePages, type OpsConsolePath } from '@/surfaces/app/lib/ops-console';

const pageByPath = new Map(opsConsolePages.map((page) => [page.to, page]));

const navIconByPath: Partial<Record<OpsConsolePath, typeof LayoutDashboard>> = {
  '/dashboard': LayoutDashboard,
  '/dashboard/accounts': Building2,
  '/dashboard/financials': WalletCards,
  '/dashboard/staff': ShieldCheck,
  '/dashboard/logs': BellRing,
  '/dashboard/control-plane': Settings2,
  '/dashboard/media-control': RadioTower,
  '/dashboard/health': Cpu,
  '/dashboard/account': UserCog,
};

export const OPS_CONSOLE_CONTENT_CLASS_NAME = 'min-w-0 flex-1 space-y-4';

type OpsTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const opsStatusToneClassName: Record<OpsTone, string> = {
  neutral: 'border-white/10 bg-white/[0.04] text-foreground/82',
  info: 'border-info/25 bg-info/12 text-info',
  success: 'border-success/25 bg-success/12 text-success',
  warning: 'border-warning/25 bg-warning/12 text-warning',
  danger: 'border-danger/25 bg-danger/12 text-danger',
};

export const opsButtonClassName = ({
  tone = 'secondary',
  className,
}: {
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
}) =>
  cn(
    'inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
    tone === 'primary' && 'border-primary/60 bg-primary text-primary-foreground hover:bg-primary/92',
    tone === 'secondary' && 'border-border bg-panel-elevated text-foreground hover:bg-card-hover',
    tone === 'ghost' && 'border-transparent bg-transparent text-muted hover:bg-white/[0.05] hover:text-foreground',
    tone === 'danger' && 'border-danger/30 bg-danger/12 text-danger hover:bg-danger/18',
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

export const OpsAppShell = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const { data: serviceHealth } = useOpsServiceHealth(Boolean(accessProfile?.isOperator));
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => (state.location.pathname === '/dashboard/' ? '/dashboard' : state.location.pathname),
  });
  const [searchDraft, setSearchDraft] = useState('');
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'Operator';
  const initials =
    displayName
      .split(/\s+/)
      .map((part: string) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'OP';
  const alertCount =
    serviceHealth?.services.filter((service) => service.status !== 'online').length ?? 0;
  const currentPage = pageByPath.get(pathname as OpsConsolePath) ?? null;

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const lookup = searchDraft.trim();
    void navigate({
      to: '/dashboard/accounts',
      search: { lookup: lookup || undefined } as never,
    });
  };

  return (
    <div className="ops-console-theme min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1880px] gap-4 px-3 py-3 lg:px-4">
        <aside className="ops-panel hidden w-[280px] shrink-0 rounded-xl lg:flex lg:flex-col">
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-panel-elevated">
                <img src="/favicon.svg" alt="" className="h-6 w-6" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-foreground">OmniLux Ops</p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Operational console</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-panel-muted px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Environment</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{environmentLabel()}</p>
              </div>
              <div className="rounded-lg border border-border bg-panel-muted px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Alerts</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{alertCount}</p>
              </div>
            </div>
          </div>

          <nav aria-label="Operator navigation" className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-5">
              {opsConsoleGroups.map((group) => (
                <section key={group.id} className="space-y-2">
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((itemPath) => {
                      const item = pageByPath.get(itemPath);
                      if (!item) {
                        return null;
                      }

                      const active = isPathActive(pathname, item.to);
                      const Icon = navIconByPath[item.to] ?? LayoutDashboard;

                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'group flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors',
                            active
                              ? 'border-primary/35 bg-primary/12 text-foreground'
                              : 'border-transparent bg-transparent text-muted hover:border-border hover:bg-white/[0.04] hover:text-foreground',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
                              active ? 'border-primary/30 bg-primary/12 text-primary' : 'border-border bg-panel-muted text-muted',
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{item.label}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-muted">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </nav>

          <div className="border-t border-border px-4 py-4">
            <div className="rounded-lg border border-border bg-panel-muted px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Org</p>
              <p className="mt-1 text-sm font-semibold text-foreground">OmniLux Internal</p>
              <p className="mt-1 text-xs text-muted">Operator and support workflows</p>
            </div>
          </div>
        </aside>

        <div className={OPS_CONSOLE_CONTENT_CLASS_NAME}>
          <header className="ops-panel sticky top-3 z-40 rounded-xl">
            <div className="flex flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-md border border-border bg-panel-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  {environmentLabel()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    {currentPage ? currentPage.label : 'Operator console'}
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">
                    {currentPage?.description ?? 'System operations, policy controls, and audit visibility.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <form onSubmit={handleSearchSubmit} className="relative min-w-0 xl:w-[340px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="search"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.currentTarget.value)}
                    placeholder="Jump to account, server, relay token..."
                    className="h-10 w-full rounded-md border border-border bg-input pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-border-hover"
                  />
                </form>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={buildDocsHref('/guide/operator-runbook')}
                    className={opsButtonClassName({ tone: 'ghost' })}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Runbook</span>
                  </a>
                  <a href={buildAppHref('/dashboard')} className={opsButtonClassName({ tone: 'secondary' })}>
                    <span>Cloud app</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <Link to="/dashboard/logs" className={opsButtonClassName({ tone: alertCount > 0 ? 'danger' : 'secondary' })}>
                    <AlertTriangle className="h-4 w-4" />
                    <span>{alertCount > 0 ? `${alertCount} alerts` : 'No alerts'}</span>
                  </Link>
                  <Link to="/dashboard/account" className="flex items-center gap-2 rounded-md border border-border bg-panel-elevated px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-card-hover">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] font-semibold">
                      {initials}
                    </span>
                    <span className="hidden max-w-[160px] truncate text-left xl:block">
                      <span className="block text-xs uppercase tracking-[0.18em] text-muted">Operator</span>
                      <span className="block truncate font-medium text-foreground">{displayName}</span>
                    </span>
                  </Link>
                  <button type="button" onClick={() => void signOut().then(() => window.location.assign('/login'))} className={opsButtonClassName({ tone: 'ghost' })}>
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <nav aria-label="Operator navigation" className="overflow-x-auto border-t border-border px-3 py-2 lg:hidden">
              <div className="flex gap-2">
                {opsConsolePages.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={isPathActive(pathname, item.to) ? 'page' : undefined}
                    className={cn(
                      'whitespace-nowrap rounded-md border px-3 py-2 text-sm transition-colors',
                      isPathActive(pathname, item.to)
                        ? 'border-primary/30 bg-primary/12 text-foreground'
                        : 'border-border bg-panel-muted text-muted hover:bg-card-hover hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </header>

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
    <section className="ops-panel rounded-xl px-5 py-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground lg:text-[2.25rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {metrics.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
  <div className={cn('rounded-lg border px-4 py-4', tone === 'neutral' ? 'border-border bg-panel-muted' : opsStatusToneClassName[tone])}>
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
    <p className="mt-2 font-mono text-2xl font-semibold text-foreground">{value}</p>
    <p className="mt-2 text-sm text-muted">{detail}</p>
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
  <section className={cn('ops-panel rounded-xl px-5 py-5', className)}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {meta || actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {meta ? <div className="text-[10px] uppercase tracking-[0.18em] text-muted">{meta}</div> : null}
          {actions}
        </div>
      ) : null}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

export const OpsToolbar = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('flex flex-col gap-3 rounded-lg border border-border bg-panel-muted px-4 py-3 lg:flex-row lg:items-center lg:justify-between', className)}>
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
      'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
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
  <section className={cn('rounded-xl border px-5 py-4', opsStatusToneClassName[tone])}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-1 text-sm leading-6 text-foreground/88">{body}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  </section>
);

export const OpsLoadingState = ({ label = 'Loading operator console' }: { label?: string }) => (
  <div className="ops-panel flex min-h-[220px] items-center justify-center rounded-xl px-5 py-5">
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
      'rounded-xl border px-5 py-5',
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
  <div className="rounded-lg border border-dashed border-border bg-panel-muted px-4 py-6 text-sm">
    <p className="font-medium text-foreground">{title}</p>
    <div className="mt-1 leading-6 text-muted">{body}</div>
  </div>
);

export const OpsTable = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('overflow-hidden rounded-lg border border-border bg-panel-muted', className)}>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  </div>
);

export const OpsTableHead = ({ children }: { children: ReactNode }) => (
  <thead className="border-b border-border bg-black/10">{children}</thead>
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
      'border-b border-border/70 last:border-b-0',
      onClick && 'cursor-pointer transition-colors hover:bg-white/[0.04]',
      active && 'bg-primary/10',
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
