export type PaidCloudTier = 'personal' | 'duo' | 'family';
export type CloudBillingInterval = 'monthly' | 'annual';

export const annualDiscountPercent = 15;
const annualMultiplier = (100 - annualDiscountPercent) / 100;

type PaidCloudPlan = {
  tier: PaidCloudTier;
  name: string;
  description: string;
  bullets: readonly string[];
  monthlyCents: number;
  annualCents: number;
};

const toAnnualCents = (monthlyCents: number) => Math.round(monthlyCents * 12 * annualMultiplier);

export const paidCloudTierOrder = ['personal', 'duo', 'family'] as const;

export const paidCloudPlans: readonly PaidCloudPlan[] = [
  {
    tier: 'personal',
    name: 'Personal',
    description: 'Remote access and cloud-connected features for one primary user.',
    bullets: [
      '1 primary household member',
      '1 concurrent remote stream',
      'Cloud account services and secure remote access',
    ],
    monthlyCents: 499,
    annualCents: toAnnualCents(499),
  },
  {
    tier: 'duo',
    name: 'Duo',
    description: 'Cloud access for two adults sharing one household setup.',
    bullets: [
      '2 household adults',
      '2 concurrent remote streams',
      'Shared invites and household billing',
    ],
    monthlyCents: 799,
    annualCents: toAnnualCents(799),
  },
  {
    tier: 'family',
    name: 'Family',
    description: 'Shared cloud access for households with multiple viewers and devices.',
    bullets: [
      'Up to 5 household members',
      'Up to 5 concurrent remote streams',
      'Same dashboard billing controls and invites',
    ],
    monthlyCents: 999,
    annualCents: toAnnualCents(999),
  },
] as const;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCloudPrice = (cents: number, interval: CloudBillingInterval) => (
  `${currencyFormatter.format(cents / 100)}/${interval === 'monthly' ? 'mo' : 'yr'}`
);

export const getCloudPlanPriceCents = (tier: PaidCloudTier, interval: CloudBillingInterval) => {
  const plan = paidCloudPlans.find((candidate) => candidate.tier === tier);
  if (!plan) {
    throw new Error(`Unknown cloud plan tier: ${tier}`);
  }

  return interval === 'monthly' ? plan.monthlyCents : plan.annualCents;
};
