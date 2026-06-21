export const isWorkosSessionPending = ({
  isAuthKitLoading,
  tokenLoading,
  hasWorkosUser,
  hasSession,
  tokenAttemptSettled,
}: {
  isAuthKitLoading: boolean;
  tokenLoading: boolean;
  hasWorkosUser: boolean;
  hasSession: boolean;
  tokenAttemptSettled: boolean;
}) => (
  isAuthKitLoading ||
  tokenLoading ||
  (hasWorkosUser && !hasSession && !tokenAttemptSettled)
);
