import { CreditCard, ExternalLink } from 'lucide-react';
import type { SubscriptionBillingViewModel } from './useSubscriptionBilling';
import { tierNames } from './useSubscriptionBilling';

type CurrentPlanCardProps = {
  vm: SubscriptionBillingViewModel;
};

export const CurrentPlanCard = ({ vm }: CurrentPlanCardProps) => {
  const { subscriptionState } = vm;
  const billingPortalAvailable = subscriptionState.billingPortalAvailable;

  if (vm.accessProfileQuery.isLoading) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface" />;
  }

  return (
    <div className="rounded-xl surface-soft p-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-accent" />
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {tierNames[subscriptionState.tier] ?? subscriptionState.tier} Plan
          </h2>
          {subscriptionState.status ? (
            <p className="text-sm text-muted capitalize">{subscriptionState.status.replaceAll('_', ' ')}</p>
          ) : null}
        </div>
      </div>

      {vm.accessProfileQuery.error ? (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted">
          Live subscription data could not be loaded right now. The billing actions below stay available, but the plan
          details on this page might be temporarily stale.
        </div>
      ) : null}
      {subscriptionState.currentPeriodEnd ? (
        <p className="mt-3 text-sm text-muted">
          {subscriptionState.status === 'canceled'
            ? `Access continues until ${new Date(subscriptionState.currentPeriodEnd).toLocaleDateString()}`
            : `Renews on ${new Date(subscriptionState.currentPeriodEnd).toLocaleDateString()}`}
        </p>
      ) : null}
      {subscriptionState.billingInterval ? (
        <p className="mt-2 text-sm text-muted capitalize">
          {subscriptionState.billingInterval === 'annual' ? 'Annual billing' : 'Monthly billing'}
        </p>
      ) : null}
      {vm.effectiveEntitlement?.paidCloudPlan ? (
        <p className="mt-2 text-sm text-muted">Access source: {vm.effectiveEntitlement.source.replaceAll('_', ' ')}</p>
      ) : null}

      {subscriptionState.tier !== 'free' ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void vm.actions.openBillingPortal('manage')}
            disabled={!billingPortalAvailable || vm.portalAction !== null}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {vm.portalAction === 'manage' ? 'Opening billing...' : 'Manage billing'}
          </button>
          {subscriptionState.status && subscriptionState.status !== 'canceled' ? (
            <button
              type="button"
              onClick={() => void vm.actions.openBillingPortal('cancel')}
              disabled={!billingPortalAvailable || vm.portalAction !== null}
              className="rounded-lg px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {vm.portalAction === 'cancel' ? 'Opening cancellation...' : 'Cancel plan'}
            </button>
          ) : null}
        </div>
      ) : null}

      {!billingPortalAvailable ? (
        <p className="mt-4 text-sm text-muted">
          Stripe checkout is live below for paid cloud plans. Billing portal access appears automatically after a Stripe
          customer is linked to this account.
        </p>
      ) : null}
    </div>
  );
};
