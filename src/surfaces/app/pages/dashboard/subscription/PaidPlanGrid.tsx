import {
  formatCloudPrice,
  paidCloudPlans,
  paidCloudTierOrder,
} from '@/lib/cloud-plans';
import { buildMarketingHref } from '@/lib/site-surface';
import type { SubscriptionBillingViewModel } from './useSubscriptionBilling';

type PaidPlanGridProps = {
  vm: SubscriptionBillingViewModel;
};

export const PaidPlanGrid = ({ vm }: PaidPlanGridProps) => {
  if (vm.currentTier !== 'free') return null;

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Cloud plans preview</h2>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border/50 bg-background/40 p-1">
          {(['monthly', 'annual'] as const).map((interval) => (
            <button
              key={interval}
              type="button"
              onClick={() => vm.setBillingInterval(interval)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                vm.billingInterval === interval ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground'
              }`}
            >
              {interval === 'monthly' ? 'Monthly' : 'Annual'}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-accent">Waitlist open. Checkout opens after beta.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {paidCloudTierOrder.map((tier) => {
          const plan = paidCloudPlans.find((candidate) => candidate.tier === tier)!;
          const price = formatCloudPrice(
            vm.billingInterval === 'monthly' ? plan.monthlyCents : plan.annualCents,
            vm.billingInterval,
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
                onClick={() => void vm.actions.joinCloudPlanWaitlist(tier)}
                disabled={!vm.user || vm.waitlistTier !== null}
                className="mt-3 w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {vm.waitlistTier === tier ? 'Joining waitlist...' : `Join ${plan.name} waitlist`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 max-w-2xl text-xs leading-6 text-muted">
        Cloud plan pricing is shown here for reference while OmniLux is in beta. Recurring cloud checkout is not open
        yet; joining the waitlist records which tier and billing interval you want when public cloud subscriptions open.
        Existing paid customers can still use Stripe-hosted plan management and the{' '}
        <a href={buildMarketingHref('/terms#billing-and-refunds')} className="text-accent hover:underline">
          billing and refund terms
        </a>{' '}
        still apply to completed purchases. See the{' '}
        <a href={buildMarketingHref('/privacy')} className="text-accent hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
};
