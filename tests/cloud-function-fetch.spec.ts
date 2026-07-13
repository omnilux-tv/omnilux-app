import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createCloudFunctionFetch } from "../src/lib/cloud-function-fetch";
import {
  getAuthProviderMode,
  isLegacySupabaseAuthEnabled,
} from "../src/providers/auth-provider/auth-provider-mode";
import { isWorkosSessionPending } from "../src/providers/workos-session-state";
import { resolveWorkosAccessToken } from "../src/providers/workos-token";
import { getMissingWorkosSessionMessage } from "../src/surfaces/app/lib/auth-callback";
import {
  applyClaimCodeInput,
  normalizeClaimCodeInput,
} from "../src/surfaces/app/lib/claim-code";
import { getClaimServerErrorMessage } from "../src/surfaces/app/lib/claim-server-error";
import {
  getAuthEntryContext,
  getRedirectPathFromSearch,
  getWorkosRedirectCallbackHref,
} from "../src/surfaces/app/lib/auth-flow";
import { getCustomerDashboardRedirect } from "../src/surfaces/app/lib/dashboard-routing";
import { shouldRetryAccessProfileQuery } from "../src/surfaces/app/lib/access-profile-retry";
import {
  buildPrivateBetaRequestBody,
  getPrivateBetaStateLabel,
  hasPrivateBetaReviewIntent,
  privateBetaCanBeRequested,
  PRIVATE_BETA_CONSENT_VERSION,
} from "../src/surfaces/app/lib/private-beta";
import { establishManagedMediaSession } from "../src/surfaces/app/lib/managed-media-launch";
import { getSoldOutOneTimeOfferNotice } from "../src/surfaces/app/pages/dashboard/subscription/one-time-offer-errors";
import {
  getInviteExpiryLabel,
  getInviteStatusLabel,
  getInviteUsageLabel,
  isInviteInactive,
} from "../src/surfaces/app/pages/dashboard/server-detail/server-invites";
import { resolveServerDetailManagementAccess } from "../src/surfaces/app/pages/dashboard/server-detail/server-detail-access";

test("missing WorkOS config stays unconfigured unless legacy Supabase auth is explicitly enabled in dev", () => {
  expect(
    getAuthProviderMode({
      workosClientId: "",
      legacySupabaseAuthEnabled: isLegacySupabaseAuthEnabled({
        isDev: false,
        viteEnableLegacySupabaseAuth: "true",
      }),
    })
  ).toBe("unconfigured");

  expect(
    getAuthProviderMode({
      workosClientId: "",
      legacySupabaseAuthEnabled: isLegacySupabaseAuthEnabled({
        isDev: true,
        viteEnableLegacySupabaseAuth: undefined,
      }),
    })
  ).toBe("unconfigured");

  expect(
    getAuthProviderMode({
      workosClientId: "",
      legacySupabaseAuthEnabled: isLegacySupabaseAuthEnabled({
        isDev: true,
        viteEnableLegacySupabaseAuth: "true",
      }),
    })
  ).toBe("legacy-supabase");

  expect(
    getAuthProviderMode({
      workosClientId: "client_123",
      legacySupabaseAuthEnabled: false,
    })
  ).toBe("workos");
});

test("cloud function fetch fails closed when the WorkOS token is not ready", async () => {
  let calledOrigin = false;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async () => {
      calledOrigin = true;
      return new Response("{}");
    },
    getCloudAccessTokenProvider: () => async () => null,
  });

  await expect(
    fetchWithCloudAuth("https://api.omnilux.tv/functions/v1/get-access-profile")
  ).rejects.toThrow("Cloud access token is not available yet.");
  expect(calledOrigin).toBe(false);
});

