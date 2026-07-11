import { expect, test } from "@playwright/test";
import {
  createCheckoutIdempotencyStore,
  createSecureCheckoutIdempotencyKey,
} from "../src/surfaces/app/pages/dashboard/subscription/checkout-idempotency";

test("checkout retry keeps the same offer key after transient failures", () => {
  const keys = ["checkout:first", "checkout:second"];
  const store = createCheckoutIdempotencyStore(() => keys.shift()!);

  const firstAttempt = store.getOrCreateInvokeOptions("founding-member");
  for (const status of [408, 429, 503]) {
    store.handleFailure(
      "founding-member",
      Object.assign(new Error("Transient checkout failure"), {
        context: new Response(null, { status }),
      })
    );
    expect(store.getOrCreateInvokeOptions("founding-member")).toEqual(
      firstAttempt
    );
  }
  store.handleFailure("founding-member", new TypeError("Failed to fetch"));
  const networkRetry = store.getOrCreateInvokeOptions("founding-member");

  expect(networkRetry).toEqual(firstAttempt);
  expect(keys).toEqual(["checkout:second"]);
});

test("a completed action rotates its key and offer scopes never share keys", () => {
  const keys = [
    "checkout:founding-first",
    "checkout:lifetime-first",
    "checkout:founding-second",
  ];
  const store = createCheckoutIdempotencyStore(() => keys.shift()!);

  const foundingFirst = store.getOrCreateInvokeOptions("founding-member");
  const lifetimeFirst = store.getOrCreateInvokeOptions("lifetime-membership");
  store.complete("founding-member");
  const foundingSecond = store.getOrCreateInvokeOptions("founding-member");

  expect(foundingFirst.headers["Idempotency-Key"]).not.toBe(
    lifetimeFirst.headers["Idempotency-Key"]
  );
  expect(foundingSecond.headers["Idempotency-Key"]).not.toBe(
    foundingFirst.headers["Idempotency-Key"]
  );
});

test("confirmed non-retryable failures end an attempt while ambiguous failures retain it", () => {
  const keys = ["checkout:first", "checkout:second"];
  const store = createCheckoutIdempotencyStore(() => keys.shift()!);

  const first = store.getOrCreateInvokeOptions("founding-member");
  store.handleFailure("founding-member", new Error("Unknown SDK failure"));
  expect(store.getOrCreateInvokeOptions("founding-member")).toEqual(first);

  store.handleFailure(
    "founding-member",
    Object.assign(new Error("Offer unavailable"), {
      context: new Response(null, { status: 409 }),
    })
  );
  expect(store.getOrCreateInvokeOptions("founding-member")).not.toEqual(first);
});

test("checkout idempotency keys are secure and passed only as native headers", () => {
  const loggedValues: unknown[][] = [];
  const captureLog = (...values: unknown[]) => {
    loggedValues.push(values);
  };
  const originalConsole = {
    error: console.error,
    log: console.log,
    warn: console.warn,
  };
  console.error = captureLog;
  console.log = captureLog;
  console.warn = captureLog;

  try {
    const store = createCheckoutIdempotencyStore();
    const options = store.getOrCreateInvokeOptions("founding-member");
    const key = options.headers["Idempotency-Key"];
    const functionUrl = new URL(
      "https://api.omnilux.tv/functions/v1/create-founding-member-session"
    );
    const checkoutUrl = new URL("https://checkout.stripe.com/c/pay/cs_test");

    expect(key).toMatch(/^checkout:[A-Za-z0-9-]{32,36}$/);
    expect(createSecureCheckoutIdempotencyKey()).not.toBe(key);
    expect(options).toEqual({
      headers: { "Idempotency-Key": key },
    });
    expect(Object.keys(options)).toEqual(["headers"]);
    expect(functionUrl.href).not.toContain(key);
    expect(checkoutUrl.href).not.toContain(key);
    expect(loggedValues).toEqual([]);
  } finally {
    console.error = originalConsole.error;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
  }
});
