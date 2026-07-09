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
  foundingMembershipPurchasedAt: string | null;
  waitlistMessage: string | null;
  waitlistState: string | null;
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
  foundingMembershipPurchasedAt,
  waitlistMessage,
  waitlistState,
}: LaunchAccountStateInput): LaunchAccountStateSummary => {
  if (hasLifetimeMembership) {
    const details = [
      "No recurring cloud subscription is required for this Lifetime access source.",
      ...(hasFoundingMembership
        ? ["Founding Member supporter spot is also confirmed for this account."]
        : []),
      "Remote features still depend on account standing, service availability, and an online OmniLux server.",
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
      title: "Founding Member confirmed",
      summary: "This account's Founding Member supporter spot is confirmed.",
      details: [
        purchasedDate
          ? `Purchased on ${purchasedDate}.`
          : "Purchase timestamp is still syncing from Stripe.",
        "Day-one cloud remote relay access remains tied to this account as OmniLux opens the launch lane.",
      ],
    };
  }

  if (waitlistMessage || waitlistState === "cloud-plan") {
    return {
      tone: "info",
      title: "Cloud plan waitlist recorded",
      summary:
        waitlistMessage ??
        "Cloud plan checkout is not open during beta. Join the waitlist from the cards below.",
      details: [
        "Recurring cloud checkout is still closed during beta.",
        "Lifetime and Founding Member purchases remain separate one-time launch offers while availability lasts.",
      ],
    };
  }

  return {
    tone: "neutral",
    title: "Private beta account",
    summary:
      "No paid cloud access is active yet. Local playback and self-hosted setup stay available through the beta path.",
    details: [
      "Use the one-time offer cards below for Lifetime or Founding Member checkout while availability lasts.",
      "Use the cloud plan cards to join a recurring-plan waitlist before subscriptions open.",
    ],
  };
};
