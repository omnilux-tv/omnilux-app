const DEFAULT_RELAY_SITE_URL = 'https://relay.omnilux.tv';

function normalizeOrigin(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;
  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    return fallback;
  }
}

export interface CreateRelaySessionResponse {
  sessionId: string;
  token: string;
  expiresAt: string;
  relay: {
    status: string;
    region?: string | null;
    protocolVersion?: number | null;
    capabilities?: Record<string, unknown> | null;
  };
}

const RELAY_SITE_ORIGIN = normalizeOrigin(
  import.meta.env.VITE_RELAY_SITE_URL,
  DEFAULT_RELAY_SITE_URL,
);

export function buildRelaySessionUrl(token: string): string {
  return `${RELAY_SITE_ORIGIN}/r/${encodeURIComponent(token)}/`;
}

export function hasRemoteHttpRelaySupport(capabilities: Record<string, unknown> | null | undefined): boolean {
  return capabilities?.sessionBridging === true
    && capabilities.httpProxy === true
    && capabilities.streaming === true;
}
