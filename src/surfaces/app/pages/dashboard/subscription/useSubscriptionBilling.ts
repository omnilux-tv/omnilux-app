import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  foundingMemberOffer,
  isCloudOneTimeOfferIntent,
  lifetimeMembershipOffer,
  type CloudBillingInterval,
  type PaidCloudTier,
} from '@/lib/cloud-plans';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import {
  getAccessProfileSubscriptionState,
  useAccessProfile,
} from '@/surfaces/app/lib/access-profile';
import { invokeCloudFunction } from '@/surfaces/app/lib/cloud-functions';

interface FoundingMembershipData {
  id: string;
  status: string;
  amount_total: number | null;
  currency: string | null;
  purchased_at: string | null;
}

const readSearchParam = (name: string) => {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
};

export const tierNames: Record<string, string> = {
  free: 'Free',
  personal: 'Personal',
  duo: 'Duo',
  family: 'Family',
};

export const useSubscriptionBilling = () => {
  const { user } = useAuth();
  const accessProfileQuery = useAccessProfile();
  const [billingError, setBillingError] = useState<string | null>(null);
  const [waitlistTier, setWaitlistTier] = useState<string | null>(null);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);
  const [portalAction, setPortalAction] = useState<'manage' | 'cancel' | null>(null);
  const [billingInterval, setBillingInterval] = useState<CloudBillingInterval>('monthly');
  const [foundingCheckoutPending, setFoundingCheckoutPending] = useState(false);
  const [lifetimeCheckoutPending, setLifetimeCheckoutPending] = useState(false);
  const autoCheckoutHandledRef = useRef(false);

  const foundingMembershipQuery = useQuery({
    queryKey: ['founding-membership', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('founding_memberships')
        .select('id, status, amount_total, currency, purchased_at')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as FoundingMembershipData | null;
    },
    enabled: !!user,
  });

  const accessProfile = accessProfileQuery.data;
  const subscriptionState = getAccessProfileSubscriptionState(accessProfile);
  const effectiveEntitlement = accessProfile?.launchEntitlementContract?.effectiveEntitlement ?? null;
  const currentTier = subscriptionState.tier;
  const hasLifetimeMembership = Boolean(effectiveEntitlement?.source === 'lifetime_purchase' && effectiveEntitlement.paidCloudPlan);
  const hasFoundingMembership = foundingMembershipQuery.data?.status === 'paid';
  const checkoutState = useMemo(() => readSearchParam('checkout'), []);
  const waitlistState = useMemo(() => readSearchParam('waitlist'), []);
  const portalState = useMemo(() => readSearchParam('portal'), []);
  const foundingState = useMemo(() => readSearchParam('founding'), []);
  const lifetimeState = useMemo(() => readSearchParam('lifetime'), []);

  const redirectToCloudUrl = async (
    invoke: () => Promise<{ url?: unknown }>,
    pending: (value: boolean) => void,
    fallback: string,
  ) => {
    setBillingError(null);
    pending(true);
    try {
      const data = await invoke();
      const url = typeof data?.url === 'string' ? data.url : null;
      if (!url) {
        pending(false);
        setBillingError('Stripe checkout URL was not returned.');
        return;
      }
      window.location.assign(url);
    } catch (error) {
      pending(false);
      setBillingError(error instanceof Error ? error.message : fallback);
    }
  };

  const joinCloudPlanWaitlist = async (tier: PaidCloudTier, intervalOverride?: CloudBillingInterval) => {
    const selectedInterval = intervalOverride ?? billingInterval;
    setBillingError(null);
    setWaitlistMessage(null);
    setWaitlistTier(tier);
    try {
      await invokeCloudFunction<{ message?: unknown }>('join-cloud-plan-waitlist', {
        body: { tier, interval: selectedInterval, source: 'dashboard' },
      });
      setWaitlistMessage(`You are on the ${tierNames[tier]} ${selectedInterval} cloud plan waitlist.`);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Unable to join the cloud plan waitlist.');
    } finally {
      setWaitlistTier(null);
    }
  };

  const openBillingPortal = async (action: 'manage' | 'cancel') => {
    setBillingError(null);
    setPortalAction(action);
    try {
      const data = await invokeCloudFunction<{ url?: unknown }>('create-billing-portal-session', { body: { action } });
      const url = typeof data?.url === 'string' ? data.url : null;
      if (!url) {
        setPortalAction(null);
        setBillingError('Stripe billing portal URL was not returned.');
        return;
      }
      window.location.assign(url);
    } catch (error) {
      setPortalAction(null);
      setBillingError(error instanceof Error ? error.message : 'Unable to open billing portal.');
    }
  };

  const clearAutoCheckoutParams = () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.delete('intent');
    params.delete('tier');
    params.delete('interval');
    params.delete('waitlist');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  };

  const startFoundingMemberCheckout = () =>
    redirectToCloudUrl(
      () => invokeCloudFunction<{ url?: unknown }>(foundingMemberOffer.checkoutFunctionName),
      setFoundingCheckoutPending,
      'Unable to start founding member checkout.',
    );

  const startLifetimeMembershipCheckout = () =>
    redirectToCloudUrl(
      () => invokeCloudFunction<{ url?: unknown }>(lifetimeMembershipOffer.checkoutFunctionName),
      setLifetimeCheckoutPending,
      'Unable to start lifetime checkout.',
    );

  useEffect(() => {
    if (typeof window === 'undefined' || !user || autoCheckoutHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const intent = params.get('intent');
    const tier = params.get('tier');
    const interval = params.get('interval');
    const isCloudTier = tier === 'personal' || tier === 'duo' || tier === 'family';
    const isBillingInterval = interval === 'monthly' || interval === 'annual';
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
      const selectedInterval: CloudBillingInterval = isBillingInterval ? interval : 'monthly';
      setBillingInterval(selectedInterval);
      void joinCloudPlanWaitlist(tier, selectedInterval);
    }
  }, [user]);

  return {
    user,
    accessProfile,
    accessProfileQuery,
    foundingMembership: foundingMembershipQuery.data,
    foundingMembershipQuery,
    billingError,
    waitlistTier,
    waitlistMessage,
    portalAction,
    billingInterval,
    setBillingInterval,
    foundingCheckoutPending,
    lifetimeCheckoutPending,
    subscriptionState,
    effectiveEntitlement,
    currentTier,
    hasLifetimeMembership,
    hasFoundingMembership,
    states: { checkoutState, waitlistState, portalState, foundingState, lifetimeState },
    actions: { joinCloudPlanWaitlist, openBillingPortal, startFoundingMemberCheckout, startLifetimeMembershipCheckout },
  };
};

export type SubscriptionBillingViewModel = ReturnType<typeof useSubscriptionBilling>;
