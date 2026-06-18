import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type { CloudBillingInterval } from '@/lib/cloud-plans';

export interface AccessProfileSubscription {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  updatedAt: string;
}

export interface LaunchEntitlementContractSubscription {
  tier: string;
  billingState: string;
  planState: string;
  billingInterval: CloudBillingInterval | 'unknown' | null;
  currentPeriodEnd: string | null;
  updatedAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  metadata?: Record<string, unknown>;
}

export interface LaunchEntitlementContract {
  version: string;
  subscription: LaunchEntitlementContractSubscription;
  entitlements?: Record<string, unknown>;
  manualStates?: Record<string, unknown>;
  policies?: Record<string, unknown>;
  tierEligibleForPaidPlan?: boolean;
  matrix?: Record<string, unknown>;
}

export interface AccessProfileSubscriptionState {
  tier: string;
  status: string | null;
  currentPeriodEnd: string | null;
  billingInterval: CloudBillingInterval | null;
  billingPortalAvailable: boolean;
}

export interface AccessProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  managedMediaEntitled: boolean;
  managedMediaAccessOverride: boolean;
  managedMediaPolicy: 'all-authenticated-users' | 'explicit-per-profile';
  relayAccessPolicy: 'all-authenticated-users' | 'paid-subscription';
  relayAccessPolicyLabel: string;
  relayAccessPolicyDescription: string;
  hasPaidCloudPlan: boolean;
  relayRemoteAccessEntitled: boolean;
  isOperator: boolean;
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string | null;
  sessionIssuedAt: string | null;
  sessionExpiresAt: string | null;
  sessionAssuranceLevel: string | null;
  launchEntitlementContract: LaunchEntitlementContract | null;
  subscription: AccessProfileSubscription | null;
}

const normalizeBillingInterval = (value: unknown): CloudBillingInterval | null => (
  value === 'monthly' || value === 'annual' ? value : null
);

export const getAccessProfileSubscriptionState = (
  accessProfile: AccessProfile | null | undefined,
): AccessProfileSubscriptionState => {
  const contractSubscription = accessProfile?.launchEntitlementContract?.subscription ?? null;
  const fallbackSubscription = accessProfile?.subscription ?? null;
  const tier = contractSubscription?.tier ?? fallbackSubscription?.tier ?? 'free';

  return {
    tier,
    status: contractSubscription?.billingState ?? fallbackSubscription?.status ?? null,
    currentPeriodEnd: contractSubscription?.currentPeriodEnd ?? fallbackSubscription?.currentPeriodEnd ?? null,
    billingInterval: normalizeBillingInterval(contractSubscription?.billingInterval),
    billingPortalAvailable: Boolean(contractSubscription?.stripeCustomerId),
  };
};

export const useAccessProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['access-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<AccessProfile>('get-access-profile');
      if (error) {
        throw error;
      }
      return data as AccessProfile;
    },
    enabled: !!user,
  });
};
