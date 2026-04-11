import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AccessProfile } from '@/surfaces/app/lib/access-profile';

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

export type RescueFailureClass =
  | 'authentication'
  | 'billing'
  | 'entitlement'
  | 'relay'
  | 'linked-server'
  | 'mixed-signals'
  | 'unknown';

export interface RescueCaseContext {
  id: string;
  status: string | null;
  ownerId: string | null;
  customerId: string | null;
  channel: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  nextAction: string | null;
}

export interface RescueBillingState {
  status: string | null;
  tier: string | null;
  currentPeriodEnd: string | null;
  updatedAt: string | null;
  isActive: boolean;
  needsBillingReview: boolean;
  reason: string | null;
}

export interface RescueEntitlementState {
  managedMediaEntitled: boolean;
  managedMediaAccessOverride: boolean;
  entitlementMatchExpected: boolean;
  entitlementSignal: string;
}

export interface RescueRelayState {
  hasLinkedServer: boolean;
  onlineServers: number;
  staleServers: number;
  recentSessionCount: number;
  hasRevocableSession: boolean;
  hasRevocableToken: boolean;
  criticalSignals: string[];
}

export interface OperatorRescueProfile {
  queryKey: string;
  failureClass: RescueFailureClass;
  failureReason: string;
  nextSafeAction: string;
  summary: {
    account: OperatorSupportProfile['profile'];
    subscription: OperatorSupportProfile['profile']['subscription'];
    selfHostedServers: OperatorSupportProfile['selfHostedServers'];
    recentRelaySessions: OperatorSupportProfile['recentRelaySessions'];
    relayTokens: OperatorSupportProfile['relayTokens'];
    supportNotes: OperatorSupportProfile['supportNotes'];
    recentAccessChanges: OperatorSupportProfile['recentAccessChanges'];
  };
  entitlement: RescueEntitlementState;
  billing: RescueBillingState;
  relay: RescueRelayState;
  caseContext: RescueCaseContext | null;
}

export const toRescueFailure = (profile: OperatorSupportProfile | null): RescueFailureClass => {
  if (!profile) {
    return 'unknown';
  }

  const subscriptionStatus = (profile.profile.subscription?.status ?? 'unknown').toLowerCase();
  const isBillingActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  if (!profile.profile.lastSignInAt) {
    return 'authentication';
  }

  if (!isBillingActive && !profile.profile.subscription) {
    return 'billing';
  }

  const serverStatus = profile.selfHostedServers[0]?.relayStatus?.toLowerCase() ?? 'unknown';
  const hasServer = profile.selfHostedServers.length > 0;
  const staleServer = profile.selfHostedServers.some((server) => {
    const lastSeen = server.lastSeenAt ? Date.parse(server.lastSeenAt) : NaN;
    if (Number.isNaN(lastSeen)) return false;
    return Date.now() - lastSeen > 72 * 60 * 60 * 1000;
  });

  const hasActiveSession = profile.recentRelaySessions.some(
    (session) =>
      session.status.toLowerCase() !== 'ended' && session.status.toLowerCase() !== 'revoked' && session.status.toLowerCase() !== 'expired',
  );

  if (!profile.profile.managedMediaEntitled || !hasServer) {
    return 'linked-server';
  }

  if (staleServer || !isBillingActive) {
    return 'entitlement';
  }

  if (serverStatus.includes('offline') || serverStatus.includes('error') || hasActiveSession === false) {
    return 'relay';
  }

  return isBillingActive ? (hasActiveSession ? 'mixed-signals' : 'unknown') : 'billing';
};

