export type LaunchAccountStateTone = "success" | "info" | "neutral";

export type LaunchAccountStateSummary = {
  tone: LaunchAccountStateTone;
  title: string;
  summary: string;
  details: string[];
};

export type LaunchAccountStateInput = {
  tierLabel: string;
  hasLifetimeMembership: boolean;
  hasFoundingMembership: boolean;
  hasFoundingFamilyEntitlement: boolean;
  foundingMembershipPurchasedAt: string | null;
  waitlistMessage: string | null;
  waitlistState: string | null;
  cloudPlanWaitlist: {
    tier: string;
    interval: string;
    status: string;
  } | null;
};

const cloudTierLabels: Record<string, string> = {
  personal: "Personal",
  duo: "Duo",
  family: "Family",
};

const formatPurchasedDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

export const getLaunchAccountStateSummary = ({
  tierLabel,
  hasLifetimeMembership,
  hasFoundingMembership,
  hasFoundingFamilyEntitlement,
  foundingMembershipPurchasedAt,
  waitlistMessage,
  waitlistState,
  cloudPlanWaitlist,
}: LaunchAccountStateInput): LaunchAccountStateSummary => {
  if (hasFoundingFamilyEntitlement) {
    const purchasedDate = foundingMembershipPurchasedAt
      ? formatPurchasedDate(foundingMembershipPurchasedAt)
      : null;

    return {
      tone: "success",
      title: "Founding Member + Family active",
      summary:
        "Family-level OmniPass is active from this account's one-time Founding Member purchase.",
      details: [
        "No recurring cloud subscription is required for this lifetime Family access source.",
        purchasedDate
          ? `Founding Member purchased on ${purchasedDate}.`
          : "The purchase timestamp is still syncing from Stripe.",
        "Founding recognition and closer product feedback are included with the Family entitlement.",
        "Relay is included only through Family and remains subject to renewable leases, fair-use and capacity limits, account standing, and service availability—never unlimited.",
      ],
    };
  }

  if (hasLifetimeMembership) {
    const details = [
      "No recurring cloud subscription is required for this Lifetime access source.",
      ...(hasFoundingMembership
        ? [
            "Founding Member is also confirmed with recognition and feedback benefits; its Family entitlement does not stack into unlimited relay.",
          ]
        : []),
      "Relay is included only through Family and remains subject to renewable leases, fair-use and capacity limits, account standing, and service availability—never unlimited.",
    ];

    return {
      tone: "success",
      title: "Lifetime Membership active",
      summary: `${tierLabel}-level OmniPass is active from this account's one-time Lifetime purchase.`,
      details,
    };
  }

  if (hasFoundingMembership) {
    const purchasedDate = foundingMembershipPurchasedAt
      ? formatPurchasedDate(foundingMembershipPurchasedAt)
      : null;

    return {
      tone: "success",
      title: "Founding Member confirmed — Family access syncing",
      summary:
        "This one-time customer product includes lifetime Family-level OmniPass, but the account access profile has not confirmed that entitlement yet.",
      details: [
        purchasedDate
          ? `Purchased on ${purchasedDate}.`
          : "Purchase timestamp is still syncing from Stripe.",
        "Founding recognition and closer product feedback are included alongside the Family entitlement.",
        "Do not rely on Family or relay access until this card reports Founding Member + Family active.",
      ],
    };
  }

  const persistedWaitlistMessage = cloudPlanWaitlist
    ? `You are on the ${cloudTierLabels[cloudPlanWaitlist.tier] ?? cloudPlanWaitlist.tier} ${cloudPlanWaitlist.interval} cloud plan waitlist.`
    : null;

  if (
    waitlistMessage ||
    persistedWaitlistMessage ||
    waitlistState === "cloud-plan"
  ) {
    return {
      tone: "info",
      title: "Cloud plan waitlist recorded",
      summary:
        waitlistMessage ??
        persistedWaitlistMessage ??
        "Cloud plan checkout is not open during beta. Join the waitlist from the cards below.",
      details: [
        "Recurring cloud checkout is still closed during beta.",
        "Lifetime and Founding Member checkout is also closed during private beta.",
      ],
    };
  }

  return {
    tone: "neutral",
    title: "Private beta account",
    summary:
      "No paid cloud access is active yet. Local playback and self-hosted setup stay available through the beta path.",
    details: [
      "Lifetime and Founding Member offer cards are informational while one-time checkout remains closed.",
      "Use the cloud plan cards to join a recurring-plan waitlist before subscriptions open.",
    ],
  };
};
