import { useState } from 'react';
import type { CustomerOverview } from '@/surfaces/app/lib/customer-overview';
import { establishManagedMediaSession } from '@/surfaces/app/lib/managed-media-launch';
import { fallbackMediaOrigin } from './model';

type RuntimeAccessArgs = {
  getAccessToken: () => Promise<string | null>;
  overview: CustomerOverview | undefined;
};

export const useRuntimeAccess = ({ getAccessToken, overview }: RuntimeAccessArgs) => {
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const managedMediaOrigin = overview?.managedMediaRuntime?.publicOrigin ?? fallbackMediaOrigin;
  const managedMediaAvailable = Boolean(overview?.access.managedMediaEntitled && overview?.managedMediaRuntime);

  const openManagedMedia = async () => {
    setLaunching(true);
    setLaunchError(null);
    try {
      const destination = await establishManagedMediaSession({ mediaOrigin: managedMediaOrigin, getAccessToken });
      window.location.assign(destination);
    } catch (caughtError) {
      setLaunchError(
        caughtError instanceof Error ? caughtError.message : 'OmniLux Media could not start a session for this account.',
      );
    } finally {
      setLaunching(false);
    }
  };

  return {
    launching,
    launchError,
    setLaunchError,
    managedMediaOrigin,
    managedMediaAvailable,
    openManagedMedia,
  };
};
