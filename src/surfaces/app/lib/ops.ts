import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type ManagedMediaPolicy = 'all-authenticated-users' | 'explicit-per-profile';

export interface PlatformSettings {
  managedMediaPolicy: ManagedMediaPolicy;
  managedMediaPolicyLabel: string;
  managedMediaPolicyDescription: string;
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
}

export interface OpsOverview {
  platform: {
    managedMediaPolicy: ManagedMediaPolicy;
    managedMediaPolicyLabel: string;
    managedMediaPolicyDescription: string;
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
