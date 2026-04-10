import { Link } from '@tanstack/react-router';
import {
  ArrowUpRight,
  CreditCard,
  Puzzle,
  RadioTower,
  Server,
  ShieldCheck,
  Smartphone,
  User,
  Waves,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { buildAppHref, buildDocsHref, getCurrentSiteSurface } from '@/lib/site-surface';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { useCustomerOverview } from '@/surfaces/app/lib/customer-overview';
import {
  type OperatorActionAuditRow,
  type OpsOverview,
  type OpsServiceHealthResponse,
  useOperatorActionAuditLog,
  useOpsOverview,
  useOpsServiceHealth,
} from '@/surfaces/app/lib/ops';
import {
  formatTimestamp,
  renderOperatorActionSummary,
  renderProfileLabel,
} from '@/surfaces/app/lib/ops-formatters';
import {
  OpsCallout,
  OpsEmptyState,
  OpsPageShell,
  OpsPanel,
  OpsStatusBadge,
  OpsTable,
  OpsTableBody,
  OpsTableCell,
  OpsTableHead,
  OpsTableHeaderCell,
  OpsTableRow,
  opsButtonClassName,
  opsServiceTone,
} from '@/surfaces/app/pages/dashboard/OpsPageShell';

const dashboardLinks = [
  {
    to: '/dashboard/media',
    icon: RadioTower,
    label: 'Media',
    description: 'Open OmniLux-managed channels, radio, and first-party cloud experiences.',
  },
  {
    to: '/dashboard/servers',
    icon: Server,
    label: 'Servers',
    description: 'Claimed OmniLux installs, relay state, and companion access.',
  },
  {
    to: '/dashboard/devices',
    icon: Smartphone,
    label: 'Devices',
    description: 'Sessions signed into your OmniLux Cloud account.',
  },
  {
    to: '/dashboard/subscription',
    icon: CreditCard,
    label: 'Billing',
    description: 'Plan status for relay, remote access, and paid cloud features.',
  },
  {
    to: '/dashboard/account',
    icon: User,
    label: 'Account',
    description: 'Identity, security, and profile details for your cloud account.',
  },
] as const;

const secondaryLinks = [
  {
    to: '/dashboard/submit-plugin',
    icon: Puzzle,
    label: 'Developer Tools',
    description: 'Submit marketplace plugins and manage account-linked publishing metadata.',
  },
] as const;

export const Dashboard = () => {
  const { user } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const currentSurface =
    typeof window === 'undefined' ? 'app' : getCurrentSiteSurface(window.location.hostname);
  const isOpsSurface = currentSurface === 'ops';
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'User';
  const operatorLinks = accessProfile?.isOperator
    ? [
        {
          to: '/dashboard/accounts',
          icon: ShieldCheck,
          label: 'Ops Console',
          description:
            'Open the dedicated operator workspace for accounts, control plane, logs, and service health.',
        },
      ]
    : [];
  const {
    data: opsOverview,
    isLoading: isOpsOverviewLoading,
    error: opsOverviewError,
  } = useOpsOverview(Boolean(isOpsSurface && accessProfile?.isOperator));
  const {
    data: opsServiceHealth,
    isLoading: isOpsServiceHealthLoading,
    error: opsServiceHealthError,
  } = useOpsServiceHealth(Boolean(isOpsSurface && accessProfile?.isOperator));
  const {
    data: operatorActionAuditLog,
    isLoading: isOperatorActionAuditLoading,
  } = useOperatorActionAuditLog(Boolean(isOpsSurface && accessProfile?.isOperator));
  const {
    data: customerOverview,
    isLoading: isCustomerOverviewLoading,
    error: customerOverviewError,
  } = useCustomerOverview();

  if (isOpsSurface) {
    return (
      <OpsDashboardView
        displayName={displayName}
        opsOverview={opsOverview}
        isOpsOverviewLoading={isOpsOverviewLoading}
        opsOverviewError={opsOverviewError}
        opsServiceHealth={opsServiceHealth}
        isOpsServiceHealthLoading={isOpsServiceHealthLoading}
        opsServiceHealthError={opsServiceHealthError}
        operatorActionAuditLog={operatorActionAuditLog}
        isOperatorActionAuditLoading={isOperatorActionAuditLoading}
      />
    );
  }

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Cloud Console</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Overview</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {displayName}, this is the cloud side of OmniLux. Your libraries and playback stay on your self-hosted
          server; this console manages identity, billing, and remote services around it.
        </p>

        {customerOverview?.platform.managedMediaOperatingMode !== 'normal' ||
        customerOverview?.platform.managedMediaIncidentMessage ? (
          <div className="mt-8 rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning">Managed Media Status</p>
            <p className="mt-2 text-lg font-semibold">
              {customerOverview?.platform.managedMediaOperatingModeLabel ?? 'Managed media status updated'}
            </p>
            <p className="mt-2 text-muted">
              {customerOverview?.platform.managedMediaIncidentMessage ||
                'Operators have published a non-normal operating state for the first-party media runtime.'}
            </p>
          </div>
        ) : null}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardLinks.map(({ to, icon: Icon, label, description }) => (
            <Link key={to} to={to} className="group rounded-xl surface-soft p-5 transition-colors hover:bg-surface">
              <Icon className="mb-3 h-6 w-6 text-accent" />
              <h2 className="font-semibold text-foreground">{label}</h2>
              <p className="mt-1 text-sm text-muted">{description}</p>
            </Link>
          ))}
        </div>

        <section className="mt-12">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold text-foreground">Core Journey</h2>
            <p className="mt-2 text-sm text-muted">
              The hosted app has one job: make the cloud side of OmniLux obvious. Use this checklist to move from
              account creation to first-party media, then into self-hosted and relay workflows only when you need them.
            </p>
          </div>

          {isCustomerOverviewLoading ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="h-36 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : customerOverviewError ? (
            <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
              {customerOverviewError instanceof Error
                ? customerOverviewError.message
                : 'Customer overview could not be loaded.'}
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                {[
                  {
                    title: 'Cloud account',
                    value: 'Ready',
                    detail: 'Identity, billing, and device sign-in are active through OmniLux Cloud.',
                  },
                  {
                    title: 'Managed media',
                    value: customerOverview?.access.managedMediaEntitled ? 'Included' : 'Restricted',
                    detail:
                      customerOverview?.platform.managedMediaPolicyDescription ??
                      'First-party managed media follows the current platform policy.',
                  },
                  {
                    title: 'Self-hosted servers',
                    value: String(customerOverview?.metrics.selfHostedServersTotal ?? 0),
                    detail:
                      (customerOverview?.metrics.selfHostedServersTotal ?? 0) > 0
                        ? 'Your cloud account is already linked to one or more self-hosted runtimes.'
                        : 'Claim a server when you want private libraries, invites, or relay-backed remote access.',
                  },
                  {
                    title: 'Remote relay',
                    value: customerOverview?.access.relayRemoteAccessEntitled ? 'Ready' : 'Policy-gated',
                    detail:
                      customerOverview?.platform.relayAccessPolicyDescription ??
                      'Relay access to self-hosted servers follows the current platform policy.',
                  },
                ].map(({ title, value, detail }) => (
                  <div key={title} className="rounded-xl border border-border bg-background p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{title}</p>
                    <p className="mt-3 font-display text-3xl font-bold text-foreground">{value}</p>
                    <p className="mt-3 text-sm text-muted">{detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
                <div className="rounded-xl surface-soft p-6">
                  <h3 className="font-semibold text-foreground">Recommended next actions</h3>
                  <ul className="mt-4 space-y-3">
                    {[
                      {
                        complete: true,
                        label: 'Use managed media from your cloud account',
                        body: customerOverview?.access.managedMediaEntitled
                          ? 'You can open OmniLux Media immediately from the hosted app.'
                          : 'This account is not currently entitled to managed media.',
                        actionHref: '/dashboard/media',
                        actionLabel: 'Open media',
                      },
                      {
                        complete: (customerOverview?.metrics.selfHostedServersTotal ?? 0) > 0,
                        label: 'Claim a self-hosted server when you want your own libraries',
                        body:
                          (customerOverview?.metrics.selfHostedServersTotal ?? 0) > 0
                            ? 'At least one self-hosted runtime is already linked to this cloud account.'
                            : 'Claiming a server adds your private libraries, household sharing, and relay-backed remote services.',
                        actionHref: '/dashboard/claim',
                        actionLabel:
                          (customerOverview?.metrics.selfHostedServersTotal ?? 0) > 0
                            ? 'Review servers'
                            : 'Claim a server',
                      },
                      {
                        complete: customerOverview?.access.relayRemoteAccessEntitled ?? false,
                        label: 'Upgrade only if your self-hosted relay path needs it',
                        body: customerOverview?.access.relayRemoteAccessEntitled
                          ? 'This account already satisfies the current relay access rule.'
                          : customerOverview?.platform.relayAccessPolicyDescription ??
                            'Relay access to self-hosted servers is currently policy-gated.',
                        actionHref: '/dashboard/subscription',
                        actionLabel: 'Review billing',
                      },
                      {
                        complete: false,
                        label: 'Bring devices and native clients in after the web flow feels solid',
                        body:
                          'Use the client-readiness contract before pushing Android, iOS, TV, or other companion surfaces forward.',
                        actionHref: buildDocsHref('/guide/client-readiness'),
                        actionLabel: 'Read client readiness',
                        external: true,
                      },
                    ].map(({ complete, label, body, actionHref, actionLabel, external }) => (
                      <li key={label} className="rounded-xl bg-surface/60 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="max-w-2xl">
                            <p className="text-sm font-semibold text-foreground">
                              {label}{' '}
                              <span className="ml-2 text-xs uppercase tracking-[0.16em] text-muted">
                                {complete ? 'complete' : 'next'}
                              </span>
                            </p>
                            <p className="mt-2 text-sm text-muted">{body}</p>
                          </div>
                          {external ? (
                            <a
                              href={actionHref}
                              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                            >
                              {actionLabel}
                            </a>
                          ) : (
                            <Link
                              to={actionHref as '/dashboard/media' | '/dashboard/claim' | '/dashboard/subscription'}
                              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                            >
                              {actionLabel}
                            </Link>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-background p-6">
                  <h3 className="font-semibold text-foreground">Product contract</h3>
                  <p className="mt-2 text-sm text-muted">
                    OmniLux now has an explicit hosted product model. Keep the customer-facing promise consistent across
                    billing, media, self-hosting, and future native clients.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-muted">
                    {[
                      'Cloud accounts get first-party managed media according to the current platform policy.',
                      'Self-hosted servers remain directly reachable by their owners outside OmniLux edge.',
                      'Relay billing only applies to cloud-mediated remote access for self-hosted servers.',
                    ].map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={buildDocsHref('/guide/cloud-product-contract')}
                      className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                    >
                      Review contract
                    </a>
                    <a
                      href={buildDocsHref('/guide/managed-media')}
                      className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                    >
                      Managed media guide
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="mt-12">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold text-foreground">Developer Area</h2>
            <p className="mt-2 text-sm text-muted">
              Secondary cloud workflows live here so the main navigation stays focused on account management, servers,
              billing, and remote access.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {secondaryLinks.map(({ to, icon: Icon, label, description }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-xl border border-border bg-background p-5 transition-colors hover:bg-surface"
              >
                <Icon className="mb-3 h-6 w-6 text-accent" />
                <h3 className="font-semibold text-foreground">{label}</h3>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </Link>
            ))}
            {operatorLinks.map(({ to, icon: Icon, label, description }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-xl border border-border bg-background p-5 transition-colors hover:bg-surface"
              >
                <Icon className="mb-3 h-6 w-6 text-accent" />
                <h3 className="font-semibold text-foreground">{label}</h3>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

interface OpsDashboardViewProps {
  displayName: string;
  opsOverview: OpsOverview | undefined;
  isOpsOverviewLoading: boolean;
  opsOverviewError: unknown;
  opsServiceHealth: OpsServiceHealthResponse | undefined;
  isOpsServiceHealthLoading: boolean;
  opsServiceHealthError: unknown;
  operatorActionAuditLog: OperatorActionAuditRow[] | undefined;
  isOperatorActionAuditLoading: boolean;
}

const formatOpsMetric = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

const formatOpsTimestamp = (value: string | null | undefined, fallback: string) =>
  value ? new Date(value).toLocaleString() : fallback;

function OpsDashboardView({
  displayName,
  opsOverview,
  isOpsOverviewLoading,
  opsOverviewError,
  opsServiceHealth,
  isOpsServiceHealthLoading,
  opsServiceHealthError,
  operatorActionAuditLog,
  isOperatorActionAuditLoading,
}: OpsDashboardViewProps) {
  const services = opsServiceHealth?.services ?? [];
  const servicesOnline = services.filter((service) => service.status === 'online').length;
  const servicesNeedingAttention = services.filter((service) => service.status !== 'online').length;
  const servicesOffline = services.filter((service) => service.status === 'error').length;
  const incidentActive =
    opsOverview?.platform.managedMediaOperatingMode !== 'normal' ||
    (opsOverview?.platform.managedMediaIncidentMessage?.length ?? 0) > 0;
  const topAttentionServices = [...services]
    .sort((left, right) => {
      const rank = (status: string) => (status === 'error' ? 0 : status === 'degraded' ? 1 : 2);
      return rank(left.status) - rank(right.status);
    })
    .slice(0, 5);
  const recentActions = operatorActionAuditLog?.slice(0, 6) ?? [];
  const opsMetrics = [
    {
      label: 'Cloud accounts',
      value: formatOpsMetric(opsOverview?.metrics.profilesTotal),
      detail: `${opsOverview?.metrics.operatorsTotal ?? 0} operators`,
      tone: 'neutral' as const,
    },
    {
      label: 'Paid plans',
      value: formatOpsMetric(opsOverview?.metrics.activeSubscriptionsTotal),
      detail: `${opsOverview?.metrics.trialingSubscriptionsTotal ?? 0} trialing`,
      tone: 'neutral' as const,
    },
    {
      label: 'Self-hosted servers',
      value: formatOpsMetric(opsOverview?.metrics.selfHostedServersTotal),
      detail: `${opsOverview?.metrics.relayOnlineServersTotal ?? 0} relay online`,
      tone: 'info' as const,
    },
    {
      label: 'Attention queue',
      value: formatOpsMetric((opsOverview?.metrics.relayAttentionServersTotal ?? 0) + servicesNeedingAttention),
      detail: 'Relay, health, or runtime follow-up',
      tone: servicesNeedingAttention > 0 ? ('warning' as const) : ('neutral' as const),
    },
    {
      label: 'Relay sessions',
      value: formatOpsMetric(opsOverview?.metrics.activeRelaySessionsTotal),
      detail: 'Currently live or granted',
      tone: 'neutral' as const,
    },
    {
      label: 'Support notes',
      value: formatOpsMetric(opsOverview?.metrics.supportNotesTotal),
      detail: 'Operator handoff context saved',
      tone: 'neutral' as const,
    },
  ] as const;
  const quickLinks = [
    {
      to: '/dashboard/accounts',
      label: 'Accounts',
      description:
        'Open the operator account workspace for customer lookups, billing context, and linked server history.',
      icon: User,
    },
    {
      to: '/dashboard/logs',
      label: 'Audit Trail',
      description:
        'Audit sensitive operator actions, access changes, and control-plane motion in one timeline.',
      icon: ShieldCheck,
    },
    {
      to: '/dashboard/financials',
      label: 'Financials',
      description:
        'Track plan coverage, trial exposure, and billing follow-up across the cloud account base.',
      icon: CreditCard,
    },
    {
      to: '/dashboard/control-plane',
      label: 'Control Plane',
      description: 'Change managed media policy, relay access rules, and runtime advisory state.',
      icon: Server,
    },
    {
      to: '/dashboard/media-control',
      label: 'Managed Runtime',
      description: 'Operate the managed runtime, its relay posture, and its current operator advisory.',
      icon: RadioTower,
    },
    {
      to: '/dashboard/health',
      label: 'Service Health',
      description: 'Watch every public OmniLux surface, with failures and runbooks in one lane.',
      icon: Waves,
    },
  ] as const;

  return (
    <OpsPageShell
      eyebrow="Overview"
      title="Operate OmniLux from a single command surface."
      description={`${displayName}, use this console to scan platform health, customer pressure, runtime state, and recent operator actions without bouncing between disconnected admin cards.`}
      actions={
        <>
          <Link
            to="/dashboard/accounts"
            search={{ lookup: undefined } as never}
            className={opsButtonClassName({ tone: 'primary' })}
          >
            Open accounts
          </Link>
          <Link to="/dashboard/control-plane" className={opsButtonClassName({ tone: 'secondary' })}>
            Control plane
          </Link>
          <a href={buildAppHref('/dashboard')} className={opsButtonClassName({ tone: 'ghost' })}>
            <span>Cloud app</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </>
      }
      metrics={opsMetrics}
    >
      {incidentActive ? (
        <OpsCallout
          tone="warning"
          title={opsOverview?.platform.managedMediaOperatingModeLabel ?? 'Managed runtime advisory'}
          body={
            opsOverview?.platform.managedMediaIncidentMessage ||
            'An operator advisory is active for the managed media runtime.'
          }
          action={
            <Link to="/dashboard/control-plane" className={opsButtonClassName({ tone: 'secondary' })}>
              Update advisory
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_380px]">
        <OpsPanel
          title="Immediate attention"
          description="Systems and workloads that currently deserve operator review."
          meta={
            services.length > 0
              ? `${servicesOnline}/${services.length} services healthy`
              : 'No live health samples'
          }
        >
          {isOpsServiceHealthLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="h-28 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : opsServiceHealthError ? (
            <OpsCallout
              tone="danger"
              title="Health signal unavailable"
              body={
                opsServiceHealthError instanceof Error
                  ? opsServiceHealthError.message
                  : 'Failed to load service health.'
              }
            />
          ) : topAttentionServices.length === 0 ? (
            <OpsEmptyState
              title="No health checks available"
              body="The overview will populate once operator health probes start returning data."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {topAttentionServices.map((service) => (
                <div key={service.key} className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{service.label}</p>
                      <p className="mt-1 text-sm text-muted">{service.detail}</p>
                    </div>
                    <OpsStatusBadge tone={opsServiceTone(service.status)}>{service.status}</OpsStatusBadge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border border-border bg-black/10 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Latency</p>
                      <p className="mt-1 font-mono text-foreground">
                        {service.responseTimeMs !== null ? `${service.responseTimeMs} ms` : 'n/a'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-black/10 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">HTTP</p>
                      <p className="mt-1 font-mono text-foreground">
                        {service.httpStatus !== null ? `HTTP ${service.httpStatus}` : 'n/a'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </OpsPanel>

        <OpsPanel
          title="Control snapshot"
          description="Current policies and runtime state that shape operator decisions."
          meta={`Updated ${formatOpsTimestamp(opsOverview?.platform.updatedAt, 'recently')}`}
        >
          {isOpsOverviewLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-20 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : opsOverviewError ? (
            <OpsCallout
              tone="danger"
              title="Overview unavailable"
              body={
                opsOverviewError instanceof Error
                  ? opsOverviewError.message
                  : 'Failed to load the operator overview.'
              }
            />
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Managed media policy</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {opsOverview?.platform.managedMediaPolicyLabel ?? 'Unknown'}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {opsOverview?.platform.managedMediaPolicyDescription ?? 'Policy description unavailable.'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Relay access policy</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {opsOverview?.platform.relayAccessPolicyLabel ?? 'Unknown'}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {opsOverview?.platform.relayAccessPolicyDescription ?? 'Relay policy description unavailable.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Managed runtime</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {opsOverview?.managedMediaRuntime?.name ?? 'Not registered'}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {opsOverview?.managedMediaRuntime?.publicOrigin ?? 'No public origin'}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Service alerts</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-foreground">{servicesNeedingAttention}</p>
                  <p className="mt-1 text-sm text-muted">{servicesOffline} failing probes</p>
                </div>
              </div>
            </div>
          )}
        </OpsPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <OpsPanel
          title="Recent operator activity"
          description="Last high-signal actions across account, relay, and control-plane workflows."
          meta={isOperatorActionAuditLoading ? 'Refreshing activity' : `${recentActions.length} recent events`}
        >
          {isOperatorActionAuditLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : recentActions.length === 0 ? (
            <OpsEmptyState
              title="No recent operator actions"
              body="Sensitive actions will appear here as soon as account lookups or policy changes are recorded."
            />
          ) : (
            <OpsTable>
              <OpsTableHead>
                <tr>
                  <OpsTableHeaderCell>Action</OpsTableHeaderCell>
                  <OpsTableHeaderCell>Actor</OpsTableHeaderCell>
                  <OpsTableHeaderCell>Source</OpsTableHeaderCell>
                  <OpsTableHeaderCell align="right">When</OpsTableHeaderCell>
                </tr>
              </OpsTableHead>
              <OpsTableBody>
                {recentActions.map((row) => (
                  <OpsTableRow key={row.id}>
                    <OpsTableCell>
                      <p className="font-medium text-foreground">{renderOperatorActionSummary(row)}</p>
                    </OpsTableCell>
                    <OpsTableCell>{renderProfileLabel(row.actor)}</OpsTableCell>
                    <OpsTableCell className="text-muted">{row.source}</OpsTableCell>
                    <OpsTableCell align="right" className="text-muted">
                      {formatTimestamp(row.createdAt)}
                    </OpsTableCell>
                  </OpsTableRow>
                ))}
              </OpsTableBody>
            </OpsTable>
          )}
        </OpsPanel>

        <OpsPanel
          title="Operator lanes"
          description="Fast entry points for the workflows that matter most during daily operations."
        >
          <div className="space-y-3">
            {quickLinks.map(({ to, label, description, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-start gap-3 rounded-lg border border-border bg-panel-muted px-4 py-4 transition-colors hover:bg-card-hover"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-black/10 text-info">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </OpsPanel>
      </div>
    </OpsPageShell>
  );
}
