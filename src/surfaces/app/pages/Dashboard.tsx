import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { buildOpsHref } from "@/lib/site-surface";
import { useAccessProfile } from "@/surfaces/app/lib/access-profile";
import { useCustomerOverview } from "@/surfaces/app/lib/customer-overview";
import { getCustomerDashboardRedirect } from "@/surfaces/app/lib/dashboard-routing";
import { hasPrivateBetaReviewIntent } from "@/surfaces/app/lib/private-beta";
import { CoreJourney } from "./dashboard/dashboard-home/CoreJourney";
import { EcosystemTools } from "./dashboard/dashboard-home/EcosystemTools";
import { ManagedMediaNotice } from "./dashboard/dashboard-home/ManagedMediaNotice";
import { PrimaryDashboardLinks } from "./dashboard/dashboard-home/PrimaryDashboardLinks";
import { PrivateBetaStatusCard } from "./dashboard/dashboard-home/PrivateBetaStatusCard";
import { createOperatorLink } from "./dashboard/dashboard-home/dashboardLinks";

const clearPrivateBetaReviewIntent = () => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.delete("intent");
  const query = params.toString();
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
  );
};

export const Dashboard = () => {
  const { user } = useAuth();
  const {
    data: accessProfile,
    isLoading: isAccessProfileLoading,
    error: accessProfileError,
    refetch: refetchAccessProfile,
  } = useAccessProfile();
  const {
    data: customerOverview,
    isLoading: isCustomerOverviewLoading,
    error: customerOverviewError,
  } = useCustomerOverview();
  const displayName =
    user?.user_metadata?.display_name ?? user?.email ?? "User";
  const opsDashboardHref = buildOpsHref("/dashboard");
  const operatorRedirectHref = getCustomerDashboardRedirect(
    accessProfile,
    opsDashboardHref
  );
  const operatorLink = operatorRedirectHref
    ? createOperatorLink(operatorRedirectHref)
    : null;
  const privateBetaReviewRequested =
    typeof window !== "undefined" &&
    hasPrivateBetaReviewIntent(window.location.search);

  useEffect(() => {
    if (operatorRedirectHref) {
      window.location.replace(operatorRedirectHref);
    }
  }, [operatorRedirectHref]);

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium text-muted">Account</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
          Overview
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          {displayName}, this is your OmniLux account hub. Your libraries and
          playback stay on your server, while this space handles identity,
          billing, and connected experiences around it.
        </p>

        <PrivateBetaStatusCard
          privateBeta={accessProfile?.privateBeta}
          isLoading={isAccessProfileLoading}
          loadError={accessProfileError}
          reviewRequested={privateBetaReviewRequested}
          onRequestRecorded={refetchAccessProfile}
          onReviewHandled={clearPrivateBetaReviewIntent}
        />
        <CoreJourney
          customerOverview={customerOverview}
          isLoading={isCustomerOverviewLoading}
          error={customerOverviewError}
        />
        <PrimaryDashboardLinks />
        <ManagedMediaNotice customerOverview={customerOverview} />
        <EcosystemTools operatorLink={operatorLink} />
      </div>
    </div>
  );
};