test("cloud function fetch fails closed when WorkOS token provider is not registered yet", async () => {
  let calledOrigin = false;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async () => {
      calledOrigin = true;
      return new Response("{}");
    },
    getCloudAccessTokenProvider: () => null,
    fallbackAuthorizationHeader: "Bearer anon-token",
  });

  await expect(
    fetchWithCloudAuth(
      "https://api.omnilux.tv/functions/v1/get-access-profile",
      {
        headers: { Authorization: "Bearer anon-token" },
      }
    )
  ).rejects.toThrow("Cloud access token is not available yet.");
  expect(calledOrigin).toBe(false);
});

test("cloud function fetch fails closed when WorkOS token provider rejects", async () => {
  let calledOrigin = false;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async () => {
      calledOrigin = true;
      return new Response("{}");
    },
    getCloudAccessTokenProvider: () => async () => {
      throw new Error("No access token available");
    },
  });

  await expect(
    fetchWithCloudAuth("https://api.omnilux.tv/functions/v1/get-access-profile")
  ).rejects.toThrow("Cloud access token is not available yet.");
  expect(calledOrigin).toBe(false);
});

test("cloud function fetch rejects legacy Supabase user authorization unless fallback is explicitly allowed", async () => {
  let calledOrigin = false;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async () => {
      calledOrigin = true;
      return new Response("{}");
    },
    getCloudAccessTokenProvider: () => null,
    fallbackAuthorizationHeader: "Bearer anon-token",
  });

  await expect(
    fetchWithCloudAuth(
      "https://api.omnilux.tv/functions/v1/get-access-profile",
      {
        headers: { Authorization: "Bearer supabase-user-token" },
      }
    )
  ).rejects.toThrow("Cloud access token is not available yet.");

  expect(calledOrigin).toBe(false);
});

test("cloud function fetch preserves legacy Supabase authorization only for the explicit dev fallback", async () => {
  let authorization: string | null = null;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async (_input, init) => {
      authorization = new Headers(init?.headers).get("Authorization");
      return new Response("{}");
    },
    getCloudAccessTokenProvider: () => null,
    fallbackAuthorizationHeader: "Bearer anon-token",
    allowAuthorizationHeaderFallback: true,
  });

  await fetchWithCloudAuth(
    "https://api.omnilux.tv/functions/v1/get-access-profile",
    {
      headers: { Authorization: "Bearer supabase-user-token" },
    }
  );

  expect(authorization).toBe("Bearer supabase-user-token");
});

test("cloud function fetch sends the WorkOS bearer token when it is ready", async () => {
  let authorization: string | null = null;
  const fetchWithCloudAuth = createCloudFunctionFetch({
    fetch: async (_input, init) => {
      authorization = new Headers(init?.headers).get("Authorization");
      return new Response("{}");
    },
    getCloudAccessTokenProvider: () => async () => "workos-token",
  });

  await fetchWithCloudAuth(
    "https://api.omnilux.tv/functions/v1/get-access-profile",
    {
      headers: { Authorization: "Bearer anon-token" },
    }
  );

  expect(authorization).toBe("Bearer workos-token");
});

test("one-time offer checkout maps sold-out cloud responses to launch-safe UX copy", async () => {
  const error = Object.assign(
    new Error("Edge Function returned a non-2xx status code"),
    {
      context: Response.json(
        {
          code: "one_time_offer_sold_out",
          error: "Founding Member spots are sold out",
          offer: {
            key: "founding-member",
            limitCount: 1_000,
            usedCount: 1_000,
            remainingCount: 0,
            available: false,
          },
        },
        { status: 409 }
      ),
    }
  );

  await expect(getSoldOutOneTimeOfferNotice(error)).resolves.toEqual({
    key: "founding-member",
    message:
      "Founding Member spots are sold out. Private beta and cloud-plan waitlists are still open while we prepare the next availability window.",
  });
});

test("one-time offer checkout ignores unrelated cloud function failures", async () => {
  const error = Object.assign(
    new Error("Edge Function returned a non-2xx status code"),
    {
      context: Response.json(
        { code: "rate_limited", error: "Too many requests" },
        { status: 429 }
      ),
    }
  );

  await expect(getSoldOutOneTimeOfferNotice(error)).resolves.toBeNull();
});

