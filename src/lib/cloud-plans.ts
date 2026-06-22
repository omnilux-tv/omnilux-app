import {
  cloudBillingAnnualDiscountPercent,
  cloudBillingPlanCopy,
  cloudOfferPriceFormatter,
  foundingMemberOffer,
  getCloudBillingPriceCents,
  isCloudOneTimeOfferIntent,
  lifetimeMembershipOffer,
  paidCloudTierOrder,
  type CloudBillingInterval,
  type CloudBillingPlanCopy,
  type PaidCloudTier,
} from '@omnilux/types';

export type {
  CloudBillingInterval,
  CloudOneTimeOfferCatalogEntry,
  CloudOneTimeOfferIntent,
  PaidCloudTier,
} from '@omnilux/types';
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
export const lifetimePlan = {
  tier: lifetimeMembershipOffer.tier,
  ...lifetimeMembershipOffer.copy,
  priceCents: lifetimeMembershipOffer.priceCents,
} as const satisfies CloudBillingPlanCopy & { tier: PaidCloudTier; priceCents: number };
export const foundingMemberPlan = {
  ...foundingMemberOffer.copy,
  priceCents: foundingMemberOffer.priceCents,
} as const;
export const oneTimeCloudOffers = [lifetimeMembershipOffer, foundingMemberOffer] as const;
export { foundingMemberOffer, isCloudOneTimeOfferIntent, lifetimeMembershipOffer };

export const paidCloudPlans: readonly PaidCloudPlan[] = paidCloudTierOrder.map((tier) => ({
  tier,
  ...cloudBillingPlanCopy[tier],
  monthlyCents: getCloudBillingPriceCents(tier, 'monthly'),
  annualCents: getCloudBillingPriceCents(tier, 'annual'),
}));

const currencyFormatter = new Intl.NumberFormat(cloudOfferPriceFormatter.locale, {
  style: 'currency',
  currency: cloudOfferPriceFormatter.currency,
  minimumFractionDigits: cloudOfferPriceFormatter.minimumFractionDigits,
  maximumFractionDigits: cloudOfferPriceFormatter.maximumFractionDigits,
});

export const formatCloudPrice = (cents: number, interval: CloudBillingInterval) => (
  `${currencyFormatter.format(cents / 100)}/${interval === 'monthly' ? 'mo' : 'yr'}`
);

export const formatOneTimeCloudPrice = (cents: number) => `${currencyFormatter.format(cents / 100)} one-time`;

export const getCloudPlanPriceCents = getCloudBillingPriceCents;
