import { useEffect, useMemo, useRef, useState } from "react";
import {
  foundingMemberOffer,
  isCloudOneTimeOfferIntent,
  lifetimeMembershipOffer,
  type CloudBillingInterval,
  type CloudOneTimeOfferKey,
  type PaidCloudTier,
} from "@/lib/cloud-plans";
import { useAuth } from "@/providers/AuthProvider";
import {
  getAccessProfileSubscriptionState,
  useAccessProfile,
} from "@/surfaces/app/lib/access-profile";
import { getAccessProfileFoundingMembership } from "@/surfaces/app/lib/access-profile-founding-membership";
import { invokeCloudFunction } from "@/surfaces/app/lib/cloud-functions";
import { getOneTimeFamilyEntitlementState } from "@/surfaces/app/lib/one-time-family-entitlement";
import {
  isOneTimeCloudCheckoutEnabled,
  ONE_TIME_CLOUD_CHECKOUT_CLOSED_MESSAGE,
} from "./one-time-checkout-gate";
import { createCheckoutIdempotencyStore } from "./checkout-idempotency";
import { getSoldOutOneTimeOfferNotice } from "./one-time-offer-errors";

const readSearchParam = (name: string) => {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
};

export const tierNames: Record<string, string> = {
  free: "Free",
  personal: "Personal",
  duo: "Duo",
  family: "Family",
};

const oneTimeCheckoutEnabled = isOneTimeCloudCheckoutEnabled(
  import.meta.env.VITE_ONE_TIME_CLOUD_CHECKOUT_ENABLED,
  [foundingMemberOffer, lifetimeMembershipOffer]
);