test("WorkOS token resolution retries transient callback token misses", async () => {
  const calls: Array<{ forceRefresh?: boolean } | undefined> = [];
  const accessToken = await resolveWorkosAccessToken(
    async (options) => {
      calls.push(options);
      if (calls.length < 3) {
        throw new Error("No access token available");
      }
      return "workos-token";
    },
    {
      retryDelayMs: 1,
      wait: async () => {},
    }
  );

  expect(accessToken).toBe("workos-token");
  expect(calls).toEqual([
    undefined,
    { forceRefresh: true },
    { forceRefresh: true },
  ]);
});

test("WorkOS token resolution keeps retrying through the callback handoff window", async () => {
  const calls: Array<{ forceRefresh?: boolean } | undefined> = [];
  const accessToken = await resolveWorkosAccessToken(
    async (options) => {
      calls.push(options);
      if (calls.length < 8) {
        throw new Error("No access token available");
      }
      return "workos-token";
    },
    {
      retryDelayMs: 1,
      wait: async () => {},
    }
  );

  expect(accessToken).toBe("workos-token");
  expect(calls).toHaveLength(8);
  expect(calls[0]).toBeUndefined();
  expect(calls.slice(1)).toEqual(
    Array.from({ length: 7 }, () => ({ forceRefresh: true }))
  );
});

test("WorkOS token resolution keeps a settled session usable through transient token misses", async () => {
  let calls = 0;
  const accessToken = await resolveWorkosAccessToken(
    async () => {
      calls += 1;
      throw new Error("No access token available");
    },
    {
      fallbackAccessToken: "settled-workos-token",
      retryDelayMs: 1,
      wait: async () => {},
    }
  );

  expect(accessToken).toBe("settled-workos-token");
  expect(calls).toBe(8);
});

test("auth redirect preserves cloud plan waitlist intent after sign-up", () => {
  expect(
    getRedirectPathFromSearch(
      "?redirect=%2Fdashboard%2Fsubscription%3Ftier%3Dfamily%26interval%3Dannual%26waitlist%3Dcloud-plan"
    )
  ).toBe(
    "/dashboard/subscription?tier=family&interval=annual&waitlist=cloud-plan"
  );
});

test("auth redirect preserves private beta review intent without submitting a request", () => {
  expect(
    getRedirectPathFromSearch(
      "?redirect=%2Fdashboard%3Fintent%3Dprivate-beta-review"
    )
  ).toBe("/dashboard?intent=private-beta-review");

  expect(
    getWorkosRedirectCallbackHref(
      { returnTo: "/dashboard?intent=private-beta-review" },
      {
        hostname: "app.omnilux.tv",
        origin: "https://app.omnilux.tv",
        protocol: "https:",
        port: "",
      }
    )
  ).toBe("https://app.omnilux.tv/dashboard?intent=private-beta-review");
  expect(hasPrivateBetaReviewIntent("?intent=private-beta-review")).toBe(true);
  expect(hasPrivateBetaReviewIntent("?intent=private-beta-request")).toBe(
    false
  );
});

test("private beta state helpers keep consent explicit and status durable", () => {
  expect(PRIVATE_BETA_CONSENT_VERSION).toBe("household-beta-v1");
  expect(
    buildPrivateBetaRequestBody("/dashboard?intent=private-beta-review")
  ).toEqual({
    source: "account-household-beta",
    landingPath: "/dashboard?intent=private-beta-review",
    consent: true,
    consentVersion: "household-beta-v1",
  });
  expect(privateBetaCanBeRequested(undefined)).toBe(true);
  expect(
    privateBetaCanBeRequested({
      state: "pending-review",
      request: null,
      artifactApproved: false,
      nextAction: "Wait for review.",
    })
  ).toBe(false);
  expect(
    getPrivateBetaStateLabel({
      state: "approved-no-artifact",
      request: null,
      artifactApproved: false,
      nextAction: "Wait for an approved digest.",
    })
  ).toBe("Approved — artifact not ready");
});

