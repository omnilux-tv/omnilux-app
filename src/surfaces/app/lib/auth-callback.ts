export const getMissingWorkosSessionMessage = ({
  loading,
  provider,
  hasSession,
}: {
  loading: boolean;
  provider: string;
  hasSession: boolean;
}) => {
  if (provider === 'workos' && !loading && !hasSession) {
    return 'Authentication session could not be established. Request a new sign-in link and try again.';
  }

  return null;
};
