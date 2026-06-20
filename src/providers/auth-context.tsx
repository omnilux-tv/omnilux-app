import { createContext, useContext } from 'react';

export interface CloudUser {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    picture?: string | null;
    workos_user_id?: string | null;
  };
}

export interface CloudSession {
  access_token: string;
  provider: 'workos' | 'supabase_auth';
  user: CloudUser & {
    last_sign_in_at?: string | null;
  };
}

export interface AuthContextValue {
  user: CloudUser | null;
  session: CloudSession | null;
  loading: boolean;
  provider: 'workos' | 'supabase_auth' | 'unconfigured';
  getAccessToken: () => Promise<string | null>;
  signIn: (options?: { returnTo?: string; loginHint?: string }) => Promise<void>;
  signUp: (options?: { returnTo?: string; loginHint?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: false,
  provider: 'unconfigured',
  getAccessToken: async () => null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);