test("claim errors explain the cause and the safe recovery action", () => {
  expect(
    getClaimServerErrorMessage(new Error("Claim code has expired"))
  ).toContain("Generate a new code");
  expect(
    getClaimServerErrorMessage(
      new Error("Server already claimed by another account")
    )
  ).toContain("owner account");
  expect(getClaimServerErrorMessage(new Error("Invalid claim code"))).toContain(
    "all six characters"
  );
  expect(getClaimServerErrorMessage(new Error("Failed to fetch"))).toContain(
    "local server is unaffected"
  );
});

test("server invite labels expose usage, expiry, and inactive state", () => {
  const now = new Date("2026-07-08T12:00:00Z");
  const activeInvite = {
    uses: 2,
    max_uses: 5,
    expires_at: "2026-07-09T12:00:00Z",
  };
  const expiredInvite = {
    uses: 0,
    max_uses: 1,
    expires_at: "2026-07-07T12:00:00Z",
  };
  const usedUpInvite = {
    uses: 3,
    max_uses: 3,
    expires_at: null,
  };

  expect(getInviteUsageLabel(activeInvite)).toBe("2/5 used · 3 uses remaining");
  expect(getInviteExpiryLabel(activeInvite, now)).toContain("Expires");
  expect(getInviteStatusLabel(activeInvite, now)).toBe("Active");
  expect(isInviteInactive(activeInvite, now)).toBe(false);

  expect(getInviteStatusLabel(expiredInvite, now)).toBe("Expired");
  expect(isInviteInactive(expiredInvite, now)).toBe(true);
  expect(getInviteStatusLabel(usedUpInvite, now)).toBe("Used up");
  expect(isInviteInactive(usedUpInvite, now)).toBe(true);
});

test("server detail account management fails closed outside owner and admin roles", () => {
  expect(
    resolveServerDetailManagementAccess({
      isOwner: true,
      actorRole: "owner",
      canManageAccess: true,
    })
  ).toEqual({ isOwner: true, actorRole: "owner", canManageAccess: true });
  expect(
    resolveServerDetailManagementAccess({
      isOwner: false,
      actorRole: "admin",
      canManageAccess: true,
    })
  ).toEqual({ isOwner: false, actorRole: "admin", canManageAccess: true });

  for (const actorRole of ["user", "guest", null, "unexpected"]) {
    expect(
      resolveServerDetailManagementAccess({
        isOwner: false,
        actorRole,
        canManageAccess: true,
      }).canManageAccess
    ).toBe(false);
  }
  expect(
    resolveServerDetailManagementAccess({
      isOwner: true,
      actorRole: "admin",
      canManageAccess: true,
    }).isOwner
  ).toBe(false);
});

test("claim code entry accepts full-code paste from any field", () => {
  expect(normalizeClaimCodeInput(" ab-12 c3 ")).toEqual([
    "A",
    "B",
    "1",
    "2",
    "C",
    "3",
  ]);

  expect(applyClaimCodeInput(["", "", "", "", "", ""], 0, "ab12c3")).toEqual([
    "A",
    "B",
    "1",
    "2",
    "C",
    "3",
  ]);
  expect(applyClaimCodeInput(["A", "B", "", "", "", ""], 2, "12c3")).toEqual([
    "A",
    "B",
    "1",
    "2",
    "C",
    "3",
  ]);
});

test("AuthKit entry copy is contextual for claim and invite returns", () => {
  expect(
    getAuthEntryContext("/dashboard/claim?code=abc123", "sign-in")
  ).toMatchObject({
    eyebrow: "Server claim",
    title: "Sign in to attach this server",
  });
  expect(getAuthEntryContext("/invite/abc123", "sign-up")).toMatchObject({
    eyebrow: "Server invite",
    title: "Create your account to accept this invite",
  });
  expect(
    getWorkosRedirectCallbackHref(
      { returnTo: "/invite/abc123" },
      {
        hostname: "app.omnilux.tv",
        origin: "https://app.omnilux.tv",
        protocol: "https:",
        port: "",
      }
    )
  ).toBe("https://app.omnilux.tv/invite/abc123");
});

