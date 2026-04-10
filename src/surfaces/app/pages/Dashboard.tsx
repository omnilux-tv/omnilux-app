import { Link } from '@tanstack/react-router';
import {
  Activity,
  CreditCard,
  Puzzle,
  Server,
  ShieldCheck,
  Smartphone,
  User,
  Waves,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { buildAppHref, getCurrentSiteSurface } from '@/lib/site-surface';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { useOpsOverview, useOpsServiceHealth } from '@/surfaces/app/lib/ops';

const dashboardLinks = [
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
          to: '/dashboard/operators',
          icon: ShieldCheck,
          label: 'Operator Access',
          description: 'Manage managed-media entitlements and OmniLux Ops console access.',
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

  if (isOpsSurface) {
    const opsLinks = [
      {
        to: '/dashboard/operators',
        icon: ShieldCheck,
        label: 'Policy & Access',
        description: 'Manage internal operator accounts, managed media policy, support lookup, and audit history.',
      },
      {
        to: '/dashboard/account',
        icon: User,
        label: 'Admin Account',
        description: 'Review the credentials, password, and profile settings for your operator identity.',
      },
    ] as const;

    const opsMetricCards = [
      {
        icon: User,
        label: 'Cloud Profiles',
        value: opsOverview?.metrics.profilesTotal ?? '—',
        detail: `${opsOverview?.metrics.operatorsTotal ?? 0} operators`,
      },
      {
        icon: CreditCard,
        label: 'Active Billing',
        value: opsOverview?.metrics.activeSubscriptionsTotal ?? '—',
        detail: `${opsOverview?.metrics.trialingSubscriptionsTotal ?? 0} trialing`,
      },
      {
        icon: Server,
        label: 'Self-Hosted Servers',
        value: opsOverview?.metrics.selfHostedServersTotal ?? '—',
        detail: `${opsOverview?.metrics.relayOnlineServersTotal ?? 0} relay online`,
      },
      {
        icon: Activity,
        label: 'Needs Attention',
        value: opsOverview?.metrics.relayAttentionServersTotal ?? '—',
        detail: 'Self-hosted relay issues',
      },
      {
        icon: Activity,
        label: 'Active Relay Sessions',
        value: opsOverview?.metrics.activeRelaySessionsTotal ?? '—',
        detail: 'Currently granted or active remote sessions',
      },
      {
        icon: ShieldCheck,
        label: 'Support Notes',
        value: opsOverview?.metrics.supportNotesTotal ?? '—',
        detail: 'Operator-only notes captured in support workflows',
      },
    ] as const;

    return (
      <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Operator Console</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">OmniLux Ops</h1>
          <p className="mt-2 max-w-2xl text-muted">
            {displayName}, this surface is reserved for OmniLux operators. Use it to administer managed access,
            entitlement policy, and internal cloud controls without mixing those tasks into the customer app.
          </p>

          {isOpsOverviewLoading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="h-28 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : opsOverviewError ? (
            <div className="mt-8 rounded-xl border border-danger/30 bg-danger/10 p-5 text-sm text-foreground">
              {opsOverviewError instanceof Error ? opsOverviewError.message : 'Failed to load operator overview.'}
            </div>
          ) : (
            <>
              {opsOverview?.platform.managedMediaOperatingMode !== 'normal' ||
              (opsOverview?.platform.managedMediaIncidentMessage?.length ?? 0) > 0 ? (
                <div className="mt-8 rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning">Managed Media Incident State</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {opsOverview?.platform.managedMediaOperatingModeLabel ?? 'Operating state updated'}
                  </p>
                  <p className="mt-2 text-muted">
                    {opsOverview?.platform.managedMediaIncidentMessage || 'No incident summary has been published yet.'}
                  </p>
                </div>
              ) : null}

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {opsMetricCards.map(({ icon: Icon, label, value, detail }) => (
                  <div key={label} className="rounded-xl surface-soft p-5">
                    <Icon className="h-5 w-5 text-accent" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
                    <p className="mt-2 font-display text-3xl font-bold text-foreground">{value}</p>
                    <p className="mt-2 text-sm text-muted">{detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-xl border border-border bg-background p-5">
                  <div className="flex items-center gap-2">
                    <Waves className="h-5 w-5 text-accent" />
                    <h2 className="font-semibold text-foreground">Managed Media Runtime</h2>
                  </div>
                  {opsOverview?.managedMediaRuntime ? (
                    <>
                      <p className="mt-3 text-sm text-muted">
                        {opsOverview.managedMediaRuntime.name} is registered as the first-party runtime behind
                        `media.omnilux.tv`.
                      </p>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-lg bg-surface/60 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Origin</dt>
                          <dd className="mt-2 text-foreground">
                            {opsOverview.managedMediaRuntime.publicOrigin ?? 'Not set'}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-surface/60 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Relay Status</dt>
                          <dd className="mt-2 capitalize text-foreground">
                            {opsOverview.managedMediaRuntime.relayStatus ?? 'unknown'}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-surface/60 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Last Seen</dt>
                          <dd className="mt-2 text-foreground">
                            {opsOverview.managedMediaRuntime.lastSeenAt
                              ? new Date(opsOverview.managedMediaRuntime.lastSeenAt).toLocaleString()
                              : 'No heartbeat yet'}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-surface/60 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Version</dt>
                          <dd className="mt-2 text-foreground">
                            {opsOverview.managedMediaRuntime.version ?? 'Unknown'}
                          </dd>
                        </div>
                      </dl>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-muted">
                      No managed media runtime is registered in the cloud control plane yet.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-background p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                    <h2 className="font-semibold text-foreground">Current Platform Policy</h2>
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Managed Media Access
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {opsOverview?.platform.managedMediaPolicyLabel ?? 'Unknown'}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {opsOverview?.platform.managedMediaPolicyDescription ??
                      'Managed media policy is currently unavailable.'}
                  </p>
                  <div className="mt-4 rounded-lg bg-surface/60 p-4 text-sm text-muted">
                    <p>{opsOverview?.metrics.recentAccessChangesTotal ?? 0} access changes in the last 7 days</p>
                    <p className="mt-2">{opsOverview?.metrics.recentPolicyChangesTotal ?? 0} policy changes in the last 7 days</p>
                    <p className="mt-2">
                      Service canary failures now auto-open or update a GitHub issue for incident follow-up.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-border bg-background p-5">
                <h2 className="font-semibold text-foreground">Public Service Health</h2>
                <p className="mt-2 text-sm text-muted">
                  Live reachability for the hosted app, operator console, relay, managed media runtime, and control plane.
                </p>

                {isOpsServiceHealthLoading ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((index) => (
                      <div key={index} className="h-24 animate-pulse rounded-xl bg-surface" />
                    ))}
                  </div>
                ) : opsServiceHealthError ? (
                  <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
                    {opsServiceHealthError instanceof Error
                      ? opsServiceHealthError.message
                      : 'Failed to load public service health.'}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {opsServiceHealth?.services.map((service) => (
                      <div key={service.key} className="rounded-xl bg-surface/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">{service.label}</p>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                              service.status === 'online'
                                ? 'bg-success/15 text-success'
                                : service.status === 'degraded'
                                  ? 'bg-warning/15 text-warning'
                                  : 'bg-danger/15 text-danger'
                            }`}
                          >
                            {service.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted">{service.detail}</p>
                        <p className="mt-3 text-xs uppercase tracking-wide text-muted">
                          {service.responseTimeMs !== null ? `${service.responseTimeMs} ms` : 'Internal check'} ·{' '}
                          {service.httpStatus !== null ? `HTTP ${service.httpStatus}` : 'No HTTP status'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {opsLinks.map(({ to, icon: Icon, label, description }) => (
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

          <div className="mt-8 rounded-xl border border-border bg-background p-5">
            <h2 className="font-semibold text-foreground">Need the customer-facing cloud app?</h2>
            <p className="mt-2 text-sm text-muted">
              Use the standard hosted app for billing, self-hosted servers, and customer account workflows.
            </p>
            <a
              href={buildAppHref('/dashboard')}
              className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Open OmniLux Cloud
            </a>
          </div>
        </div>
      </div>
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
