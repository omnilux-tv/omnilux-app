import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type ManagedMediaPolicy = 'all-authenticated-users' | 'explicit-per-profile';
export type RelayAccessPolicy = 'all-authenticated-users' | 'paid-subscription';
export type ManagedMediaOperatingMode = 'normal' | 'degraded' | 'maintenance';

export interface AccessAuditRow {
  id: number;
  source: string;
  createdAt: string;
  actor: {
    userId: string | null;
    email: string | null;
    displayName: string | null;
  };
  target: {
    userId: string;
    email: string | null;
    displayName: string | null;
  };
  managedMediaEntitledBefore: boolean | null;
  managedMediaEntitledAfter: boolean | null;
  isOperatorBefore: boolean | null;
  isOperatorAfter: boolean | null;
}

export interface OperatorActionAuditRow {
  id: number;
  actionType: string;
  source: string;
  createdAt: string;
  actor: {
    userId: string | null;
    email: string | null;
    displayName: string | null;
  };
  target: {
    userId: string | null;
    email: string | null;
    displayName: string | null;
  } | null;
  server: {
    id: string;
    name: string;
    publicOrigin: string | null;
  } | null;
  metadata: Record<string, unknown>;
}

export interface OperatorSupportProfile {
  profile: {
    id: string;
    email: string | null;
    displayName: string | null;
    managedMediaEntitled: boolean;
    managedMediaAccessOverride: boolean;
    isOperator: boolean;
    createdAt: string;
    updatedAt: string;
    lastSignInAt: string | null;
    subscription: {
      tier: string;
      status: string;
      currentPeriodEnd: string | null;
      updatedAt: string;
    } | null;
  };
  selfHostedServers: Array<{
    id: string;
    name: string;
    ownership: 'owner' | 'shared';
    accessRole: string;
    publicOrigin: string | null;
    relayStatus: string | null;
    lastSeenAt: string | null;
    updatedAt: string;
    version: string | null;
  }>;
  recentRelaySessions: Array<{
    id: string;
    serverId: string;
    serverName: string;
    status: string;
    sessionType: string;
    issuedAt: string;
    expiresAt: string;
    consumedAt: string | null;
    endedAt: string | null;
    revocable: boolean;
  }>;
  relayTokens: Array<{
    serverId: string;
    serverName: string;
    ownership: 'owner' | 'shared';
    tokenId: string;
    tokenPrefix: string;
    status: string;
    issuedFor: string;
    createdAt: string;
    expiresAt: string;
    lastUsedAt: string | null;
    revocable: boolean;
  }>;
  supportNotes: Array<{
    id: number;
    createdAt: string;
    tags: string[];
    note: string;
    actor: {
      userId: string | null;
      email: string | null;
      displayName: string | null;
    };
    server: {
      id: string;
      name: string;
    } | null;
  }>;
  recentAccessChanges: AccessAuditRow[];
}

export interface OpsServiceHealthResponse {
  checkedAt: string;
  services: Array<{
    key: string;
    label: string;
    url: string;
    status: 'online' | 'degraded' | 'error';
    httpStatus: number | null;
    responseTimeMs: number | null;
    checkedAt: string;
    detail: string;
  }>;
}

export interface PlatformSettings {
  managedMediaPolicy: ManagedMediaPolicy;
  managedMediaPolicyLabel: string;
  managedMediaPolicyDescription: string;
  relayAccessPolicy: RelayAccessPolicy;
  relayAccessPolicyLabel: string;
  relayAccessPolicyDescription: string;
  managedMediaOperatingMode: ManagedMediaOperatingMode;
  managedMediaOperatingModeLabel: string;
  managedMediaIncidentMessage: string;
  createdAt: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PlatformSettingsAuditRow {
  id: number;
  source: string;
  createdAt: string;
  actor: {
    userId: string | null;
    email: string | null;
    displayName: string | null;
  };
  managedMediaPolicyBefore: ManagedMediaPolicy | null;
  managedMediaPolicyAfter: ManagedMediaPolicy | null;
  relayAccessPolicyBefore: RelayAccessPolicy | null;
  relayAccessPolicyAfter: RelayAccessPolicy | null;
}

export interface OpsOverview {
  platform: {
    managedMediaPolicy: ManagedMediaPolicy;
    managedMediaPolicyLabel: string;
    managedMediaPolicyDescription: string;
    relayAccessPolicy: RelayAccessPolicy;
    relayAccessPolicyLabel: string;
    relayAccessPolicyDescription: string;
    managedMediaOperatingMode: ManagedMediaOperatingMode;
    managedMediaOperatingModeLabel: string;
    managedMediaIncidentMessage: string;
    updatedAt: string | null;
  };
  metrics: {
    profilesTotal: number;
    operatorsTotal: number;
    explicitlyEntitledProfilesTotal: number;
    activeSubscriptionsTotal: number;
    trialingSubscriptionsTotal: number;
    selfHostedServersTotal: number;
    relayOnlineServersTotal: number;
    relayAttentionServersTotal: number;
    activeRelaySessionsTotal: number;
    supportNotesTotal: number;
    recentAccessChangesTotal: number;
    recentPolicyChangesTotal: number;
  };
  managedMediaRuntime: {
    id: string;
    name: string;
    publicOrigin: string | null;
    relayStatus: string | null;
    relayLastConnectedAt: string | null;
    lastSeenAt: string | null;
    updatedAt: string;
    version: string | null;
  } | null;
}

export const useOpsOverview = (enabled: boolean) =>
  useQuery({
    queryKey: ['ops-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<OpsOverview>('get-ops-overview');
      if (error) {
        throw error;
      }
      return data as OpsOverview;
    },
    enabled,
  });

export const useOpsServiceHealth = (enabled: boolean) =>
  useQuery({
    queryKey: ['ops-service-health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<OpsServiceHealthResponse>('get-ops-service-health');
      if (error) {
        throw error;
      }
      return data as OpsServiceHealthResponse;
    },
    enabled,
    refetchInterval: 60_000,
  });

export const usePlatformSettings = (enabled: boolean) =>
  useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<PlatformSettings>('get-platform-settings');
      if (error) {
        throw error;
      }
      return data as PlatformSettings;
    },
    enabled,
  });

export const useOperatorActionAuditLog = (enabled: boolean) =>
  useQuery({
    queryKey: ['operator-action-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<OperatorActionAuditRow[]>(
        'list-operator-action-audit-log',
      );
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled,
  });

export const useOperatorSupportProfile = (enabled: boolean, userId: string | null) =>
  useQuery({
    queryKey: ['operator-support-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<OperatorSupportProfile>('get-operator-support-profile', {
        body: {
          userId,
          source: 'operator-dashboard',
        },
      });
      if (error) {
        throw error;
      }
      return data as OperatorSupportProfile;
    },
    enabled: Boolean(enabled && userId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const usePlatformSettingsAuditLog = (enabled: boolean) =>
  useQuery({
    queryKey: ['platform-settings-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<PlatformSettingsAuditRow[]>(
        'list-platform-settings-audit-log',
      );
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled,
  });
