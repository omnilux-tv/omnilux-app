import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import {
  getServerDeploymentProfileLabel,
  isSelfHostedDeploymentProfile,
  normalizeServerDeploymentProfile,
} from '@/surfaces/app/lib/server-deployment-profile';
import {
  deriveRelayCondition,
  getRelayConditionTone,
} from '@/surfaces/app/lib/relay-condition';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import {
  buildRelaySessionUrl,
  hasRemoteHttpRelaySupport,
  type CreateRelaySessionResponse,
} from '@/surfaces/app/lib/relay-session';
import { invokeCloudAction, invokeCloudFunction } from '@/surfaces/app/lib/cloud-functions';

export interface ServerDetailData {
  id: string;
  name: string;
  deployment_profile: string | null;
  public_origin: string | null;
  relay_enabled: boolean;
  relay_status: 'offline' | 'connecting' | 'online' | 'degraded' | 'error';
  relay_last_connected_at: string | null;
  relay_protocol_version: number | null;
  relay_region: string | null;
  relay_capabilities: Record<string, unknown>;
  version: string;
  last_seen_at: string | null;
}

export interface ServerAccessRow {
  id: string;
  user_id: string;
  role: string;
  user_email: string | null;
  user_name: string | null;
}

export interface InviteRow {
  id: string;
  code: string;
  role: string;
  max_uses: number;
  uses: number;
  expires_at: string | null;
}

interface ServerDetailResponse {
  server: ServerDetailData;
  access: ServerAccessRow[];
  invites: InviteRow[];
}

export const relayFeatureLabels: Record<string, string> = {
  http_relay: 'Remote browser session',
  remote_access: 'Remote browser session',
  web_session: 'Remote browser session',
  websocket: 'Live relay tunnel',
  health: 'Health reporting',
};

export const formatRelayFeatureLabel = (key: string) => {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return relayFeatureLabels[normalized] ??
    normalized
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
};

export const useServerDetail = () => {
  const { serverId } = useParams({ from: '/dashboard/servers_/$serverId' });
  const queryClient = useQueryClient();
  const { data: accessProfile } = useAccessProfile();
  const [inviteRole, setInviteRole] = useState<'user' | 'guest'>('user');
  const [inviteMaxUses, setInviteMaxUses] = useState(5);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);
  const queryKey = ['server-detail', serverId];

  const detailQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await invokeCloudFunction<ServerDetailResponse>('get-server-detail', { body: { serverId } });
      if (!data?.server) throw new Error('Server detail was not returned');
      return data;
    },
  });

  const server = detailQuery.data?.server;
  const deploymentProfile = normalizeServerDeploymentProfile(server?.deployment_profile);
  const isSelfHosted = deploymentProfile === 'self-hosted';
  const access = isSelfHostedDeploymentProfile(server?.deployment_profile) ? detailQuery.data?.access : undefined;
  const invites = isSelfHostedDeploymentProfile(server?.deployment_profile) ? detailQuery.data?.invites : undefined;
  const relayCondition = server
    ? deriveRelayCondition({
        relayEnabled: server.relay_enabled,
        relayStatus: server.relay_status,
        entitled: isSelfHosted ? accessProfile?.relayRemoteAccessEntitled ?? null : accessProfile?.managedMediaEntitled ?? null,
      })
    : null;
  const relayTone = relayCondition ? getRelayConditionTone(relayCondition) : 'muted';
  const remoteRelaySupported = server ? hasRemoteHttpRelaySupport(server.relay_capabilities) : false;
  const relayEntitled = accessProfile?.relayRemoteAccessEntitled === true;
  const canOpenRelaySession = Boolean(isSelfHosted && relayCondition === 'ready' && relayEntitled && remoteRelaySupported);
  const isOnline = server?.last_seen_at ? Date.now() - new Date(server.last_seen_at).getTime() < 5 * 60 * 1000 : false;
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createInvite = useMutation({
    mutationFn: () => invokeCloudAction('create-invite', { body: { serverId, role: inviteRole, maxUses: inviteMaxUses } }),
    onSuccess: invalidate,
  });
  const revokeInvite = useMutation({
    mutationFn: (inviteId: string) => invokeCloudAction('revoke-server-invite', { body: { inviteId } }),
    onSuccess: invalidate,
  });
  const removeAccess = useMutation({
    mutationFn: (accessId: string) => invokeCloudAction('remove-server-access', { body: { accessId } }),
    onSuccess: invalidate,
  });
  const openRelaySession = useMutation({
    mutationFn: async () => {
      const data = await invokeCloudFunction<CreateRelaySessionResponse>('create-relay-session', {
        body: { serverId, sessionType: 'remote-access', metadata: { surface: 'app-server-detail' } },
      });
      if (!data?.token) throw new Error('Relay session token was not returned');
      return data;
    },
    onSuccess: (data) => window.open(buildRelaySessionUrl(data.token), '_blank', 'noopener,noreferrer'),
  });

  const copyInviteLink = async (code: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`);
    setCopiedInvite(code);
    setTimeout(() => setCopiedInvite(null), 2000);
  };

  return {
    accessProfile,
    detailQuery,
    server,
    access,
    invites,
    deploymentProfile,
    deploymentLabel: getServerDeploymentProfileLabel(deploymentProfile),
    isSelfHosted,
    isOnline,
    relayCondition,
    relayTone,
    canOpenRelaySession,
    inviteRole,
    setInviteRole,
    inviteMaxUses,
    setInviteMaxUses,
    copiedInvite,
    actions: { createInvite, revokeInvite, removeAccess, openRelaySession, copyInviteLink },
  };
};

export type ServerDetailViewModel = ReturnType<typeof useServerDetail>;
