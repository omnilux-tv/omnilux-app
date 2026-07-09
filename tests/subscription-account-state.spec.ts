import { expect, test } from "@playwright/test";
import { getLaunchAccountStateSummary } from "../src/surfaces/app/pages/dashboard/subscription/launch-account-state";

test("launch account state calls out an active lifetime purchase as the paid access source", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Family",
      hasLifetimeMembership: true,
      hasFoundingMembership: false,
      foundingMembershipPurchasedAt: null,
      waitlistMessage: null,
      waitlistState: null,
    })
  ).toEqual({
    tone: "success",
    title: "Lifetime Membership active",
    summary:
      "Family-level OmniPass is active from this account's one-time Lifetime purchase.",
    details: [
      "No recurring cloud subscription is required for this Lifetime access source.",
      "Remote features still depend on account standing, service availability, and an online OmniLux server.",
    ],
  });
});

test("launch account state keeps founding member confirmation visible when lifetime access is also active", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Family",
      hasLifetimeMembership: true,
      hasFoundingMembership: true,
      foundingMembershipPurchasedAt: "2026-07-09T02:00:00.000Z",
      waitlistMessage: null,
      waitlistState: null,
    })
  ).toEqual({
    tone: "success",
    title: "Lifetime Membership active",
    summary:
      "Family-level OmniPass is active from this account's one-time Lifetime purchase.",
    details: [
      "No recurring cloud subscription is required for this Lifetime access source.",
      "Founding Member supporter spot is also confirmed for this account.",
      "Remote features still depend on account standing, service availability, and an online OmniLux server.",
    ],
  });
});

test("launch account state calls out a confirmed founding member purchase", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Free",
      hasLifetimeMembership: false,
      hasFoundingMembership: true,
      foundingMembershipPurchasedAt: "2026-07-09T02:00:00.000Z",
      waitlistMessage: null,
      waitlistState: null,
    })
  ).toEqual({
    tone: "success",
    title: "Founding Member confirmed",
    summary: "This account's Founding Member supporter spot is confirmed.",
    details: [
      "Purchased on Jul 9, 2026.",
      "Day-one cloud remote relay access remains tied to this account as OmniLux opens the launch lane.",
    ],
  });
});

test("launch account state keeps cloud waitlist actions visible after signup handoff", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Free",
      hasLifetimeMembership: false,
      hasFoundingMembership: false,
      foundingMembershipPurchasedAt: null,
      waitlistMessage: "You are on the Family annual cloud plan waitlist.",
      waitlistState: "cloud-plan",
    })
  ).toEqual({
    tone: "info",
    title: "Cloud plan waitlist recorded",
    summary: "You are on the Family annual cloud plan waitlist.",
    details: [
      "Recurring cloud checkout is still closed during beta.",
      "Lifetime and Founding Member purchases remain separate one-time launch offers while availability lasts.",
    ],
  });
});

test("launch account state defaults to private beta when no purchase or waitlist is active", () => {
  expect(
    getLaunchAccountStateSummary({
      tierLabel: "Free",
      hasLifetimeMembership: false,
      hasFoundingMembership: false,
      foundingMembershipPurchasedAt: null,
      waitlistMessage: null,
      waitlistState: null,
    })
  ).toEqual({
    tone: "neutral",
    title: "Private beta account",
    summary:
      "No paid cloud access is active yet. Local playback and self-hosted setup stay available through the beta path.",
    details: [
      "Use the one-time offer cards below for Lifetime or Founding Member checkout while availability lasts.",
      "Use the cloud plan cards to join a recurring-plan waitlist before subscriptions open.",
    ],
  });
});
