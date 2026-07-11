import { expect, test } from "@playwright/test";
import {
  foundingMemberOffer,
  lifetimeMembershipOffer,
} from "../src/lib/cloud-plans";
import {
  getOneTimeFamilyEntitlementState,
  isFoundingMemberEntitlementSource,
  isLifetimeFamilyEntitlementSource,
} from "../src/surfaces/app/lib/one-time-family-entitlement";
import { getLaunchAccountStateSummary } from "../src/surfaces/app/pages/dashboard/subscription/launch-account-state";
import {
  isOneTimeCloudCheckoutEnabled,
  isOneTimeCloudCheckoutExplicitlyEnabled,
} from "../src/surfaces/app/pages/dashboard/subscription/one-time-checkout-gate";

test("one-time checkout requires an explicit true flag", () => {
  expect(isOneTimeCloudCheckoutExplicitlyEnabled(undefined)).toBe(false);
  expect(isOneTimeCloudCheckoutExplicitlyEnabled("")).toBe(false);
  expect(isOneTimeCloudCheckoutExplicitlyEnabled("false")).toBe(false);
  expect(isOneTimeCloudCheckoutExplicitlyEnabled(" true ")).toBe(true);
});

test("one-time checkout also requires every catalog offer to be open", () => {
  expect(
    isOneTimeCloudCheckoutEnabled("true", [
      { checkoutStatus: "closed-private-beta" },
    ])
  ).toBe(false);
  expect(
    isOneTimeCloudCheckoutEnabled("true", [{ checkoutStatus: "open" }])
  ).toBe(true);
  expect(
    isOneTimeCloudCheckoutEnabled("false", [{ checkoutStatus: "open" }])
  ).toBe(false);
});

test("Founding Member carries the same lifetime Family entitlement as Lifetime while checkout stays closed", () => {
  expect(foundingMemberOffer.tier).toBe(lifetimeMembershipOffer.tier);
  expect(foundingMemberOffer.tier).toBe("family");
  expect(foundingMemberOffer.checkoutStatus).toBe("closed-private-beta");
  expect(foundingMemberOffer.purchaseRules).toContain(
    "grant-family-tier-entitlement"
  );
  expect(foundingMemberOffer.purchaseRules).not.toContain(
    "supporter-path-only"
  );
  expect(foundingMemberOffer.copy.bullets).toContain(
    "Family relay access comes only through the OmniPass entitlement"
  );
});

test("access-profile entitlement helpers recognize both one-time Family sources", () => {
  expect(isLifetimeFamilyEntitlementSource("lifetime_purchase")).toBe(true);
  expect(isLifetimeFamilyEntitlementSource("founding_member_purchase")).toBe(
    true
  );
  expect(isLifetimeFamilyEntitlementSource("subscription")).toBe(false);
  expect(isFoundingMemberEntitlementSource("founding_member_purchase")).toBe(
    true
  );
});

test("a paid Founding row remains the lifetime Family authority when another Family source wins effective ranking", () => {
  expect(
    getOneTimeFamilyEntitlementState({
      effectiveEntitlement: {
        paidCloudPlan: true,
        source: "subscription",
        tier: "family",
      },
      foundingMembership: {
        status: "paid",
        includedEntitlement: {
          tier: "family",
          duration: "lifetime",
          active: true,
        },
      },
    })
  ).toEqual({
    hasLifetimeMembership: false,
    hasFoundingMembership: true,
    hasFoundingFamilyEntitlement: true,
    hasLifetimeFamilyEntitlement: true,
  });
});

test("a paid Founding row fails closed while its included Family projection is inactive", () => {
  expect(
    getOneTimeFamilyEntitlementState({
      effectiveEntitlement: null,
      foundingMembership: {
        status: "paid",
        includedEntitlement: {
          tier: "family",
          duration: "lifetime",
          active: false,
        },
      },
    })
  ).toEqual({
    hasLifetimeMembership: false,
    hasFoundingMembership: true,
    hasFoundingFamilyEntitlement: false,
    hasLifetimeFamilyEntitlement: false,
  });
});

test("launch account state calls out an active lifetime purchase as the paid access source", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Family",
      hasLifetimeMembership: true,
      hasFoundingMembership: false,
      hasFoundingFamilyEntitlement: false,
      foundingMembershipPurchasedAt: null,
      waitlistMessage: null,
      waitlistState: null,
      cloudPlanWaitlist: null,
    })
  ).toEqual({
    tone: "success",
    title: "Lifetime Membership active",
    summary:
      "Family-level OmniPass is active from this account's one-time Lifetime purchase.",
    details: [
      "No recurring cloud subscription is required for this Lifetime access source.",
      "Relay is included only through Family and remains subject to renewable leases, fair-use and capacity limits, account standing, and service availability—never unlimited.",
    ],
  });
});

