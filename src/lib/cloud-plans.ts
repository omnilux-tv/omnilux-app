import {
  cloudBillingAnnualDiscountPercent,
  cloudBillingPlanCopy,
  cloudOfferPriceFormatter,
  foundingMemberOffer as sharedFoundingMemberOffer,
  getCloudBillingPriceCents,
  isCloudOneTimeOfferIntent,
  lifetimeMembershipOffer,
  paidCloudTierOrder,
  type CloudBillingInterval,
  type CloudBillingPlanCopy,
  type PaidCloudTier,
} from "@omnilux/types";

export type {
  CloudBillingInterval,
  CloudOneTimeOfferKey,
  CloudOneTimeOfferCatalogEntry,
  CloudOneTimeOfferIntent,
  PaidCloudTier,
} from "@omnilux/types";
export { paidCloudTierOrder } from "@omnilux/types";

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
} as const satisfies CloudBillingPlanCopy & {
  tier: PaidCloudTier;
  priceCents: number;
};
export const foundingMemberOffer = {
  ...sharedFoundingMemberOffer,
  availability: {
    limitCount: sharedFoundingMemberOffer.availability.limitCount,
    limitKind: sharedFoundingMemberOffer.availability.limitKind,
    limitLabel: sharedFoundingMemberOffer.availability.limitLabel,
  },
  copy: {
    ...sharedFoundingMemberOffer.copy,
    description:
      "Limited supporter path for the first 1,000 backers who want launch-era recognition and private product briefings.",
    bullets: [
      "Limited to 1,000 available founding-member spots",
      "Launch-era recognition and private product briefings",
      "One-time supporter purchase, not an investor path",
      "Early-backer status managed separately from recurring OmniPass plans",
    ],
  },
} as const;
export const foundingMemberPlan = {
  ...foundingMemberOffer.copy,
  priceCents: foundingMemberOffer.priceCents,
} as const;
export const oneTimeCloudOffers = [
  lifetimeMembershipOffer,
  foundingMemberOffer,
] as const;
export { isCloudOneTimeOfferIntent, lifetimeMembershipOffer };

export const paidCloudPlans: readonly PaidCloudPlan[] = paidCloudTierOrder.map(
  (tier) => ({
    tier,
    ...cloudBillingPlanCopy[tier],
    monthlyCents: getCloudBillingPriceCents(tier, "monthly"),
    annualCents: getCloudBillingPriceCents(tier, "annual"),
  })
);

const currencyFormatter = new Intl.NumberFormat(
  cloudOfferPriceFormatter.locale,
  {
    style: "currency",
    currency: cloudOfferPriceFormatter.currency,
    minimumFractionDigits: cloudOfferPriceFormatter.minimumFractionDigits,
    maximumFractionDigits: cloudOfferPriceFormatter.maximumFractionDigits,
  }
);

export const formatCloudPrice = (
  cents: number,
  interval: CloudBillingInterval
) =>
  `${currencyFormatter.format(cents / 100)}/${interval === "monthly" ? "mo" : "yr"}`;

export const formatOneTimeCloudPrice = (cents: number) =>
  `${currencyFormatter.format(cents / 100)} one-time`;

export const getCloudPlanPriceCents = getCloudBillingPriceCents;