export const buildRescueCase = (profile: OperatorSupportProfile | null): OperatorRescueProfile => {
  const failureClass = toRescueFailure(profile);
  const safeActionByClass: Record<RescueFailureClass, string> = {
    authentication: 'Confirm the customer identity, then send a fresh password reset link and re-test auth from their device.',
    billing: 'Open Financials for this customer first, confirm plan status, then add a billing note or escalate to finance if stale.',
    entitlement:
      'Verify entitlement policy and reconcile account subscription details in Financials, then retry access and watch for relay session token refresh.',
    'linked-server': 'Check if a linked self-hosted server is missing or stale and request a fresh server claim link if needed.',
    relay: 'Suspend any active sessions, rotate relay token if needed, then ask for a fresh relay handshake from the customer.',
    'mixed-signals': 'Run through all sections, capture support notes, and escalate to tier-2 if signals remain mixed after mitigation.',
    unknown: 'Open adjacent specialist pages and add a support note to capture manual diagnosis context.',
  };
  const reasonByClass: Record<RescueFailureClass, string> = {
    authentication: 'Recent sign-in is absent or stale, which commonly indicates wrong account context or user confusion.',
    billing: 'No active subscription record suggests entitlement may have dropped despite support expectations.',
    entitlement: 'Profile entitlement flags and subscription posture do not align cleanly with expected access policy.',
    'linked-server': 'No linked server or an unhealthy server link prevents relay handoff for self-hosted customers.',
    relay: 'Relay status signals suggest revoked, stale, or absent relay sessions/tokens.',
    'mixed-signals': 'Multiple signals are partially healthy, so this case is likely service- or timing-related.',
    unknown: 'State requires extra context from logs and case actions before safe recommendations can be guaranteed.',
  };
  const billingStatus = profile?.profile.subscription?.status?.toLowerCase() ?? null;
  const isBillingActive = billingStatus === 'active' || billingStatus === 'trialing';
  const linkedServers = profile?.selfHostedServers ?? [];
  const staleServers = linkedServers.filter((server) => {
    const lastSeen = server.lastSeenAt ? Date.parse(server.lastSeenAt) : NaN;
    if (Number.isNaN(lastSeen)) return true;
    return Date.now() - lastSeen > 72 * 60 * 60 * 1000;
  });

  const sessionCount = (profile?.recentRelaySessions ?? []).filter((session) =>
    !['ended', 'revoked', 'expired'].includes((session.status ?? '').toLowerCase()),
  ).length;
  const criticalSignals: string[] = [];
  if (!isBillingActive && profile?.profile.subscription) {
    criticalSignals.push('Billing status is not active/trialing.');
  }
  if (linkedServers.length === 0) {
    criticalSignals.push('No linked server present.');
  }
  if (linkedServers.some((server) => ['offline', 'degraded'].includes((server.relayStatus ?? '').toLowerCase()))) {
    criticalSignals.push('Linked server relay status is not healthy.');
  }

  return {
    queryKey: profile?.profile.id ?? 'unknown',
    failureClass,
    failureReason: reasonByClass[failureClass],
    nextSafeAction: safeActionByClass[failureClass],
    summary: {
      account: profile?.profile
        ? {
            ...profile.profile,
            subscription: profile.profile.subscription,
          }
        : {
            id: '',
            email: null,
            displayName: null,
            managedMediaEntitled: false,
            managedMediaAccessOverride: false,
            isOperator: false,
            createdAt: '',
            updatedAt: '',
            lastSignInAt: null,
            subscription: null,
          },
      subscription: profile?.profile.subscription ?? null,
      selfHostedServers: profile?.selfHostedServers ?? [],
      recentRelaySessions: profile?.recentRelaySessions ?? [],
      relayTokens: profile?.relayTokens ?? [],
      supportNotes: profile?.supportNotes ?? [],
      recentAccessChanges: profile?.recentAccessChanges ?? [],
    },
    entitlement: {
      managedMediaEntitled: profile?.profile.managedMediaEntitled ?? false,
      managedMediaAccessOverride: profile?.profile.managedMediaAccessOverride ?? false,
      entitlementMatchExpected: Boolean(profile?.profile.subscription),
      entitlementSignal: profile?.profile.managedMediaEntitled ? 'Entitled' : 'Not explicitly entitled',
    },
    billing: {
      status: profile?.profile.subscription?.status ?? null,
      tier: profile?.profile.subscription?.tier ?? null,
      currentPeriodEnd: profile?.profile.subscription?.currentPeriodEnd ?? null,
      updatedAt: profile?.profile.subscription?.updatedAt ?? null,
      isActive: isBillingActive,
      needsBillingReview: !isBillingActive,
      reason: billingStatus ? `Subscription status is ${billingStatus}.` : 'No subscription found.',
    },
    relay: {
      hasLinkedServer: linkedServers.length > 0,
      onlineServers: linkedServers.filter((server) => (server.relayStatus ?? '').toLowerCase().includes('online')).length,
      staleServers: staleServers.length,
      recentSessionCount: sessionCount,
      hasRevocableSession: (profile?.recentRelaySessions ?? []).some((session) => session.revocable),
      hasRevocableToken: (profile?.relayTokens ?? []).some((token) => token.revocable),
      criticalSignals,
    },
    caseContext: null,
  };
};

export const useOperatorRescueProfile = (enabled: boolean, userId: string | null) =>
  useQuery({
    queryKey: ['operator-rescue-profile', userId],
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
      return data ? buildRescueCase(data as OperatorSupportProfile) : undefined;
    },
    enabled: Boolean(enabled && userId),
  });

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

export const useOperatorAccessProfiles = (enabled: boolean) =>
  useQuery({
    queryKey: ['operator-access-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<AccessProfile[]>('list-access-profiles');
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled,
  });

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

export const useAccessAuditLog = (enabled: boolean) =>
  useQuery({
    queryKey: ['operator-access-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<AccessAuditRow[]>('list-access-audit-log');
      if (error) {
        throw error;
      }
      return data ?? [];
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
