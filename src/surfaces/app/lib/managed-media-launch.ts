import {
  establishCloudRuntimeSession,
  postRuntimeJson,
  type CloudRuntimeSessionBridge,
} from "@/surfaces/app/lib/cloud-session-bridge";
import type {
  ManagedMediaUsageEventCreateRequest,
  ManagedMediaUsageEventResponse,
  ManagedMediaPlaybackGrantConsumeRequest,
  ManagedMediaPlaybackGrantConsumeResponse,
  ManagedMediaPlaybackGrantIssueRequest,
  ManagedMediaPlaybackGrantIssueResponse,
  ManagedMediaPlaybackLaunchResponse,
} from "@omnilux/types";

type CloudFunctionInvokeOptions = Parameters<
  typeof import("@/surfaces/app/lib/cloud-functions").invokeCloudFunction
>[1];
type CloudFunctionBody = NonNullable<CloudFunctionInvokeOptions>["body"];

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

const TRUSTED_MANAGED_MEDIA_ORIGIN = "https://media.omnilux.tv";
const GENERIC_RUNTIME_ORIGIN_ERROR =
  "This runtime can only be opened through media.omnilux.tv.";
const GENERIC_RUNTIME_SESSION_ERROR =
  "OmniLux could not start a runtime session for this account.";

const translateManagedMediaSessionError = (error: unknown): Error => {
  if (!(error instanceof Error)) {
    return new Error(
      "OmniLux Media could not start a session for this account."
    );
  }

  if (error.message === GENERIC_RUNTIME_ORIGIN_ERROR) {
    return new Error(
      "OmniLux Media requests must use the protected managed service origin."
    );
  }

  if (error.message === GENERIC_RUNTIME_SESSION_ERROR) {
    return new Error(
      "OmniLux Media could not start a session for this account."
    );
  }

  return error;
};

const invokeManagedMediaCloudFunction = async <TResponse>(
  functionName: string,
  body: CloudFunctionBody
): Promise<TResponse> => {
  const { invokeCloudFunction } =
    await import("@/surfaces/app/lib/cloud-functions");
  return invokeCloudFunction<TResponse>(functionName, { body });
};

export const establishManagedMediaSession = async ({
  mediaOrigin,
  getAccessToken,
  fetch: fetchImpl = fetch,
}: EstablishManagedMediaSessionInput): Promise<void> => {
  await establishManagedMediaBridge({
    mediaOrigin,
    getAccessToken,
    fetch: fetchImpl,
  });
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
    throw translateManagedMediaSessionError(error);
  }
};

export const issueManagedMediaPlaybackGrant = async (
  grantRequest: ManagedMediaPlaybackGrantIssueRequest
): Promise<ManagedMediaPlaybackGrantIssueResponse> => {
  const data =
    await invokeManagedMediaCloudFunction<ManagedMediaPlaybackGrantIssueResponse>(
      "issue-managed-media-playback-grant",
      grantRequest
    );

  if (!data?.token) {
    throw new Error(
      "OmniLux Cloud did not return a managed media playback grant."
    );
  }

  return data;
};

export const consumeManagedMediaPlaybackGrant = async (
  consumeRequest: ManagedMediaPlaybackGrantConsumeRequest
): Promise<ManagedMediaPlaybackGrantConsumeResponse> => {
  const data =
    await invokeManagedMediaCloudFunction<ManagedMediaPlaybackGrantConsumeResponse>(
      "consume-managed-media-playback-grant",
      consumeRequest
    );

  if (data?.status !== "consumed") {
    throw new Error(
      "OmniLux Cloud did not confirm managed media playback grant consumption."
    );
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
    path: "/api/managed-media/playback-launch",
    body: {
      token: issued.token,
      expectedAction: grantRequest.action,
      expectedItemId: grantRequest.media.itemId,
    },
    fetch: fetchImpl,
    errorMessage: "OmniLux Media could not prepare playback for this grant.",
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
    path: "/api/managed-media/usage-events",
    body: event,
    fetch: fetchImpl,
    errorMessage: "OmniLux Media could not record this usage event.",
  });
};
