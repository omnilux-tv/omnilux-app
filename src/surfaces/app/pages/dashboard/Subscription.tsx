import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { CreditCard, ExternalLink, Gem } from 'lucide-react';
import {
  annualDiscountPercent,
  formatCloudPrice,
  paidCloudPlans,
  paidCloudTierOrder,
  type CloudBillingInterval,
  type PaidCloudTier,
} from '@/lib/cloud-plans';
import { buildMarketingHref } from '@/lib/site-surface';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';

interface SubscriptionData {
  id: string;
  tier: string;
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  metadata?: {
    billingInterval?: string | null;
    stripeMetadata?: {
      interval?: string | null;
    };
  } | null;
}

interface FoundingMembershipData {
  id: string;
  status: string;
  amount_total: number | null;
  currency: string | null;
  purchased_at: string | null;
}

const tierNames: Record<string, string> = {
  free: 'Free',
  personal: 'Personal',
  duo: 'Duo',
  family: 'Family',
};

export const Subscription = () => {
  const { user } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const [billingError, setBillingError] = useState<string | null>(null);
  const [checkoutTier, setCheckoutTier] = useState<string | null>(null);
  const [portalAction, setPortalAction] = useState<'manage' | 'cancel' | null>(null);
  const [billingInterval, setBillingInterval] = useState<CloudBillingInterval>('monthly');
  const [foundingCheckoutPending, setFoundingCheckoutPending] = useState(false);

  const { data: subscription, error, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as SubscriptionData | null;
    },
    enabled: !!user,
  });

  const {
    data: foundingMembership,
    error: foundingMembershipError,
    isLoading: isFoundingMembershipLoading,
  } = useQuery({
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

  const currentTier = subscription?.tier ?? 'free';
  const hasFoundingMembership = foundingMembership?.status === 'paid';
  const billingPortalAvailable = Boolean(subscription?.stripe_customer_id);
  const currentBillingInterval = subscription?.metadata?.billingInterval
    ?? subscription?.metadata?.stripeMetadata?.interval
    ?? null;
  const checkoutState = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('checkout');
  }, []);
  const portalState = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('portal');
  }, []);
  const foundingState = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('founding');
  }, []);

  const startCheckout = async (tier: PaidCloudTier) => {
    setBillingError(null);
    setCheckoutTier(tier);

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { tier, interval: billingInterval },
    });

    if (error) {
      setCheckoutTier(null);
      setBillingError(error.message);
      return;
    }

    const url = typeof data?.url === 'string' ? data.url : null;
    if (!url) {
      setCheckoutTier(null);
      setBillingError('Stripe checkout URL was not returned.');
      return;
    }

    window.location.assign(url);
  };

  const openBillingPortal = async (action: 'manage' | 'cancel') => {
    setBillingError(null);
    setPortalAction(action);

    const { data, error } = await supabase.functions.invoke('create-billing-portal-session', {
      body: { action },
    });

    if (error) {
      setPortalAction(null);
      setBillingError(error.message);
      return;
    }

    const url = typeof data?.url === 'string' ? data.url : null;
    if (!url) {
      setPortalAction(null);
      setBillingError('Stripe billing portal URL was not returned.');
      return;
    }

    window.location.assign(url);
  };

  const startFoundingMemberCheckout = async () => {
    setBillingError(null);
    setFoundingCheckoutPending(true);

    const { data, error } = await supabase.functions.invoke('create-founding-member-session');

    if (error) {
      setFoundingCheckoutPending(false);
      setBillingError(error.message);
      return;
    }

    const url = typeof data?.url === 'string' ? data.url : null;
    if (!url) {
      setFoundingCheckoutPending(false);
      setBillingError('Stripe checkout URL was not returned.');
      return;
    }

    window.location.assign(url);
  };

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cloud Plan & Billing</h1>
          <p className="mt-1 text-sm text-muted">
            Local playback and hosting stay free. Managed OmniLux media is included with your cloud account, while
            paid billing applies to self-hosted relay remote access and premium cloud services around it.
          </p>
        </div>

        {checkoutState === 'success' ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">
            Checkout completed. Stripe subscription events are syncing now, so your plan status may take a few moments to update.
          </div>
        ) : null}

        {checkoutState === 'canceled' ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
            Checkout was canceled before payment completed. You can try again whenever you are ready.
          </div>
        ) : null}

        {portalState === 'canceled' ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">
            Cancellation was submitted in Stripe. Subscription events are syncing now, so the plan status may take a
            few moments to update.
          </div>
        ) : null}

        {foundingState === 'success' ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">
            Founding-member checkout completed. Your supporter status is syncing now.
          </div>
        ) : null}

        {foundingState === 'canceled' ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
            Founding-member checkout was canceled before payment completed.
          </div>
        ) : null}

        {billingError ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
            {billingError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-surface" />
        ) : (
          <div className="rounded-xl surface-soft p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-accent" />
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {tierNames[currentTier] ?? currentTier} Plan
                </h2>
                {subscription?.status && (
                  <p className="text-sm text-muted capitalize">{subscription.status}</p>
                )}
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted">
                Live subscription data could not be loaded right now. The billing actions below stay available, but
                the plan details on this page might be temporarily stale.
              </div>
            ) : null}

            {subscription?.current_period_end && (
              <p className="mt-3 text-sm text-muted">
                {subscription.status === 'canceled'
                  ? `Access continues until ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`}
              </p>
            )}

            {currentBillingInterval ? (
              <p className="mt-2 text-sm text-muted capitalize">
                {currentBillingInterval === 'annual' ? 'Annual billing' : 'Monthly billing'}
              </p>
            ) : null}

            {currentTier !== 'free' && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void openBillingPortal('manage')}
                  disabled={!billingPortalAvailable || portalAction !== null}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {portalAction === 'manage' ? 'Opening Billing Portal...' : 'Manage Billing'}
                </button>
                {subscription?.status && subscription.status !== 'canceled' && (
                  <button
                    type="button"
                    onClick={() => void openBillingPortal('cancel')}
                    disabled={!billingPortalAvailable || portalAction !== null}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {portalAction === 'cancel' ? 'Opening Cancellation...' : 'Cancel Plan'}
                  </button>
                )}
              </div>
            )}

            {!billingPortalAvailable ? (
              <p className="mt-4 text-sm text-muted">
                Stripe checkout is live below for paid cloud plans. Billing portal access appears automatically after a
                Stripe customer is linked to this account.
              </p>
            ) : null}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl surface-soft p-6">
            <h2 className="text-lg font-bold text-foreground">Included With OmniLux Cloud</h2>
            <p className="mt-2 text-sm text-muted">
              Your cloud account covers identity, hosted account services, and first-party OmniLux media access.
            </p>
            <ul className="mt-4 space-y-2">
              {[
                accessProfile?.managedMediaEntitled
                  ? 'Managed media is enabled for this account.'
                  : 'Managed media is currently disabled for this account.',
                'Local playback and direct self-hosted access stay free.',
                'Billing, account recovery, and device sign-in run through the hosted cloud account.',
              ].map((bullet) => (
                <li key={bullet} className="flex gap-2 text-sm leading-6 text-muted">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl surface-soft p-6">
            <h2 className="text-lg font-bold text-foreground">Paid Cloud Policy</h2>
            <p className="mt-2 text-sm text-muted">
              Self-hosted relay remote access follows the current platform rule, while local and user-owned direct
              access stay outside cloud billing.
            </p>
            <div className="mt-4 rounded-lg bg-surface/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Self-Hosted Relay Access</p>
              <p className="mt-2 text-foreground">
                {accessProfile?.relayAccessPolicyLabel ?? 'Paid cloud subscription required'}
              </p>
              <p className="mt-2 text-sm text-muted">
                {accessProfile?.relayAccessPolicyDescription ??
                  'Self-hosted relay access requires an active OmniLux Cloud subscription.'}
              </p>
              <p className="mt-3 text-xs text-muted">
                {accessProfile?.hasPaidCloudPlan
                  ? 'This account currently has an active or trialing paid cloud plan.'
                  : 'This account does not currently have an active or trialing paid cloud plan.'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl surface-soft p-6">
          <div className="flex items-center gap-3">
            <Gem className="h-6 w-6 text-accent" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Founding Member</h2>
              <p className="text-sm text-muted">
                $499.99 one-time supporter purchase that stays separate from monthly and annual cloud billing.
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted">
            Founding Member is for early supporters who want launch-era recognition, private briefings, and a closer
            seat to the roadmap without entering the investor path.
          </p>

          <ul className="mt-4 space-y-2">
            {[
              '$499.99 one-time purchase, not a recurring plan',
              'Member updates and private launch briefings',
              'Launch-era recognition and supporter status',
            ].map((bullet) => (
              <li key={bullet} className="flex gap-2 text-sm leading-6 text-muted">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          {foundingMembershipError ? (
            <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted">
              Founding-member status could not be loaded right now. Checkout is still available, but this card may be
              temporarily stale.
            </div>
          ) : null}

          {hasFoundingMembership ? (
            <p className="mt-4 text-sm text-muted">
              {foundingMembership?.purchased_at
                ? `Purchased on ${new Date(foundingMembership.purchased_at).toLocaleDateString()}`
                : 'Founding-member access is active.'}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void startFoundingMemberCheckout()}
              disabled={!user || foundingCheckoutPending || isFoundingMembershipLoading}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Gem className="h-4 w-4" />
              {foundingCheckoutPending ? 'Opening Founding Checkout...' : 'Become a Founding Member'}
            </button>
          )}
        </div>

        {currentTier === 'free' && (
          <div>
            <h2 className="mb-4 text-lg font-bold text-foreground">Unlock Cloud Features</h2>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-xl border border-border/50 bg-background/40 p-1">
                {(['monthly', 'annual'] as const).map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => setBillingInterval(interval)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      billingInterval === interval
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {interval === 'monthly' ? 'Monthly' : 'Annual'}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Annual saves {annualDiscountPercent}%
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {paidCloudTierOrder.map((tier) => {
                const plan = paidCloudPlans.find((candidate) => candidate.tier === tier)!;
                const price = formatCloudPrice(
                  billingInterval === 'monthly' ? plan.monthlyCents : plan.annualCents,
                  billingInterval,
                );

                return (
                <div key={tier} className="rounded-xl surface-soft p-4">
                  <h3 className="font-semibold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted">{price}</p>
                  <p className="mt-3 text-sm leading-6 text-muted">{plan.description}</p>
                  <ul className="mt-4 space-y-2">
                    {plan.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-sm leading-6 text-muted">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => void startCheckout(tier)}
                    disabled={!user || checkoutTier !== null}
                    className="mt-3 w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkoutTier === tier ? 'Opening Checkout...' : `Start ${plan.name}`}
                  </button>
                </div>
              )})}
            </div>
            <p className="mt-4 max-w-2xl text-xs leading-6 text-muted">
              Cloud plan pricing is shown here for reference and checkout uses Stripe-hosted billing. Plan management
              and cancellations use the Stripe customer portal and follow the{' '}
              <a href={buildMarketingHref('/terms#billing-and-refunds')} className="text-accent hover:underline">
                billing and refund terms
              </a>
              {' '}and acknowledge the{' '}
              <a href={buildMarketingHref('/privacy')} className="text-accent hover:underline">
                Privacy Policy
              </a>
              . Stripe processes checkout and billing securely on OmniLux&apos;s behalf.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
