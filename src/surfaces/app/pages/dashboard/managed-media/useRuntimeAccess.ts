import { useState } from "react";
import type { CustomerOverview } from "@/surfaces/app/lib/customer-overview";
import { fallbackMediaOrigin } from "./model";

type RuntimeAccessArgs = {
  overview: CustomerOverview | undefined;
};

export const useRuntimeAccess = ({ overview }: RuntimeAccessArgs) => {
  const [launchError, setLaunchError] = useState<string | null>(null);
  const managedMediaOrigin =
    overview?.managedMediaRuntime?.publicOrigin ?? fallbackMediaOrigin;
  const managedMediaAvailable = Boolean(
    overview?.access.managedMediaEntitled && overview?.managedMediaRuntime
  );

  return {
    launchError,
    setLaunchError,
    managedMediaOrigin,
    managedMediaAvailable,
  };
};
