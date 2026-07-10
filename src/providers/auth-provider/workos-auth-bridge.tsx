import { useAuth as useWorkosAuth } from '@workos-inc/authkit-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { buildAppHref } from '@/lib/site-surface';
import { setCloudAccessTokenProvider } from '@/lib/supabase';
import {
  AuthContext,
  type AuthContextValue,
  type CloudSession,
  type CloudUser,
} from '../auth-context';
import { isWorkosSessionPending } from '../workos-session-state';
import { resolveWorkosAccessToken } from '../workos-token';
import {
  getReturnTo,
  workosApiHostname,
  workosClientId,
} from './auth-provider-config';
import { navigateToWorkosAuthorization } from './workos-auth-navigation';

const getDisplayName = (user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.email || 'OmniLux user';
};

const toCloudUser = (user: NonNullable<ReturnType<typeof useWorkosAuth>['user']>): CloudUser => {
  const displayName = getDisplayName(user);
  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      display_name: displayName,
      full_name: displayName,
      avatar_url: user.profilePictureUrl,
      picture: user.profilePictureUrl,
      workos_user_id: user.id,
    },
  };
};

export const WorkosAuthBridge = ({ children, enabled }: { children: ReactNode; enabled: boolean }) => {
  const {
    isLoading,
    user: workosUser,
    getAccessToken: getWorkosAccessToken,
    getSignInUrl: getWorkosSignInUrl,
    getSignUpUrl: getWorkosSignUpUrl,
    signOut: workosSignOut,
  } = useWorkosAuth();
  const [session, setSession] = useState<CloudSession | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenAttemptSettledForUserId, setTokenAttemptSettledForUserId] = useState<string | null>(null);
  const user = session?.user ?? null;
  const tokenAttemptSettled = !!workosUser && tokenAttemptSettledForUserId === workosUser.id;

  const getAccessToken = useCallback(async () => {
    if (!workosUser) return null;
    return resolveWorkosAccessToken(getWorkosAccessToken, { fallbackAccessToken: session?.access_token ?? null });
  }, [getWorkosAccessToken, session?.access_token, workosUser]);

  useEffect(() => {
    if (!enabled || !workosUser) {
      setCloudAccessTokenProvider(null);
      setSession(null);
      setTokenLoading(false);
      setTokenAttemptSettledForUserId(null);
      return;
    }

    setCloudAccessTokenProvider(getAccessToken);
    let active = true;
    setTokenLoading(true);
    setTokenAttemptSettledForUserId(null);
    void getAccessToken()
      .then((accessToken) => {
        if (!active) return;
        if (!accessToken) {
          setSession(null);
          setCloudAccessTokenProvider(null);
          return;
        }
        setSession({
          access_token: accessToken,
          provider: 'workos',
          user: { ...toCloudUser(workosUser), last_sign_in_at: workosUser.lastSignInAt },
        });
      })
      .finally(() => {
        if (active) {
          setTokenLoading(false);
          setTokenAttemptSettledForUserId(workosUser.id);
        }
      });

    return () => {
      active = false;
      setCloudAccessTokenProvider(null);
    };
  }, [enabled, getAccessToken, workosUser]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (options) => {
      const request = {
        state: { returnTo: options?.returnTo ?? getReturnTo() },
        loginHint: options?.loginHint,
      };
      await navigateToWorkosAuthorization({
        ready: !isLoading,
        getAuthorizationUrl: getWorkosSignInUrl,
        request,
        config: {
          apiHostname: workosApiHostname,
          clientId: workosClientId,
          redirectUri: buildAppHref('/auth/callback'),
        },
        replaceLocation: (url) => window.location.replace(url),
      });
    },
    [getWorkosSignInUrl, isLoading],
  );

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (options) => {
      const request = {
        state: { returnTo: options?.returnTo ?? getReturnTo() },
        loginHint: options?.loginHint,
      };
      await navigateToWorkosAuthorization({
        ready: !isLoading,
        getAuthorizationUrl: getWorkosSignUpUrl,
        request,
        config: {
          apiHostname: workosApiHostname,
          clientId: workosClientId,
          redirectUri: buildAppHref('/auth/callback'),
          screenHint: 'sign-up',
        },
        replaceLocation: (url) => window.location.replace(url),
      });
    },
    [getWorkosSignUpUrl, isLoading],
  );

  const signOut = useCallback(async () => {
    setCloudAccessTokenProvider(null);
    setSession(null);
    await workosSignOut({ returnTo: buildAppHref('/login') });
  }, [workosSignOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: enabled
          ? isWorkosSessionPending({
              isAuthKitLoading: isLoading,
              tokenLoading,
              hasWorkosUser: !!workosUser,
              hasSession: !!session,
              tokenAttemptSettled,
            })
          : false,
        provider: 'workos',
        getAccessToken,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
