export const lifetimeFamilyEntitlementSources = [
  "lifetime_purchase",
  "founding_member_purchase",
] as const;

export type LifetimeFamilyEntitlementSource =
  (typeof lifetimeFamilyEntitlementSources)[number];

export const isLifetimeFamilyEntitlementSource = (
  value: unknown
): value is LifetimeFamilyEntitlementSource =>
  lifetimeFamilyEntitlementSources.some((source) => source === value);

export const isFoundingMemberEntitlementSource = (
  value: unknown
): value is "founding_member_purchase" => value === "founding_member_purchase";

type EffectiveEntitlementInput = {
  paidCloudPlan: boolean;
  source: string;
  tier: string;
} | null;

export type FoundingMemberIncludedEntitlement = {
  tier: "family";
  duration: "lifetime";
  active: boolean;
};

type FoundingMembershipInput = {
  status: string;
  includedEntitlement?: FoundingMemberIncludedEntitlement | null;
} | null;

export const getOneTimeFamilyEntitlementState = ({
  effectiveEntitlement,
  foundingMembership,
}: {
  effectiveEntitlement: EffectiveEntitlementInput;
  foundingMembership: FoundingMembershipInput;
}) => {
  const effectiveFamilyEntitlement = Boolean(
    effectiveEntitlement?.paidCloudPlan &&
    effectiveEntitlement.tier === "family"
  );
  const hasLifetimeMembership = Boolean(
    effectiveFamilyEntitlement &&
    effectiveEntitlement?.source === "lifetime_purchase"
  );
  const hasFoundingMembership = Boolean(
    foundingMembership?.status === "paid" ||
    isFoundingMemberEntitlementSource(effectiveEntitlement?.source)
  );
  const hasProjectedFoundingFamilyEntitlement = Boolean(
    foundingMembership?.includedEntitlement?.active === true &&
    foundingMembership.includedEntitlement.tier === "family" &&
    foundingMembership.includedEntitlement.duration === "lifetime"
  );
  const hasFoundingFamilyEntitlement = Boolean(
    hasProjectedFoundingFamilyEntitlement ||
    (effectiveFamilyEntitlement &&
      isFoundingMemberEntitlementSource(effectiveEntitlement?.source))
  );

  return {
    hasLifetimeMembership,
    hasFoundingMembership,
    hasFoundingFamilyEntitlement,
    hasLifetimeFamilyEntitlement:
      hasLifetimeMembership || hasFoundingFamilyEntitlement,
  };
};
