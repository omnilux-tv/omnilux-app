const getAccessProfileErrorStatus = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  if (typeof status === 'number') {
    return status;
  }

  const context = (error as { context?: { status?: unknown } }).context;
  return typeof context?.status === 'number' ? context.status : null;
};

export const shouldRetryAccessProfileQuery = (failureCount: number, error: unknown): boolean => {
  const status = getAccessProfileErrorStatus(error);
  if (status === 401 || status === 403) {
    return false;
  }

  return failureCount < 1;
};
