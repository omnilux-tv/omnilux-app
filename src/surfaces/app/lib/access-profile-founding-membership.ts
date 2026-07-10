export interface AccessProfileFoundingMembershipState {
  id: string;
  status: string;
  amountTotal: number | null;
  currency: string | null;
  purchasedAt: string | null;
}

export const getAccessProfileFoundingMembership = (
  accessProfile:
    | {
        foundingMembership: AccessProfileFoundingMembershipState | null;
      }
    | null
    | undefined
) => accessProfile?.foundingMembership ?? null;
