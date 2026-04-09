import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export interface AccessProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  managedMediaEntitled: boolean;
  isOperator: boolean;
  createdAt: string;
  updatedAt: string;
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
