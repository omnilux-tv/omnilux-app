import { invokeCloudFunction } from '@/surfaces/app/lib/cloud-functions';
import {
  establishCloudRuntimeSession,
  postRuntimeJson,
  type CloudRuntimeSessionBridge,
} from '@/surfaces/app/lib/cloud-session-bridge';
import type {
  ManagedMediaUsageEventCreateRequest,
  ManagedMediaUsageEventResponse,
  ManagedMediaPlaybackGrantConsumeRequest,
  ManagedMediaPlaybackGrantConsumeResponse,
  ManagedMediaPlaybackGrantIssueRequest,
  ManagedMediaPlaybackGrantIssueResponse,
  ManagedMediaPlaybackLaunchResponse,
} from '@omnilux/types';

interface EstablishManagedMediaSessionInput {
  mediaOrigin: string;
  getAccessToken: () => Promise<string | null>;
  fetch?: typeof fetch;
}

interface LaunchManagedMediaPlaybackInput extends EstablishManagedMediaSessionInput {
  grantRequest: ManagedMediaPlaybackGrantIssueRequest;
}

interface RecordManagedMediaUsageEventInput extends EstablishManagedMediaSessionInput {
  event: ManagedMediaUsageEventCreateRequest;
}

const TRUSTED_MANAGED_MEDIA_ORIGIN = 'https://media.omnilux.tv';

export const establishManagedMediaSession = async ({
  mediaOrigin,
  getAccessToken,
  fetch: fetchImpl = fetch,
}: EstablishManagedMediaSessionInput): Promise<string> => {
  const bridge = await establishManagedMediaBridge({
    mediaOrigin,
    getAccessToken,
    fetch: fetchImpl,
  });
  return bridge.destination;
};

const establishManagedMediaBridge = async ({
  mediaOrigin,
  getAccessToken,
  fetch: fetchImpl = fetch,
}: EstablishManagedMediaSessionInput): Promise<CloudRuntimeSessionBridge> => {
  try {
    return await establishCloudRuntimeSession({
      runtimeOrigin: mediaOrigin,
      trustedOrigin: TRUSTED_MANAGED_MEDIA_ORIGIN,
      getAccessToken,
      fetch: fetchImpl,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'This runtime can only be opened through media.omnilux.tv.'
    ) {
      throw new Error('OmniLux Media can only be opened through media.omnilux.tv.');
    }
    if (
      error instanceof Error &&
      error.message === 'OmniLux could not start a runtime session for this account.'
    ) {
      throw new Error('OmniLux Media could not start a session for this account.');
    }
    throw error;
  }
};

export const issueManagedMediaPlaybackGrant = async (
  grantRequest: ManagedMediaPlaybackGrantIssueRequest,
): Promise<ManagedMediaPlaybackGrantIssueResponse> => {
  const data = await invokeCloudFunction<ManagedMediaPlaybackGrantIssueResponse>(
    'issue-managed-media-playback-grant',
    {
      body: grantRequest,
    },
  );

  if (!data?.token) {
    throw new Error('OmniLux Cloud did not return a managed media playback grant.');
  }

  return data;
};

export const consumeManagedMediaPlaybackGrant = async (
  consumeRequest: ManagedMediaPlaybackGrantConsumeRequest,
): Promise<ManagedMediaPlaybackGrantConsumeResponse> => {
  const data = await invokeCloudFunction<ManagedMediaPlaybackGrantConsumeResponse>(
    'consume-managed-media-playback-grant',
    {
      body: consumeRequest,
    },
  );

  if (data?.status !== 'consumed') {
    throw new Error('OmniLux Cloud did not confirm managed media playback grant consumption.');
  }

  return data;
};

export const launchManagedMediaPlayback = async ({
  mediaOrigin,
  getAccessToken,
  grantRequest,
  fetch: fetchImpl = fetch,
}: LaunchManagedMediaPlaybackInput): Promise<ManagedMediaPlaybackLaunchResponse> => {
  const bridge = await establishManagedMediaBridge({
    mediaOrigin,
    getAccessToken,
    fetch: fetchImpl,
  });
  const issued = await issueManagedMediaPlaybackGrant(grantRequest);
  return postRuntimeJson<ManagedMediaPlaybackLaunchResponse>({
    bridge,
    path: '/api/managed-media/playback-launch',
    body: {
      token: issued.token,
      expectedAction: grantRequest.action,
      expectedItemId: grantRequest.media.itemId,
    },
    fetch: fetchImpl,
    errorMessage: 'OmniLux Media could not prepare playback for this grant.',
  });
};

export const recordManagedMediaUsageEvent = async ({
  mediaOrigin,
  getAccessToken,
  event,
  fetch: fetchImpl = fetch,
}: RecordManagedMediaUsageEventInput): Promise<ManagedMediaUsageEventResponse> => {
  const bridge = await establishManagedMediaBridge({
    mediaOrigin,
    getAccessToken,
    fetch: fetchImpl,
  });
  return postRuntimeJson<ManagedMediaUsageEventResponse>({
    bridge,
    path: '/api/managed-media/usage-events',
    body: event,
    fetch: fetchImpl,
    errorMessage: 'OmniLux Media could not record this usage event.',
  });
};
