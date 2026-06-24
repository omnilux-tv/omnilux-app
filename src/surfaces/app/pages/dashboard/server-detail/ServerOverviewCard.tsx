import { ExternalLink } from 'lucide-react';
import {
  getRelayConditionLabel,
  getRelayConditionSummary,
} from '@/surfaces/app/lib/relay-condition';
import { cn } from '@/lib/utils';
import { formatRelayFeatureLabel, type ServerDetailViewModel } from './useServerDetail';

type ServerOverviewCardProps = {
  vm: ServerDetailViewModel;
};

export const ServerOverviewCard = ({ vm }: ServerOverviewCardProps) => {
  const server = vm.server;
  if (!server || !vm.relayCondition) return null;

  return (
    <div className="rounded-xl surface-soft p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('h-3 w-3 rounded-full', vm.isOnline ? 'bg-success' : 'bg-danger')} />
          <h1 className="font-display text-2xl font-bold text-foreground">{server.name}</h1>
        </div>
        {vm.isSelfHosted ? (
          <button
            type="button"
            onClick={() => vm.actions.openRelaySession.mutate()}
            disabled={!vm.canOpenRelaySession || vm.actions.openRelaySession.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              vm.canOpenRelaySession
                ? 'Open this server through OmniLux relay'
                : 'Relay remote access requires an eligible cloud plan, an online tunnel, and an upgraded OmniLux server'
            }
          >
            <ExternalLink className="h-4 w-4" />
            {vm.actions.openRelaySession.isPending ? 'Opening relay...' : 'Open through relay'}
          </button>
        ) : null}
      </div>
      {vm.actions.openRelaySession.error ? (
        <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {vm.actions.openRelaySession.error instanceof Error
            ? vm.actions.openRelaySession.error.message
            : 'Unable to open relay session.'}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Fact label="Profile" value={vm.deploymentLabel} />
        <Fact label="Version" value={`v${server.version}`} />
        <div className="flex items-center gap-2">
          <span className="text-muted">Relay:</span>
          <span
            className={cn(
              'inline-block h-2.5 w-2.5 rounded-full',
              vm.relayTone === 'success' && 'bg-success',
              vm.relayTone === 'warning' && 'bg-warning',
              vm.relayTone === 'danger' && 'bg-danger',
              vm.relayTone === 'muted' && 'bg-muted',
            )}
          />
          <span className="text-foreground">{getRelayConditionLabel(vm.relayCondition)}</span>
        </div>
        {server.relay_region ? <Fact label="Relay region" value={server.relay_region} /> : null}
        {server.relay_last_connected_at ? (
          <Fact label="Relay last connected" value={new Date(server.relay_last_connected_at).toLocaleString()} />
        ) : null}
        {server.public_origin ? <Fact label="Public origin" value={server.public_origin} wide /> : null}
      </div>
      <ServerModel vm={vm} />
      {server.relay_capabilities && Object.keys(server.relay_capabilities).length > 0 ? (
        <div className="mt-4 rounded-lg bg-surface/50 p-4">
          <p className="mb-2 text-xs font-semibold text-muted">Remote access features</p>
          <ul className="space-y-2 text-sm text-foreground">
            {Object.entries(server.relay_capabilities).map(([key, value]) => (
              <li key={key} className="flex items-start justify-between gap-3 rounded-md bg-background/60 px-3 py-2">
                <span className="text-muted">{formatRelayFeatureLabel(key)}</span>
                <span className="text-right">{typeof value === 'boolean' ? (value ? 'Available' : 'Unavailable') : String(value)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const Fact = ({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) => (
  <div className={wide ? 'sm:col-span-2' : undefined}>
    <span className="text-muted">{label}:</span> <span className="text-foreground">{value}</span>
  </div>
);

const ServerModel = ({ vm }: ServerOverviewCardProps) => (
  <div className="mt-4 rounded-lg bg-surface/50 p-4">
    <p className="text-xs font-semibold text-muted">Server model</p>
    <p className="mt-2 text-sm text-foreground">{vm.relayCondition ? getRelayConditionSummary(vm.relayCondition) : null}</p>
    {vm.deploymentProfile === 'self-hosted' ? (
      <p className="mt-2 text-sm text-muted">
        OmniLux Cloud can open a remote browser session when this server is compatible, the tunnel is online, and the
        current account has access. Local network, VPN, and user-owned reverse-proxy access remain outside cloud billing.{' '}
        {vm.accessProfile?.relayAccessPolicyDescription ?? 'Self-hosted remote access follows the cloud plan policy.'}
      </p>
    ) : (
      <p className="mt-2 text-sm text-muted">
        This is OmniLux-managed media surfaced through the hosted account, not a customer-owned self-hosted server. It is
        expected to be reachable through its OmniLux-managed public origin instead of a user-owned LAN or reverse-proxy path.{' '}
        {vm.accessProfile?.managedMediaPolicy === 'all-authenticated-users'
          ? 'Managed media is currently in a broad authenticated preview mode.'
          : 'Managed media access is gated directly by OmniLux for this account.'}
      </p>
    )}
  </div>
);
