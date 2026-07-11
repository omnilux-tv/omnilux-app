import type { FoundingMemberIncludedEntitlement } from "@/surfaces/app/lib/one-time-family-entitlement";

export interface AccessProfileFoundingMembershipState {
  id: string;
  status: string;
  amountTotal: number | null;
  currency: string | null;
  purchasedAt: string | null;
  includedEntitlement: FoundingMemberIncludedEntitlement;
}

export const getAccessProfileFoundingMembership = (
  accessProfile:
    | {
        foundingMembership: AccessProfileFoundingMembershipState | null;
      }
    | null
    | undefined
) => accessProfile?.foundingMembership ?? null;