test("WorkOS token resolution does not reuse an expired settled session token", async () => {
  let calls = 0;
  const expiredPayload = btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 })
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const expiredAccessToken = `header.${expiredPayload}.signature`;
  const accessToken = await resolveWorkosAccessToken(
    async () => {
      calls += 1;
      throw new Error("No access token available");
    },
    {
      fallbackAccessToken: expiredAccessToken,
      retryDelayMs: 1,
      wait: async () => {},
    }
  );

  expect(accessToken).toBeNull();
  expect(calls).toBe(8);
});

test("WorkOS callback reports a failed session instead of spinning forever", () => {
  expect(
    getMissingWorkosSessionMessage({
      loading: false,
      provider: "workos",
      hasSession: false,
    })
  ).toBe(
    "Authentication session could not be established. Request a new sign-in link and try again."
  );

  expect(
    getMissingWorkosSessionMessage({
      loading: true,
      provider: "workos",
      hasSession: false,
    })
  ).toBeNull();

  expect(
    getMissingWorkosSessionMessage({
      loading: false,
      provider: "supabase_auth",
      hasSession: false,
    })
  ).toBeNull();
});

test("WorkOS auth stays loading while a user is waiting on a token-backed session", () => {
  expect(
    isWorkosSessionPending({
      isAuthKitLoading: false,
      tokenLoading: false,
      hasWorkosUser: true,
      hasSession: false,
      tokenAttemptSettled: false,
    })
  ).toBe(true);

  expect(
    isWorkosSessionPending({
      isAuthKitLoading: false,
      tokenLoading: false,
      hasWorkosUser: true,
      hasSession: false,
      tokenAttemptSettled: true,
    })
  ).toBe(false);
});

test("WorkOS redirect callback stays on the app surface", () => {
  expect(
    getWorkosRedirectCallbackHref(
      { returnTo: "/dashboard/billing?tab=plan" },
      {
        hostname: "app.omnilux.tv",
        origin: "https://app.omnilux.tv",
        protocol: "https:",
        port: "",
      }
    )
  ).toBe("https://app.omnilux.tv/dashboard/billing?tab=plan");

  expect(
    getWorkosRedirectCallbackHref(
      { returnTo: "https://evil.example/phish" },
      {
        hostname: "app.omnilux.tv",
        origin: "https://app.omnilux.tv",
        protocol: "https:",
        port: "",
      }
    )
  ).toBe("https://app.omnilux.tv/dashboard");

  expect(
    getWorkosRedirectCallbackHref(
      { returnTo: "//evil.example/phish" },
      {
        hostname: "app.omnilux.tv",
        origin: "https://app.omnilux.tv",
        protocol: "https:",
        port: "",
      }
    )
  ).toBe("https://app.omnilux.tv/dashboard");
});

test("customer dashboard routes operator profiles to the ops console", () => {
  expect(
    getCustomerDashboardRedirect(undefined, "https://ops.omnilux.tv/dashboard")
  ).toBeNull();
  expect(
    getCustomerDashboardRedirect(
      { isOperator: false },
      "https://ops.omnilux.tv/dashboard"
    )
  ).toBeNull();
  expect(
    getCustomerDashboardRedirect(
      { isOperator: true },
      "https://ops.omnilux.tv/dashboard"
    )
  ).toBe("https://ops.omnilux.tv/dashboard");
});

