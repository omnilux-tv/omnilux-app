import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type CloudAccessTokenProvider = () => Promise<string | null>;

let cloudAccessTokenProvider: CloudAccessTokenProvider | null = null;

export const setCloudAccessTokenProvider = (provider: CloudAccessTokenProvider | null) => {
  cloudAccessTokenProvider = provider;
};

const fetchWithCloudAuth: typeof fetch = async (input, init) => {
  const requestUrl = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  if (!requestUrl.includes('/functions/v1/') || !cloudAccessTokenProvider) {
    return fetch(input, init);
  }

  const accessToken = await cloudAccessTokenProvider();
  if (!accessToken) {
    return fetch(input, init);
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithCloudAuth,
  },
});
