import {
  cloudBillingAnnualDiscountPercent,
  cloudBillingPlanCopy,
  getCloudBillingPriceCents,
  paidCloudTierOrder,
  type CloudBillingInterval,
  type PaidCloudTier,
} from '@omnilux/types';

export type { CloudBillingInterval, PaidCloudTier } from '@omnilux/types';
export { paidCloudTierOrder } from '@omnilux/types';

type PaidCloudPlan = {
  tier: PaidCloudTier;
  name: string;
  description: string;
  bullets: readonly string[];
  monthlyCents: number;
  annualCents: number;
};

export const annualDiscountPercent = cloudBillingAnnualDiscountPercent;

export const paidCloudPlans: readonly PaidCloudPlan[] = paidCloudTierOrder.map((tier) => ({
  tier,
  ...cloudBillingPlanCopy[tier],
  monthlyCents: getCloudBillingPriceCents(tier, 'monthly'),
  annualCents: getCloudBillingPriceCents(tier, 'annual'),
}));

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCloudPrice = (cents: number, interval: CloudBillingInterval) => (
  `${currencyFormatter.format(cents / 100)}/${interval === 'monthly' ? 'mo' : 'yr'}`
);

export const getCloudPlanPriceCents = getCloudBillingPriceCents;
