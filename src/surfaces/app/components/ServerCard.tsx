import { Link } from '@tanstack/react-router';
import {
  getServerDeploymentProfileLabel,
  normalizeServerDeploymentProfile,
} from '@/surfaces/app/lib/server-deployment-profile';
import { cn } from '@/lib/utils';

interface ServerCardProps {
  id: string;
  name: string;
  version: string;
  deploymentProfile?: string | null;
  lastSeenAt: string | null;
  relayEnabled?: boolean | null;
  relayStatus?: string | null;
}

export const ServerCard = ({
  id,
  name,
  version,
  deploymentProfile,
  lastSeenAt,
  relayEnabled,
  relayStatus,
}: ServerCardProps) => {
  const recentlySeen = lastSeenAt
    ? Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000
    : false;
  const hasOnlineRelay = relayEnabled && (relayStatus === 'online' || relayStatus === 'degraded');
  const isOnline = recentlySeen || hasOnlineRelay;
  const profileLabel = getServerDeploymentProfileLabel(normalizeServerDeploymentProfile(deploymentProfile));

  return (
    <Link
      to="/dashboard/servers/$serverId"
      params={{ serverId: id }}
      className="group flex items-center gap-4 rounded-xl surface-soft p-4 transition-colors hover:bg-surface"
    >
      <div className={cn('h-3 w-3 rounded-full', isOnline ? 'bg-success' : 'bg-danger')} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-foreground">{name}</h3>
        <p className="text-xs text-muted">
          {profileLabel} &middot; v{version} &middot; {isOnline ? 'Online' : 'Offline'}
        </p>
      </div>
    </Link>
  );
};
