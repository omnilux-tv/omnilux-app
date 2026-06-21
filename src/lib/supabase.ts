import { createClient } from '@supabase/supabase-js';
import { createCloudFunctionFetch, type CloudAccessTokenProvider } from '@/lib/cloud-function-fetch';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let cloudAccessTokenProvider: CloudAccessTokenProvider | null = null;

export const setCloudAccessTokenProvider = (provider: CloudAccessTokenProvider | null) => {
  cloudAccessTokenProvider = provider;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: createCloudFunctionFetch({
      fetch,
      getCloudAccessTokenProvider: () => cloudAccessTokenProvider,
      fallbackAuthorizationHeader: `Bearer ${supabaseAnonKey}`,
    }),
  },
});
