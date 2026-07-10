const AUTH_HANDOFF_ORIGINS = [
  'https://login.omnilux.tv',
  'https://auth.omnilux.tv',
  'https://forwarder.workos.com',
] as const;

export const getAuthHandoffPreconnectLinks = () =>
  AUTH_HANDOFF_ORIGINS.map((href) => ({ rel: 'preconnect' as const, href }));