test("managed media API session exchanges the cloud token without exposing a browser destination", async () => {
  let requestedUrl = "";
  let requestedAuthorization: string | null = null;
  let requestedCredentials: RequestCredentials | undefined;
  let requestedBody: unknown = null;

  await establishManagedMediaSession({
    mediaOrigin: "https://media.omnilux.tv/",
    getAccessToken: async () => "workos-access-token",
    fetch: async (input, init) => {
      requestedUrl = String(input);
      requestedAuthorization = new Headers(init?.headers).get("Authorization");
      requestedCredentials = init?.credentials;
      requestedBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  expect(requestedUrl).toBe("https://media.omnilux.tv/api/auth/cloud-login");
  expect(requestedAuthorization).toBe("Bearer workos-access-token");
  expect(requestedCredentials).toBe("include");
  expect(requestedBody).toEqual({
    deviceType: "browser",
    deviceName: "OmniLux Cloud App",
  });
});

test("managed media launch rejects untrusted origins before reading the cloud token", async () => {
  let readToken = false;
  let calledFetch = false;

  await expect(
    establishManagedMediaSession({
      mediaOrigin: "https://media.attacker.example/",
      getAccessToken: async () => {
        readToken = true;
        return "workos-access-token";
      },
      fetch: async () => {
        calledFetch = true;
        return new Response("{}");
      },
    })
  ).rejects.toThrow(
    "OmniLux Media requests must use the protected managed service origin."
  );

  expect(readToken).toBe(false);
  expect(calledFetch).toBe(false);
});

test("managed media launch maps runtime session failures to media wording", async () => {
  await expect(
    establishManagedMediaSession({
      mediaOrigin: "https://media.omnilux.tv/",
      getAccessToken: async () => "workos-access-token",
      fetch: async () =>
        new Response(JSON.stringify({ error: "session rejected" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
    })
  ).rejects.toThrow("session rejected");

  await expect(
    establishManagedMediaSession({
      mediaOrigin: "https://media.omnilux.tv/",
      getAccessToken: async () => "workos-access-token",
      fetch: async () => new Response("{}", { status: 500 }),
    })
  ).rejects.toThrow(
    "OmniLux Media could not start a session for this account."
  );
});

test("managed media customer UI keeps browsing and playback inside the app", () => {
  const runtimeAccessSource = readFileSync(
    new URL(
      "../src/surfaces/app/pages/dashboard/managed-media/useRuntimeAccess.ts",
      import.meta.url
    ),
    "utf8"
  );
  const discoverySource = readFileSync(
    new URL(
      "../src/surfaces/app/pages/dashboard/managed-media/useDiscovery.ts",
      import.meta.url
    ),
    "utf8"
  );
  const discoveryViewSource = readFileSync(
    new URL(
      "../src/surfaces/app/pages/dashboard/managed-media/DiscoverySection.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const serverOverviewSource = readFileSync(
    new URL(
      "../src/surfaces/app/pages/dashboard/server-detail/ServerOverviewCard.tsx",
      import.meta.url
    ),
    "utf8"
  );

  expect(runtimeAccessSource).not.toContain("window.location");
  expect(discoverySource).not.toContain("window.location");
  expect(discoveryViewSource).toContain("<video");
  expect(discoveryViewSource).toContain('crossOrigin="use-credentials"');
  expect(discoveryViewSource).toContain("Play here");
  expect(serverOverviewSource).not.toContain('label="Public origin"');
  expect(serverOverviewSource).not.toContain("managed public origin");
  expect(serverOverviewSource).toMatch(
    /there\s+is\s+no\s+media\s+service\s+website/
  );
});

test("access profile query does not retry authorization failures", () => {
  expect(shouldRetryAccessProfileQuery(0, { status: 401 })).toBe(false);
  expect(shouldRetryAccessProfileQuery(0, { context: { status: 403 } })).toBe(
    false
  );
  expect(shouldRetryAccessProfileQuery(0, new Error("temporary outage"))).toBe(
    true
  );
  expect(shouldRetryAccessProfileQuery(1, new Error("temporary outage"))).toBe(
    false
  );
});