export const useSubscriptionBilling = () => {
  const { user } = useAuth();
  const accessProfileQuery = useAccessProfile();
  const [billingError, setBillingError] = useState<string | null>(null);
  const [waitlistTier, setWaitlistTier] = useState<string | null>(null);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);
  const [portalAction, setPortalAction] = useState<"manage" | "cancel" | null>(
    null
  );
  const [billingInterval, setBillingInterval] =
    useState<CloudBillingInterval>("monthly");
  const [foundingCheckoutPending, setFoundingCheckoutPending] = useState(false);
  const [lifetimeCheckoutPending, setLifetimeCheckoutPending] = useState(false);
  const [soldOutOneTimeOffer, setSoldOutOneTimeOffer] =
    useState<CloudOneTimeOfferKey | null>(null);
  const autoCheckoutHandledRef = useRef(false);
  const checkoutIdempotencyRef = useRef(createCheckoutIdempotencyStore());

  const accessProfile = accessProfileQuery.data;
  const foundingMembership = getAccessProfileFoundingMembership(accessProfile);
  const foundingMembershipQuery = accessProfileQuery;
  const subscriptionState = getAccessProfileSubscriptionState(accessProfile);
  const effectiveEntitlement =
    accessProfile?.launchEntitlementContract?.effectiveEntitlement ?? null;
  const currentTier = subscriptionState.tier;
  const {
    hasLifetimeMembership,
    hasFoundingMembership,
    hasFoundingFamilyEntitlement,
    hasLifetimeFamilyEntitlement,
  } = getOneTimeFamilyEntitlementState({
    effectiveEntitlement,
    foundingMembership,
  });
  const checkoutState = useMemo(() => readSearchParam("checkout"), []);
  const waitlistState = useMemo(() => readSearchParam("waitlist"), []);
  const portalState = useMemo(() => readSearchParam("portal"), []);
  const foundingState = useMemo(() => readSearchParam("founding"), []);
  const lifetimeState = useMemo(() => readSearchParam("lifetime"), []);

  const redirectToCloudUrl = async (
    invoke: () => Promise<{ url?: unknown }>,
    pending: (value: boolean) => void,
    fallback: string,
    checkoutScope?: CloudOneTimeOfferKey
  ) => {
    setBillingError(null);
    pending(true);
    try {
      setSoldOutOneTimeOffer(null);
      const data = await invoke();
      const url = typeof data?.url === "string" ? data.url : null;
      if (!url) {
        if (checkoutScope)
          checkoutIdempotencyRef.current.complete(checkoutScope);
        pending(false);
        setBillingError("Stripe checkout URL was not returned.");
        return;
      }
      if (checkoutScope) checkoutIdempotencyRef.current.complete(checkoutScope);
      window.location.assign(url);
    } catch (error) {
      if (checkoutScope) {
        checkoutIdempotencyRef.current.handleFailure(checkoutScope, error);
      }
      pending(false);
      const soldOutNotice = await getSoldOutOneTimeOfferNotice(error);
      if (soldOutNotice) {
        setSoldOutOneTimeOffer(soldOutNotice.key);
        setBillingError(soldOutNotice.message);
        return;
      }
      setBillingError(error instanceof Error ? error.message : fallback);
    }
  };

  const joinCloudPlanWaitlist = async (
    tier: PaidCloudTier,
    intervalOverride?: CloudBillingInterval
  ) => {
    const selectedInterval = intervalOverride ?? billingInterval;
    setBillingError(null);
    setWaitlistMessage(null);
    setWaitlistTier(tier);
    try {
      await invokeCloudFunction<{ message?: unknown }>(
        "join-cloud-plan-waitlist",
        {
          body: { tier, interval: selectedInterval, source: "dashboard" },
        }
      );
      setWaitlistMessage(
        `You are on the ${tierNames[tier]} ${selectedInterval} cloud plan waitlist.`
      );
      await accessProfileQuery.refetch();
    } catch (error) {
      setBillingError(
        error instanceof Error
          ? error.message
          : "Unable to join the cloud plan waitlist."
      );
    } finally {
      setWaitlistTier(null);
    }
  };

  const openBillingPortal = async (action: "manage" | "cancel") => {
    setBillingError(null);
    setPortalAction(action);
    try {
      const data = await invokeCloudFunction<{ url?: unknown }>(
        "create-billing-portal-session",
        { body: { action } }
      );
      const url = typeof data?.url === "string" ? data.url : null;
      if (!url) {
        setPortalAction(null);
        setBillingError("Stripe billing portal URL was not returned.");
        return;
      }
      window.location.assign(url);
    } catch (error) {
      setPortalAction(null);
      setBillingError(
        error instanceof Error
          ? error.message
          : "Unable to open billing portal."
      );
    }
  };

  const clearAutoCheckoutParams = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.delete("intent");
    params.delete("tier");
    params.delete("interval");
    params.delete("waitlist");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    );
  };

  const startFoundingMemberCheckout = () => {
    if (!oneTimeCheckoutEnabled) {
      setBillingError(ONE_TIME_CLOUD_CHECKOUT_CLOSED_MESSAGE);
      return;
    }
    return redirectToCloudUrl(
      () =>
        invokeCloudFunction<{ url?: unknown }>(
          foundingMemberOffer.checkoutFunctionName,
          checkoutIdempotencyRef.current.getOrCreateInvokeOptions(
            foundingMemberOffer.key
          )
        ),
      setFoundingCheckoutPending,
      "Unable to start founding member checkout.",
      foundingMemberOffer.key
    );
  };

  const startLifetimeMembershipCheckout = () => {
    if (!oneTimeCheckoutEnabled) {
      setBillingError(ONE_TIME_CLOUD_CHECKOUT_CLOSED_MESSAGE);
      return;
    }
    return redirectToCloudUrl(
      () =>
        invokeCloudFunction<{ url?: unknown }>(
          lifetimeMembershipOffer.checkoutFunctionName,
          checkoutIdempotencyRef.current.getOrCreateInvokeOptions(
            lifetimeMembershipOffer.key
          )
        ),
      setLifetimeCheckoutPending,
      "Unable to start lifetime checkout.",
      lifetimeMembershipOffer.key
    );
  };

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !user ||
      autoCheckoutHandledRef.current
    )
      return;
    const params = new URLSearchParams(window.location.search);
    const intent = params.get("intent");
    const tier = params.get("tier");
    const interval = params.get("interval");
    const isCloudTier =
      tier === "personal" || tier === "duo" || tier === "family";
    const isBillingInterval = interval === "monthly" || interval === "annual";
    if (!isCloudOneTimeOfferIntent(intent) && !isCloudTier) return;

    autoCheckoutHandledRef.current = true;
    clearAutoCheckoutParams();
    if (intent === foundingMemberOffer.intent) {
      void startFoundingMemberCheckout();
      return;
    }
    if (intent === lifetimeMembershipOffer.intent) {
      void startLifetimeMembershipCheckout();
      return;
    }
    if (isCloudTier) {
      const selectedInterval: CloudBillingInterval = isBillingInterval
        ? interval
        : "monthly";
      setBillingInterval(selectedInterval);
      void joinCloudPlanWaitlist(tier, selectedInterval);
    }
  }, [user]);

  return {
    user,
    accessProfile,
    accessProfileQuery,
    foundingMembership,
    foundingMembershipQuery,
    billingError,
    waitlistTier,
    waitlistMessage,
    portalAction,
    billingInterval,
    setBillingInterval,
    foundingCheckoutPending,
    lifetimeCheckoutPending,
    oneTimeCheckoutEnabled,
    soldOutOneTimeOffer,
    subscriptionState,
    effectiveEntitlement,
    currentTier,
    hasLifetimeMembership,
    hasLifetimeFamilyEntitlement,
    hasFoundingMembership,
    hasFoundingFamilyEntitlement,
    states: {
      checkoutState,
      waitlistState,
      portalState,
      foundingState,
      lifetimeState,
    },
    actions: {
      joinCloudPlanWaitlist,
      openBillingPortal,
      startFoundingMemberCheckout,
      startLifetimeMembershipCheckout,
    },
  };
};

export type SubscriptionBillingViewModel = ReturnType<
  typeof useSubscriptionBilling
>;
