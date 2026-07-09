import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import type { CloudBillingInterval } from "@/lib/cloud-plans";
import { shouldRetryAccessProfileQuery } from "@/surfaces/app/lib/access-profile-retry";
import { invokeCloudFunction } from "@/surfaces/app/lib/cloud-functions";

export interface AccessProfileSubscription {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  updatedAt: string;
}

export interface LaunchEntitlementContractSubscription {
  tier: string;
  billingState: string;
  planState: string;
  billingInterval: CloudBillingInterval | "unknown" | null;
  currentPeriodEnd: string | null;
  updatedAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  metadata?: Record<string, unknown>;
}

export interface LaunchEntitlementContract {
  version: string;
  subscription: LaunchEntitlementContractSubscription;
  effectiveEntitlement?: {
    paidCloudPlan: boolean;
    source: string;
    id: string | null;
    tier: string;
    planState: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    updatedAt: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripeCheckoutSessionId: string | null;
    stripePaymentIntentId: string | null;
    metadata?: Record<string, unknown>;
  } | null;
  entitlements?: Record<string, unknown>;
  manualStates?: Record<string, unknown>;
  policies?: Record<string, unknown>;
  tierEligibleForPaidPlan?: boolean;
  matrix?: Record<string, unknown>;
}

export interface AccessProfileSubscriptionState {
  tier: string;
  status: string | null;
  currentPeriodEnd: string | null;
  billingInterval: CloudBillingInterval | null;
  billingPortalAvailable: boolean;
}

export interface AccessProfileCloudPlanWaitlist {
  id: string;
  tier: string;
  interval: CloudBillingInterval;
  source: string;
  status: "waiting" | "invited";
  createdAt: string;
  updatedAt: string;
}

export interface AccessProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  managedMediaEntitled: boolean;
  managedMediaAccessOverride: boolean;
  managedMediaPolicy: "all-authenticated-users" | "explicit-per-profile";
  relayAccessPolicy: "all-authenticated-users" | "paid-subscription";
  relayAccessPolicyLabel: string;
  relayAccessPolicyDescription: string;
  hasPaidCloudPlan: boolean;
  relayRemoteAccessEntitled: boolean;
  relayRemoteSessionsEnabled: boolean;
  isOperator: boolean;
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string | null;
  sessionIssuedAt: string | null;
  sessionExpiresAt: string | null;
  sessionAssuranceLevel: string | null;
  launchEntitlementContract: LaunchEntitlementContract | null;
  cloudPlanWaitlist: AccessProfileCloudPlanWaitlist | null;
  subscription: AccessProfileSubscription | null;
}

const normalizeBillingInterval = (
  value: unknown
): CloudBillingInterval | null =>
  value === "monthly" || value === "annual" ? value : null;

export const getAccessProfileSubscriptionState = (
  accessProfile: AccessProfile | null | undefined
): AccessProfileSubscriptionState => {
  const contractSubscription =
    accessProfile?.launchEntitlementContract?.subscription ?? null;
  const effectiveEntitlement =
    accessProfile?.launchEntitlementContract?.effectiveEntitlement ?? null;
  const fallbackSubscription = accessProfile?.subscription ?? null;
  const tier = effectiveEntitlement?.paidCloudPlan
    ? effectiveEntitlement.tier
    : (contractSubscription?.tier ?? fallbackSubscription?.tier ?? "free");

  return {
    tier,
    status: effectiveEntitlement?.paidCloudPlan
      ? effectiveEntitlement.planState
      : (contractSubscription?.billingState ??
        fallbackSubscription?.status ??
        null),
    currentPeriodEnd:
      effectiveEntitlement?.endsAt ??
      contractSubscription?.currentPeriodEnd ??
      fallbackSubscription?.currentPeriodEnd ??
      null,
    billingInterval: normalizeBillingInterval(
      contractSubscription?.billingInterval
    ),
    billingPortalAvailable: Boolean(contractSubscription?.stripeCustomerId),
  };
};

export const useAccessProfile = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["access-profile", session?.user.id],
    queryFn: () => invokeCloudFunction<AccessProfile>("get-access-profile"),
    retry: shouldRetryAccessProfileQuery,
    enabled: !!session?.access_token,
  });
};
