import { Link } from '@tanstack/react-router';
import {
  getServerDeploymentProfileLabel,
  normalizeServerDeploymentProfile,
} from '@/surfaces/app/lib/server-deployment-profile';
import {
  deriveRelayCondition,
  getRelayConditionLabel,
  getRelayConditionTone,
  type RelayConditionState,
} from '@/surfaces/app/lib/relay-condition';
import { cn } from '@/lib/utils';

interface ServerCardProps {
  id: string;
  name: string;
  version: string;
  deploymentProfile?: string | null;
  lastSeenAt: string | null;
  relayEnabled?: boolean | null;
  relayStatus?: string | null;
  relayCondition?: RelayConditionState | null;
  relayEntitled?: boolean | null;
}

export const ServerCard = ({
  id,
  name,
  version,
  deploymentProfile,
  lastSeenAt,
  relayEnabled,
  relayStatus,
  relayCondition,
  relayEntitled,
}: ServerCardProps) => {
  const recentlySeen = lastSeenAt
    ? Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000
    : false;
  const condition = relayCondition ?? deriveRelayCondition({
    relayEnabled,
    relayStatus,
    entitled: relayEntitled,
  });
  const remoteAccessAvailable = condition === 'ready' || condition === 'degraded';
  const profileLabel = getServerDeploymentProfileLabel(normalizeServerDeploymentProfile(deploymentProfile));
  const conditionTone = getRelayConditionTone(condition);

  return (
    <Link
      to="/dashboard/servers/$serverId"
      params={{ serverId: id }}
      className="group flex items-center gap-4 rounded-xl surface-soft p-4 transition-colors hover:bg-surface"
    >
      <div
        className={cn(
          'h-3 w-3 rounded-full',
          conditionTone === 'success' && 'bg-success',
          conditionTone === 'warning' && 'bg-warning',
          conditionTone === 'danger' && 'bg-danger',
          conditionTone === 'muted' && 'bg-muted',
        )}
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-foreground">{name}</h3>
        <p className="text-xs text-muted">
          {profileLabel} &middot; v{version} &middot; {recentlySeen ? 'Runtime recently seen' : 'Runtime not recently seen'}
        </p>
        <p className="mt-1 text-xs text-muted">
          Relay: <span className="text-foreground">{getRelayConditionLabel(condition)}</span>
          {remoteAccessAvailable ? null : <span> &middot; remote access unavailable</span>}
        </p>
      </div>
    </Link>
  );
};
