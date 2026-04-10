import { Link } from '@tanstack/react-router';
import {
  Activity,
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
  type OpsOverview,
  type OpsServiceHealthResponse,
  useOpsOverview,
  useOpsServiceHealth,
} from '@/surfaces/app/lib/ops';

const dashboardLinks = [
  { to: '/dashboard/media', icon: RadioTower, label: 'Media', description: 'Open OmniLux-managed channels, radio, and first-party cloud experiences.' },
  { to: '/dashboard/servers', icon: Server, label: 'Servers', description: 'Claimed OmniLux installs, relay state, and companion access.' },
  { to: '/dashboard/devices', icon: Smartphone, label: 'Devices', description: 'Sessions signed into your OmniLux Cloud account.' },
  { to: '/dashboard/subscription', icon: CreditCard, label: 'Billing', description: 'Plan status for relay, remote access, and paid cloud features.' },
  { to: '/dashboard/account', icon: User, label: 'Account', description: 'Identity, security, and profile details for your cloud account.' },
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
          description: 'Open the dedicated operator workspace for accounts, control plane, logs, and service health.',
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
      />
    );
  }

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Cloud Console</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Overview</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {displayName}, this is the cloud side of OmniLux. Your libraries and playback stay on your self-hosted server; this console manages identity, billing, and remote services around it.
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
            <Link
              key={to}
              to={to}
              className="group rounded-xl surface-soft p-5 transition-colors hover:bg-surface"
            >
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
                    detail: customerOverview?.platform.managedMediaPolicyDescription ??
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
                    detail: customerOverview?.platform.relayAccessPolicyDescription ??
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
                        body:
                          customerOverview?.access.managedMediaEntitled
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
                          (customerOverview?.metrics.selfHostedServersTotal ?? 0) > 0 ? 'Review servers' : 'Claim a server',
                      },
                      {
                        complete: customerOverview?.access.relayRemoteAccessEntitled ?? false,
                        label: 'Upgrade only if your self-hosted relay path needs it',
                        body:
                          customerOverview?.access.relayRemoteAccessEntitled
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
                    OmniLux now has an explicit hosted product model. Keep the customer-facing promise consistent
                    across billing, media, self-hosting, and future native clients.
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
              Secondary cloud workflows live here so the main navigation stays focused on account management, servers, billing, and remote access.
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
}

const formatOpsMetric = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

const formatOpsTimestamp = (value: string | null | undefined, fallback: string) =>
  value ? new Date(value).toLocaleString() : fallback;

const serviceStatusClassName = (status: OpsServiceHealthResponse['services'][number]['status']) =>
  status === 'online'
    ? 'bg-success/15 text-success'
    : status === 'degraded'
      ? 'bg-warning/15 text-warning'
      : 'bg-danger/15 text-danger';

