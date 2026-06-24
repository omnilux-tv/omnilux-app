import { AuthKitProvider } from '@workos-inc/authkit-react';
import type { ReactNode } from 'react';
import { buildAppHref } from '@/lib/site-surface';
import { getWorkosRedirectCallbackHref } from '@/surfaces/app/lib/auth-flow';
import { useAuth } from './auth-context';
import {
  hasWorkosConfig,
  workosApiHostname,
  workosClientId,
  workosDevMode,
} from './auth-provider/auth-provider-config';
import { LegacySupabaseAuthBridge } from './auth-provider/legacy-supabase-auth-bridge';
import { WorkosAuthBridge } from './auth-provider/workos-auth-bridge';

export { useAuth };

export const AuthProvider = ({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) => {
  if (!hasWorkosConfig) {
    return <LegacySupabaseAuthBridge enabled={enabled}>{children}</LegacySupabaseAuthBridge>;
  }

  return (
    <AuthKitProvider
      clientId={workosClientId}
      apiHostname={workosApiHostname || undefined}
      devMode={workosDevMode}
      redirectUri={buildAppHref('/auth/callback')}
      onRedirectCallback={({ state }) => {
        window.location.replace(getWorkosRedirectCallbackHref(state));
      }}
    >
      <WorkosAuthBridge enabled={enabled}>{children}</WorkosAuthBridge>
    </AuthKitProvider>
  );
};
