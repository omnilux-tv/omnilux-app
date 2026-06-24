import { ExternalLink, RadioTower, Sparkles } from 'lucide-react';
import { buildDocsHref } from '@/lib/site-surface';
import type { CustomerOverview } from '@/surfaces/app/lib/customer-overview';
import { getRelayConditionLabel } from '@/surfaces/app/lib/relay-condition';
import { numberFormatter } from './model';

type AccessOverviewProps = {
  overview: CustomerOverview | undefined;
  isLoading: boolean;
  managedMediaOrigin: string;
  managedMediaAvailable: boolean;
  launching: boolean;
  openManagedMedia: () => void;
};

const Skeleton = () => (
  <div className="mt-4 space-y-3">
    <div className="h-5 animate-pulse rounded bg-surface" />
    <div className="h-5 animate-pulse rounded bg-surface" />
    <div className="h-5 animate-pulse rounded bg-surface" />
  </div>
);

export const AccessOverview = ({
  overview,
  isLoading,
  managedMediaOrigin,
  managedMediaAvailable,
  launching,
  openManagedMedia,
}: AccessOverviewProps) => (
  <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
    <div className="rounded-xl surface-soft p-6">
      <div className="flex items-center gap-3">
        <RadioTower className="h-6 w-6 text-accent" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Access for this account</h2>
          <p className="text-sm text-muted">
            {isLoading
              ? 'Checking managed media status for this account.'
              : managedMediaAvailable
                ? 'This account can open OmniLux Media right now.'
                : 'Managed media is not currently available to this account.'}
          </p>
        </div>
      </div>

      {isLoading && !overview ? (
        <Skeleton />
      ) : (
        <ul className="mt-4 space-y-2">
          {[
            overview?.access.managedMediaEntitled
              ? 'Managed media access is active on this cloud account.'
              : 'Managed media access is currently unavailable for this cloud account.',
            overview?.platform.managedMediaPolicyDescription ?? 'Managed media follows the current OmniLux Cloud platform policy.',
            'Managed media stays separate from self-hosted ownership, invites, and local server accounts.',
          ].map((bullet) => (
            <li key={bullet} className="flex gap-2 text-sm leading-6 text-muted">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {managedMediaAvailable ? (
          <button
            type="button"
            onClick={() => void openManagedMedia()}
            disabled={launching}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <ExternalLink className="h-4 w-4" />
            {launching ? 'Opening...' : 'Open OmniLux Media'}
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted">
            <ExternalLink className="h-4 w-4" />
            Access restricted
          </span>
        )}
        <a
          href={buildDocsHref('/guide/managed-media')}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
        >
          <Sparkles className="h-4 w-4" />
          Read the guide
        </a>
      </div>

      {overview?.managedMediaSummary ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Discovery', overview.managedMediaSummary.discoveryItemsTotal],
            ['Playable', overview.managedMediaSummary.playableItemsTotal],
            ['Provider', overview.managedMediaSummary.providerWorkspacesTotal],
            ['Issued', overview.managedMediaSummary.recentGrantsIssued],
            ['Consumed', overview.managedMediaSummary.recentGrantsConsumed],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-background/70 p-3">
              <p className="text-xs font-semibold text-muted">{label}</p>
              <p className="mt-2 text-xl font-bold text-foreground">{numberFormatter.format(value as number)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>

    <div className="rounded-xl border border-border bg-background p-6">
      <h2 className="font-semibold text-foreground">Service status</h2>
      {isLoading && !overview ? (
        <Skeleton />
      ) : overview?.managedMediaRuntime ? (
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="text-xs font-semibold text-muted">Origin</dt>
            <dd className="mt-1 text-foreground">{managedMediaOrigin}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted">Relay state</dt>
            <dd className="mt-1 text-foreground">
              {overview.managedMediaRuntime.relayCondition
                ? getRelayConditionLabel(overview.managedMediaRuntime.relayCondition)
                : overview.managedMediaRuntime.relayStatus ?? 'Unknown'}
            </dd>
            {overview.managedMediaRuntime.relayConditionDetail?.summary ? (
              <dd className="mt-1 text-xs text-muted">{overview.managedMediaRuntime.relayConditionDetail.summary}</dd>
            ) : null}
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted">Version</dt>
            <dd className="mt-1 text-foreground">{overview.managedMediaRuntime.version ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted">Last seen</dt>
            <dd className="mt-1 text-foreground">
              {overview.managedMediaRuntime.lastSeenAt
                ? new Date(overview.managedMediaRuntime.lastSeenAt).toLocaleString()
                : 'No heartbeat recorded'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-muted">OmniLux Media is not reporting status to OmniLux Cloud yet.</p>
      )}
    </div>
  </div>
);
