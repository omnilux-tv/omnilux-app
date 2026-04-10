import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

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
  subscription: {
    tier: string;
    status: string;
    currentPeriodEnd: string | null;
    updatedAt: string;
  } | null;
}

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
