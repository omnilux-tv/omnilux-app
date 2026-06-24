export const workosClientId = (import.meta.env.VITE_WORKOS_CLIENT_ID as string | undefined)?.trim() ?? '';
export const workosApiHostname = (import.meta.env.VITE_WORKOS_API_HOSTNAME as string | undefined)?.trim() ?? '';
export const workosDevMode =
  ((import.meta.env.VITE_WORKOS_DEV_MODE as string | undefined)?.trim().toLowerCase() ?? '') === 'true';
export const hasWorkosConfig = workosClientId.length > 0;

export const getReturnTo = () => {
  if (typeof window === 'undefined') {
    return '/dashboard';
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};