test("launch account state keeps founding member confirmation visible when lifetime access is also active", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Family",
      hasLifetimeMembership: true,
      hasFoundingMembership: true,
      hasFoundingFamilyEntitlement: false,
      foundingMembershipPurchasedAt: "2026-07-09T02:00:00.000Z",
      waitlistMessage: null,
      waitlistState: null,
      cloudPlanWaitlist: null,
    })
  ).toEqual({
    tone: "success",
    title: "Lifetime Membership active",
    summary:
      "Family-level OmniPass is active from this account's one-time Lifetime purchase.",
    details: [
      "No recurring cloud subscription is required for this Lifetime access source.",
      "Founding Member is also confirmed with recognition and feedback benefits; its Family entitlement does not stack into unlimited relay.",
      "Relay is included only through Family and remains subject to renewable leases, fair-use and capacity limits, account standing, and service availability—never unlimited.",
    ],
  });
});

test("launch account state recognizes a founding-member purchase as active lifetime Family access", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Family",
      hasLifetimeMembership: false,
      hasFoundingMembership: true,
      hasFoundingFamilyEntitlement: true,
      foundingMembershipPurchasedAt: "2026-07-09T02:00:00.000Z",
      waitlistMessage: null,
      waitlistState: null,
      cloudPlanWaitlist: null,
    })
  ).toEqual({
    tone: "success",
    title: "Founding Member + Family active",
    summary:
      "Family-level OmniPass is active from this account's one-time Founding Member purchase.",
    details: [
      "No recurring cloud subscription is required for this lifetime Family access source.",
      "Founding Member purchased on Jul 9, 2026.",
      "Founding recognition and closer product feedback are included with the Family entitlement.",
      "Relay is included only through Family and remains subject to renewable leases, fair-use and capacity limits, account standing, and service availability—never unlimited.",
    ],
  });
});

test("launch account state calls out a confirmed founding member purchase", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Free",
      hasLifetimeMembership: false,
      hasFoundingMembership: true,
      hasFoundingFamilyEntitlement: false,
      foundingMembershipPurchasedAt: "2026-07-09T02:00:00.000Z",
      waitlistMessage: null,
      waitlistState: null,
      cloudPlanWaitlist: null,
    })
  ).toEqual({
    tone: "success",
    title: "Founding Member confirmed — Family access syncing",
    summary:
      "This one-time customer product includes lifetime Family-level OmniPass, but the account access profile has not confirmed that entitlement yet.",
    details: [
      "Purchased on Jul 9, 2026.",
      "Founding recognition and closer product feedback are included alongside the Family entitlement.",
      "Do not rely on Family or relay access until this card reports Founding Member + Family active.",
    ],
  });
});

test("launch account state keeps cloud waitlist actions visible after signup handoff", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Free",
      hasLifetimeMembership: false,
      hasFoundingMembership: false,
      hasFoundingFamilyEntitlement: false,
      foundingMembershipPurchasedAt: null,
      waitlistMessage: "You are on the Family annual cloud plan waitlist.",
      waitlistState: "cloud-plan",
      cloudPlanWaitlist: null,
    })
  ).toEqual({
    tone: "info",
    title: "Cloud plan waitlist recorded",
    summary: "You are on the Family annual cloud plan waitlist.",
    details: [
      "Recurring cloud checkout is still closed during beta.",
      "Lifetime and Founding Member checkout is also closed during private beta.",
    ],
  });
});

test("launch account state uses persisted cloud waitlist state after refresh", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Free",
      hasLifetimeMembership: false,
      hasFoundingMembership: false,
      hasFoundingFamilyEntitlement: false,
      foundingMembershipPurchasedAt: null,
      waitlistMessage: null,
      waitlistState: null,
      cloudPlanWaitlist: {
        id: "waitlist-1",
        tier: "duo",
        interval: "annual",
        source: "early-access",
        status: "waiting",
        createdAt: "2026-07-09T00:00:00.000Z",
        updatedAt: "2026-07-09T02:00:00.000Z",
      },
    })
  ).toEqual({
    tone: "info",
    title: "Cloud plan waitlist recorded",
    summary: "You are on the Duo annual cloud plan waitlist.",
    details: [
      "Recurring cloud checkout is still closed during beta.",
      "Lifetime and Founding Member checkout is also closed during private beta.",
    ],
  });
});

test("launch account state defaults to private beta when no purchase or waitlist is active", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Free",
      hasLifetimeMembership: false,
      hasFoundingMembership: false,
      hasFoundingFamilyEntitlement: false,
      foundingMembershipPurchasedAt: null,
      waitlistMessage: null,
      waitlistState: null,
      cloudPlanWaitlist: null,
    })
  ).toEqual({
    tone: "neutral",
    title: "Private beta account",
    summary:
      "No paid cloud access is active yet. Local playback and self-hosted setup stay available through the beta path.",
    details: [
      "Lifetime and Founding Member offer cards are informational while one-time checkout remains closed.",
      "Use the cloud plan cards to join a recurring-plan waitlist before subscriptions open.",
    ],
  });
});
