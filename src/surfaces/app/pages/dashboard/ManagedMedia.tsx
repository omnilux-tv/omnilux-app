import { Link } from '@tanstack/react-router';
import { ExternalLink, RadioTower, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { buildDocsHref } from '@/lib/site-surface';
import { useCustomerOverview } from '@/surfaces/app/lib/customer-overview';

const fallbackMediaOrigin = 'https://media.omnilux.tv';

export const ManagedMedia = () => {
  const { data: overview, error, isLoading } = useCustomerOverview();

  if (isLoading) {
    return (
      <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-20 animate-pulse rounded-xl bg-surface" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-56 animate-pulse rounded-xl bg-surface" />
            <div className="h-56 animate-pulse rounded-xl bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-danger/30 bg-danger/10 p-6 text-sm text-foreground">
          {error instanceof Error ? error.message : 'Managed media status could not be loaded.'}
        </div>
      </div>
    );
  }

  const managedMediaOrigin = overview.managedMediaRuntime?.publicOrigin ?? fallbackMediaOrigin;
  const managedMediaAvailable = overview.access.managedMediaEntitled && Boolean(overview.managedMediaRuntime);
  const operatingMode = overview.platform.managedMediaOperatingMode;

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Managed Media</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">OmniLux Media</h1>
          <p className="mt-2 max-w-2xl text-muted">
            First-party channels, radio, and curated OmniLux experiences run from the managed runtime at
            `media.omnilux.tv`. This surface is part of your cloud account, not a self-hosted server share.
          </p>
        </div>

        {operatingMode !== 'normal' || overview.platform.managedMediaIncidentMessage ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning">Current Operating State</p>
            <p className="mt-2 text-lg font-semibold">{overview.platform.managedMediaOperatingModeLabel}</p>
            <p className="mt-2 text-muted">
              {overview.platform.managedMediaIncidentMessage || 'Operators have published a non-normal operating state for managed media.'}
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-xl surface-soft p-6">
            <div className="flex items-center gap-3">
              <RadioTower className="h-6 w-6 text-accent" />
              <div>
                <h2 className="text-lg font-bold text-foreground">Access for this account</h2>
                <p className="text-sm text-muted">
                  {managedMediaAvailable
                    ? 'This account can open the managed OmniLux media runtime right now.'
                    : 'Managed media is not currently available to this account.'}
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {[
                overview.access.managedMediaEntitled
                  ? 'Managed media entitlement is active on this cloud account.'
                  : 'Managed media entitlement is currently disabled for this cloud account.',
                overview.platform.managedMediaPolicyDescription,
                'Managed media stays separate from self-hosted ownership, invites, and local admin accounts.',
              ].map((bullet) => (
                <li key={bullet} className="flex gap-2 text-sm leading-6 text-muted">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={managedMediaOrigin}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <ExternalLink className="h-4 w-4" />
                Open OmniLux Media
              </a>
              <a
                href={buildDocsHref('/guide/managed-media')}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                <Sparkles className="h-4 w-4" />
                Read the guide
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-6">
            <h2 className="font-semibold text-foreground">Runtime Status</h2>
            {overview.managedMediaRuntime ? (
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Origin</dt>
                  <dd className="mt-1 text-foreground">{managedMediaOrigin}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Relay State</dt>
                  <dd className="mt-1 capitalize text-foreground">{overview.managedMediaRuntime.relayStatus ?? 'unknown'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Version</dt>
                  <dd className="mt-1 text-foreground">{overview.managedMediaRuntime.version ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Last Seen</dt>
                  <dd className="mt-1 text-foreground">
                    {overview.managedMediaRuntime.lastSeenAt
                      ? new Date(overview.managedMediaRuntime.lastSeenAt).toLocaleString()
                      : 'No heartbeat recorded'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted">
                The first-party managed runtime has not registered with the control plane yet.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Waves,
              title: 'What it is',
              body: 'Managed media is OmniLux-owned content and runtime infrastructure surfaced through your cloud account.',
            },
            {
              icon: ShieldCheck,
              title: 'What it is not',
              body: 'It is not a replacement for your self-hosted server, your LAN playback, or your private reverse-proxy setup.',
            },
            {
              icon: Sparkles,
              title: 'Where to go next',
              body: 'Use the customer dashboard for billing and claiming, then use the media runtime for first-party channels and curated experiences.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-background p-5">
              <Icon className="h-5 w-5 text-accent" />
              <h2 className="mt-4 font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-background p-6">
          <h2 className="font-semibold text-foreground">Self-hosted servers still matter</h2>
          <p className="mt-2 text-sm text-muted">
            Managed media gives every cloud account a first-party OmniLux surface, but your self-hosted runtime is still
            where your own libraries, direct access, and server-level admin live.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/dashboard/servers"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              View cloud-linked servers
            </Link>
            <a
              href={buildDocsHref('/guide/cloud-product-contract')}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Review the product contract
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
