import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type {
  ManagedMediaOperatingMode,
  ManagedMediaPolicy,
  RelayAccessPolicy,
} from '@/surfaces/app/lib/platform-policy';
import type { RelayConditionDetail, RelayConditionState } from '@/surfaces/app/lib/relay-condition';
import type { LaunchEntitlementContract } from '@/surfaces/app/lib/access-profile';

export interface CustomerOverview {
  profile: {
    id: string;
    email: string | null;
    displayName: string | null;
  };
  access: {
    managedMediaEntitled: boolean;
    hasPaidCloudPlan: boolean;
    relayRemoteAccessEntitled: boolean;
    launchEntitlementContract: LaunchEntitlementContract | null;
    billingReconciliation: unknown;
    subscription: {
      tier: string;
      status: string;
      currentPeriodEnd: string | null;
      updatedAt: string;
    } | null;
  };
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
    selfHostedServersTotal: number;
    relayOnlineServersTotal: number;
    relayAttentionServersTotal: number;
    managedMediaServersTotal: number;
  };
  managedMediaRuntime: {
    id: string;
    name: string;
    publicOrigin: string | null;
    relayStatus: string | null;
    relayCondition: RelayConditionState | null;
    relayConditionDetail: RelayConditionDetail | null;
    lastSeenAt: string | null;
    version: string | null;
  } | null;
}

export const useCustomerOverview = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['customer-overview', session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<CustomerOverview>('get-customer-overview');
      if (error) {
        throw error;
      }
      return data as CustomerOverview;
    },
    enabled: Boolean(session?.access_token),
  });
};
