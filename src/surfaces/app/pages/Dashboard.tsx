import { Link } from '@tanstack/react-router';
import { CreditCard, Puzzle, RadioTower, Server, ShieldCheck, Smartphone, User } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { buildDocsHref, buildOpsHref } from '@/lib/site-surface';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { useCustomerOverview } from '@/surfaces/app/lib/customer-overview';

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
    description: 'Plan status for remote access, cloud continuity, and paid cloud features.',
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
    label: 'Plugin publishing',
    description: 'Submit marketplace plugins and manage account-linked publishing metadata.',
  },
] as const;

export const Dashboard = () => {
  const { user } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'User';
  const operatorLink = accessProfile?.isOperator
    ? {
        href: buildOpsHref('/dashboard'),
        icon: ShieldCheck,
        label: 'Ops Console',
        description: 'Open the separate operator workspace for support, policy, logs, and service health.',
      }
    : null;

  useEffect(() => {
    if (accessProfile?.isOperator) {
      window.location.replace(buildOpsHref('/dashboard'));
    }
  }, [accessProfile?.isOperator]);

  const {
    data: customerOverview,
    isLoading: isCustomerOverviewLoading,
    error: customerOverviewError,
  } = useCustomerOverview();

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium text-muted">Account</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Overview</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {displayName}, this is your OmniLux account hub. Your libraries and playback stay on your server, while this space handles identity, billing, and connected experiences around it.
        </p>

        {customerOverview?.platform.managedMediaOperatingMode !== 'normal' ||
        customerOverview?.platform.managedMediaIncidentMessage ? (
          <div className="mt-8 rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
            <p className="text-xs font-semibold text-warning">Managed media status</p>
            <p className="mt-2 text-lg font-semibold">
              {customerOverview?.platform.managedMediaOperatingModeLabel ?? 'Managed media status updated'}
            </p>
            <p className="mt-2 text-muted">
              {customerOverview?.platform.managedMediaIncidentMessage ||
                'OmniLux has published a service notice for OmniLux Media.'}
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
            <h2 className="font-display text-xl font-bold text-foreground">Core journey</h2>
            <p className="mt-2 text-sm text-muted">
              Move from account setup to managed media, then add self-hosted servers and relay access when they improve
              the way your household uses OmniLux.
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
                        ? 'Your cloud account is already linked to one or more OmniLux servers.'
                        : 'Claim a server when you want private libraries, cloud continuity, and relay access.',
                  },
                  {
                    title: 'Remote relay',
                    value: customerOverview?.access.relayRemoteAccessEntitled ? 'Included' : 'Plan required',
                    detail:
                      customerOverview?.platform.relayAccessPolicyDescription ??
                      'Relay sessions require an eligible account, an online tunnel, and a compatible OmniLux server.',
                  },
                ].map(({ title, value, detail }) => (
                  <div key={title} className="rounded-xl border border-border bg-background p-5">
                    <p className="text-xs font-semibold text-muted">{title}</p>
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
                          : 'Managed media is not currently available to this account.',
                        actionHref: '/dashboard/media',
                        actionLabel: 'Open media',
                      },
                      {
                        complete: (customerOverview?.metrics.selfHostedServersTotal ?? 0) > 0,
                        label: 'Claim a self-hosted server when you want your own libraries',
                        body:
                          (customerOverview?.metrics.selfHostedServersTotal ?? 0) > 0
                            ? 'At least one OmniLux server is already linked to this cloud account.'
                            : 'Claiming a server adds your private libraries, cloud continuity, and relay access.',
                        actionHref: '/dashboard/claim',
                        actionLabel:
                          (customerOverview?.metrics.selfHostedServersTotal ?? 0) > 0
                            ? 'Review servers'
                            : 'Claim a server',
                      },
                      {
                        complete: customerOverview?.access.relayRemoteAccessEntitled ?? false,
                        label: 'Upgrade only when a cloud feature needs it',
                        body: customerOverview?.access.relayRemoteAccessEntitled
                          ? 'This account already has remote relay access.'
                          : customerOverview?.platform.relayAccessPolicyDescription ??
                            'Remote relay for self-hosted servers requires an eligible cloud plan.',
                        actionHref: '/dashboard/subscription',
                        actionLabel: 'Review billing',
                      },
                      {
                        complete: false,
                        label: 'Add companion devices when your account is ready',
                        body:
                          'Use the client-readiness guide before adding Android, iOS, TV, or other companion surfaces.',
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
                              <span className="ml-2 text-xs text-muted">
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
                  <h3 className="font-semibold text-foreground">What stays clear</h3>
                  <p className="mt-2 text-sm text-muted">
                    OmniLux separates cloud convenience from local ownership, so billing, media access, and server control
                    stay understandable.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-muted">
                    {[
                      'Cloud accounts can use managed partner and studio media only when platform policy allows it.',
                      'Self-hosted servers remain directly reachable by their owners outside OmniLux edge.',
                      'Relay billing applies to OmniLux-managed remote access for self-hosted servers.',
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
                      Read the guide
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
            <h2 className="font-display text-xl font-bold text-foreground">Ecosystem tools</h2>
            <p className="mt-2 text-sm text-muted">
              Plugin publishing and operator-only links stay separate from the main household account flow.
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
            {operatorLink ? (
              <OperatorLinkCard
                href={operatorLink.href}
                icon={operatorLink.icon}
                label={operatorLink.label}
                description={operatorLink.description}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

function OperatorLinkCard({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: typeof ShieldCheck;
  label: string;
  description: string;
}) {
  return (
    <a href={href} className="group rounded-xl border border-border bg-background p-5 transition-colors hover:bg-surface">
      <Icon className="mb-3 h-6 w-6 text-accent" />
      <h3 className="font-semibold text-foreground">{label}</h3>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </a>
  );
}