function OpsDashboardView({
  displayName,
  opsOverview,
  isOpsOverviewLoading,
  opsOverviewError,
  opsServiceHealth,
  isOpsServiceHealthLoading,
  opsServiceHealthError,
}: OpsDashboardViewProps) {
  const services = opsServiceHealth?.services ?? [];
  const servicesOnline = services.filter((service) => service.status === 'online').length;
  const servicesNeedingAttention = services.filter((service) => service.status !== 'online').length;
  const incidentActive =
    opsOverview?.platform.managedMediaOperatingMode !== 'normal' ||
    (opsOverview?.platform.managedMediaIncidentMessage?.length ?? 0) > 0;
  const opsMetrics = [
    {
      label: 'Cloud accounts',
      value: formatOpsMetric(opsOverview?.metrics.profilesTotal),
      detail: `${opsOverview?.metrics.operatorsTotal ?? 0} operators`,
    },
    {
      label: 'Paid plans',
      value: formatOpsMetric(opsOverview?.metrics.activeSubscriptionsTotal),
      detail: `${opsOverview?.metrics.trialingSubscriptionsTotal ?? 0} trialing`,
    },
    {
      label: 'Self-hosted servers',
      value: formatOpsMetric(opsOverview?.metrics.selfHostedServersTotal),
      detail: `${opsOverview?.metrics.relayOnlineServersTotal ?? 0} relay online`,
    },
    {
      label: 'Needs attention',
      value: formatOpsMetric(opsOverview?.metrics.relayAttentionServersTotal),
      detail: 'Relay or reachability follow-up',
    },
    {
      label: 'Relay sessions',
      value: formatOpsMetric(opsOverview?.metrics.activeRelaySessionsTotal),
      detail: 'Currently live or granted',
    },
    {
      label: 'Support notes',
      value: formatOpsMetric(opsOverview?.metrics.supportNotesTotal),
      detail: 'Operator handoff context saved',
    },
  ] as const;
  const quickLinks = [
    {
      to: '/dashboard/accounts',
      label: 'Accounts',
      description: 'Open the operator account workspace for customer lookups, billing context, and linked server history.',
      icon: User,
    },
    {
      to: '/dashboard/logs',
      label: 'Logs',
      description: 'Audit sensitive operator actions, access changes, and control-plane motion in one timeline.',
      icon: Activity,
    },
    {
      to: '/dashboard/financials',
      label: 'Financials',
      description: 'Track plan coverage, trial exposure, and billing follow-up across the cloud account base.',
      icon: CreditCard,
    },
    {
      to: '/dashboard/staff',
      label: 'Staff',
      description: 'Keep the operator bench, MFA readiness, and recent session activity visible.',
      icon: ShieldCheck,
    },
    {
      to: '/dashboard/control-plane',
      label: 'Control Plane',
      description: 'Change managed media policy, relay access rules, and runtime advisory state.',
      icon: Server,
    },
    {
      to: '/dashboard/media-control',
      label: 'Media',
      description: 'Operate the managed runtime, its relay posture, and its current operator advisory.',
      icon: RadioTower,
    },
    {
      to: '/dashboard/health',
      label: 'Health',
      description: 'Watch every public OmniLux surface, with failures and runbooks in one lane.',
      icon: Waves,
    },
  ] as const;

  return (
    <div className="animate-fade-in px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[2200px] space-y-6">
        {incidentActive ? (
          <section className="rounded-[1.75rem] border border-warning/30 bg-warning/10 px-6 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warning">Managed media advisory</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">
                  {opsOverview?.platform.managedMediaOperatingModeLabel ?? 'Operator advisory active'}
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-foreground/86">
                  {opsOverview?.platform.managedMediaIncidentMessage || 'An operator advisory is active for the managed runtime.'}
                </p>
              </div>
              <Link
                to="/dashboard/control-plane"
                className="inline-flex shrink-0 items-center rounded-full border border-warning/40 bg-warning/12 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-warning/18"
              >
                Open control plane
              </Link>
            </div>
          </section>
        ) : null}

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02)_38%,rgba(255,126,61,0.08)_100%)] px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:px-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_top,rgba(255,126,61,0.22),transparent_56%)] xl:block" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
            <div className="space-y-6">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Operator flight deck</p>
                <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  Run OmniLux from one wide view.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                  {displayName}, keep customer access, managed runtime posture, relay pressure, and account motion in
                  frame without bouncing through stacked admin cards.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/dashboard/accounts"
                  search={{ lookup: undefined } as never}
                  className="inline-flex items-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_18px_48px_rgba(242,228,207,0.14)] transition-transform hover:-translate-y-0.5"
                >
                  Open accounts
                </Link>
                <Link
                  to="/dashboard/control-plane"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                >
                  Open control plane
                </Link>
                <a
                  href={buildAppHref('/dashboard')}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                >
                  <span>Open cloud app</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>

              {isOpsOverviewLoading ? (
                <div className="grid gap-px overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-6">
                  {[1, 2, 3, 4, 5, 6].map((index) => (
                    <div key={index} className="h-28 animate-pulse bg-black/20" />
                  ))}
                </div>
              ) : opsOverviewError ? (
                <div className="rounded-[1.5rem] border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-foreground">
                  {opsOverviewError instanceof Error ? opsOverviewError.message : 'Failed to load the operator overview.'}
                </div>
              ) : (
                <div className="grid gap-px overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-6">
                  {opsMetrics.map(({ label, value, detail }) => (
                    <div key={label} className="bg-black/18 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
                      <p className="mt-3 font-display text-3xl font-bold text-foreground">{value}</p>
                      <p className="mt-2 text-sm text-muted">{detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="rounded-[1.75rem] border border-white/10 bg-black/22 p-5 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Live pulse</p>
                  <p className="mt-2 text-sm text-muted">
                    Updated{' '}
                    {formatOpsTimestamp(
                      opsServiceHealth?.checkedAt ?? opsOverview?.platform.updatedAt,
                      'just now',
                    )}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/84">
                  {services.length > 0 ? `${servicesOnline}/${services.length} healthy` : 'Live monitoring'}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Managed runtime</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {opsOverview?.platform.managedMediaOperatingModeLabel ?? 'Normal operation'}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {opsOverview?.managedMediaRuntime?.name ?? 'Waiting for a managed runtime registration.'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Managed media access</p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {opsOverview?.platform.managedMediaPolicyLabel ?? 'Not available'}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {opsOverview?.platform.managedMediaPolicyDescription ?? 'Managed media rules are not available yet.'}
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Relay posture</p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {opsOverview?.platform.relayAccessPolicyLabel ?? 'Not available'}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {opsOverview?.platform.relayAccessPolicyDescription ?? 'Relay access rules are not available yet.'}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Recent movement</p>
                  <div className="mt-3 space-y-2 text-sm text-muted">
                    <div className="flex items-center justify-between gap-3">
                      <span>Services needing follow-up</span>
                      <span className="font-semibold text-foreground">{servicesNeedingAttention}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Access changes this week</span>
                      <span className="font-semibold text-foreground">
                        {formatOpsMetric(opsOverview?.metrics.recentAccessChangesTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Policy changes this week</span>
                      <span className="font-semibold text-foreground">
                        {formatOpsMetric(opsOverview?.metrics.recentPolicyChangesTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)]">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Public surfaces</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Service health</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  Watch the hosted app, ops console, relay, managed runtime, and cloud services in one continuous sweep.
                </p>
              </div>
              <Link
                to="/dashboard/logs"
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
              >
                Open logs
              </Link>
            </div>

            {isOpsServiceHealthLoading ? (
              <div className="mt-5 space-y-3">
                {[1, 2, 3, 4, 5, 6].map((index) => (
                  <div key={index} className="h-24 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
                ))}
              </div>
            ) : opsServiceHealthError ? (
              <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-foreground">
                {opsServiceHealthError instanceof Error
                  ? opsServiceHealthError.message
                  : 'Failed to load public service health.'}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {services.map((service) => (
                  <div
                    key={service.key}
                    className="grid gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.035] px-4 py-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)_auto] lg:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{service.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
                        Checked {formatOpsTimestamp(service.checkedAt, 'just now')}
                      </p>
                    </div>
                    <p className="text-sm text-muted">{service.detail}</p>
                    <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">
                        {service.responseTimeMs !== null ? `${service.responseTimeMs} ms` : 'Internal check'}
                      </span>
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">
                        {service.httpStatus !== null ? `HTTP ${service.httpStatus}` : 'No HTTP code'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${serviceStatusClassName(service.status)}`}
                      >
                        {service.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
              <div className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-accent" />
                <h2 className="font-display text-2xl font-bold text-foreground">Managed runtime focus</h2>
              </div>
              {isOpsOverviewLoading ? (
                <div className="mt-5 h-44 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
              ) : opsOverview?.managedMediaRuntime ? (
                <>
                  <p className="mt-3 text-sm text-muted">
                    {opsOverview.managedMediaRuntime.name} is the first-party runtime serving OmniLux-managed media.
                  </p>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Public origin</dt>
                      <dd className="mt-2 text-sm font-medium text-foreground">
                        {opsOverview.managedMediaRuntime.publicOrigin ?? 'Not set'}
                      </dd>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Relay status</dt>
                      <dd className="mt-2 text-sm font-medium capitalize text-foreground">
                        {opsOverview.managedMediaRuntime.relayStatus ?? 'unknown'}
                      </dd>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Last seen</dt>
                      <dd className="mt-2 text-sm font-medium text-foreground">
                        {formatOpsTimestamp(opsOverview.managedMediaRuntime.lastSeenAt, 'No heartbeat yet')}
                      </dd>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Version</dt>
                      <dd className="mt-2 text-sm font-medium text-foreground">
                        {opsOverview.managedMediaRuntime.version ?? 'Unknown'}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5 text-sm text-muted">
                  No managed runtime is registered yet. Once it checks in, its origin, relay status, and heartbeat will show up here.
                </div>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                <h2 className="font-display text-2xl font-bold text-foreground">Operator cadence</h2>
              </div>
              <p className="mt-3 text-sm text-muted">
                Keep the shift grounded in customer impact, not internal mechanics.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-muted">
                {[
                  'Start in the account workspace so account state, billing, and linked servers line up before you change anything.',
                  'Only publish a managed media advisory once customer impact is clear and the next update is known.',
                  'Use the audit timeline to verify that account notes and high-impact changes are landing exactly where the next operator expects them.',
                  'Step up MFA before touching live access, relay rules, or runtime posture.',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Platform posture</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Access rules in plain view</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              The ops surface should make it obvious who gets managed media, how remote relay is gated, and how quickly that policy is moving.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Managed media access</p>
                <h3 className="mt-3 text-xl font-semibold text-foreground">
                  {opsOverview?.platform.managedMediaPolicyLabel ?? 'Not available'}
                </h3>
                <p className="mt-3 text-sm text-muted">
                  {opsOverview?.platform.managedMediaPolicyDescription ?? 'Managed media policy details are not available yet.'}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Self-hosted relay</p>
                <h3 className="mt-3 text-xl font-semibold text-foreground">
                  {opsOverview?.platform.relayAccessPolicyLabel ?? 'Not available'}
                </h3>
                <p className="mt-3 text-sm text-muted">
                  {opsOverview?.platform.relayAccessPolicyDescription ?? 'Relay policy details are not available yet.'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Operators</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatOpsMetric(opsOverview?.metrics.operatorsTotal)}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Entitled accounts</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatOpsMetric(opsOverview?.metrics.explicitlyEntitledProfilesTotal)}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Last policy update</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {formatOpsTimestamp(opsOverview?.platform.updatedAt, 'Waiting for first update')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {quickLinks.map(({ to, icon: Icon, label, description }) => (
              <Link
                key={`${to}:${label}`}
                to={to}
                className="group flex items-start justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.06]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-accent" />
                    <h2 className="text-lg font-semibold text-foreground">{label}</h2>
                  </div>
                  <p className="mt-2 max-w-lg text-sm text-muted">{description}</p>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-foreground/68 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            ))}

            <a
              href={buildAppHref('/dashboard')}
              className="group flex items-start justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.06]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <RadioTower className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold text-foreground">Customer cloud app</h2>
                </div>
                <p className="mt-2 max-w-lg text-sm text-muted">
                  Jump to the customer-facing account surface for billing, linked servers, and the regular cloud journey.
                </p>
              </div>
              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-foreground/68 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
