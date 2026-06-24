import { Link } from '@tanstack/react-router';
import { buildDocsHref } from '@/lib/site-surface';
import type { CustomerOverview } from '@/surfaces/app/lib/customer-overview';

type CoreJourneyProps = {
  customerOverview: CustomerOverview | undefined;
  isLoading: boolean;
  error: unknown;
};

export const CoreJourney = ({ customerOverview, isLoading, error }: CoreJourneyProps) => (
  <section className="mt-12">
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-foreground">Core journey</h2>
      <p className="mt-2 text-sm text-muted">
        Move from account setup to managed media, then add self-hosted servers and relay access when they improve the way
        your household uses OmniLux.
      </p>
    </div>

    {isLoading ? (
      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((index) => <div key={index} className="h-36 animate-pulse rounded-xl bg-surface" />)}
      </div>
    ) : error ? (
      <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
        {error instanceof Error ? error.message : 'Customer overview could not be loaded.'}
      </div>
    ) : (
      <>
        <JourneyStats customerOverview={customerOverview} />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <RecommendedActions customerOverview={customerOverview} />
          <ClarityPanel />
        </div>
      </>
    )}
  </section>
);

const JourneyStats = ({ customerOverview }: { customerOverview: CustomerOverview | undefined }) => {
  const selfHostedServersTotal = customerOverview?.metrics.selfHostedServersTotal ?? 0;
  const stats = [
    {
      title: 'Cloud account',
      value: 'Ready',
      detail: 'Identity, billing, and device sign-in are active through OmniLux Cloud.',
    },
    {
      title: 'Managed media',
      value: customerOverview?.access.managedMediaEntitled ? 'Included' : 'Restricted',
      detail: customerOverview?.platform.managedMediaPolicyDescription ?? 'First-party managed media follows the current platform policy.',
    },
    {
      title: 'Self-hosted servers',
      value: String(selfHostedServersTotal),
      detail:
        selfHostedServersTotal > 0
          ? 'Your cloud account is already linked to one or more OmniLux servers.'
          : 'Claim a server when you want private libraries, cloud continuity, and relay access.',
    },
    {
      title: 'Remote relay',
      value: customerOverview?.access.relayRemoteAccessEntitled ? 'Included' : 'Plan required',
      detail: customerOverview?.platform.relayAccessPolicyDescription ??
        'Relay sessions require an eligible account, an online tunnel, and a compatible OmniLux server.',
    },
  ];

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-4">
      {stats.map(({ title, value, detail }) => (
        <div key={title} className="rounded-xl border border-border bg-background p-5">
          <p className="text-xs font-semibold text-muted">{title}</p>
          <p className="mt-3 font-display text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-3 text-sm text-muted">{detail}</p>
        </div>
      ))}
    </div>
  );
};

const RecommendedActions = ({ customerOverview }: { customerOverview: CustomerOverview | undefined }) => {
  const selfHostedServersTotal = customerOverview?.metrics.selfHostedServersTotal ?? 0;
  const actions = [
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
      complete: selfHostedServersTotal > 0,
      label: 'Claim a self-hosted server when you want your own libraries',
      body: selfHostedServersTotal > 0
        ? 'At least one OmniLux server is already linked to this cloud account.'
        : 'Claiming a server adds your private libraries, cloud continuity, and relay access.',
      actionHref: selfHostedServersTotal > 0 ? '/dashboard/servers' : '/dashboard/claim',
      actionLabel: selfHostedServersTotal > 0 ? 'Review servers' : 'Claim a server',
    },
    {
      complete: customerOverview?.access.relayRemoteAccessEntitled ?? false,
      label: 'Upgrade only when a cloud feature needs it',
      body: customerOverview?.access.relayRemoteAccessEntitled
        ? 'This account already has remote relay access.'
        : customerOverview?.platform.relayAccessPolicyDescription ?? 'Remote relay for self-hosted servers requires an eligible cloud plan.',
      actionHref: '/dashboard/subscription',
      actionLabel: 'Review billing',
    },
    {
      complete: false,
      label: 'Add companion devices when your account is ready',
      body: 'Use the client-readiness guide before adding Android, iOS, TV, or other companion surfaces.',
      actionHref: buildDocsHref('/guide/client-readiness'),
      actionLabel: 'Read client readiness',
      external: true,
    },
  ];

  return (
    <div className="rounded-xl surface-soft p-6">
      <h3 className="font-semibold text-foreground">Recommended next actions</h3>
      <ul className="mt-4 space-y-3">
        {actions.map(({ complete, label, body, actionHref, actionLabel, external }) => (
          <li key={label} className="rounded-xl bg-surface/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-foreground">
                  {label} <span className="ml-2 text-xs text-muted">{complete ? 'complete' : 'next'}</span>
                </p>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </div>
              {external ? (
                <a href={actionHref} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface">
                  {actionLabel}
                </a>
              ) : (
                <Link to={actionHref as '/dashboard/media' | '/dashboard/claim' | '/dashboard/servers' | '/dashboard/subscription'} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface">
                  {actionLabel}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ClarityPanel = () => (
  <div className="rounded-xl border border-border bg-background p-6">
    <h3 className="font-semibold text-foreground">What stays clear</h3>
    <p className="mt-2 text-sm text-muted">
      OmniLux separates cloud convenience from local ownership, so billing, media access, and server control stay understandable.
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
      <a href={buildDocsHref('/guide/cloud-product-contract')} className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90">
        Read the guide
      </a>
      <a href={buildDocsHref('/guide/managed-media')} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface">
        Managed media guide
      </a>
    </div>
  </div>
);
