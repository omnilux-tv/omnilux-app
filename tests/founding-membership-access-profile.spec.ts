import { expect, test } from "@playwright/test";
import { getAccessProfileFoundingMembership } from "../src/surfaces/app/lib/access-profile-founding-membership";

test("founding membership billing state comes from the actor-scoped access profile", () => {
  const foundingMembership = {
    id: "founding-1",
    status: "paid",
    amountTotal: 9900,
    currency: "usd",
    purchasedAt: "2026-07-09T02:00:00.000Z",
  };

  expect(getAccessProfileFoundingMembership({ foundingMembership })).toEqual(
    foundingMembership
  );
  expect(getAccessProfileFoundingMembership(null)).toBeNull();
});
