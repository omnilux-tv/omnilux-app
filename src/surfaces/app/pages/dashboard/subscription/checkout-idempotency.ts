type CheckoutInvokeOptions = {
  headers: {
    "Idempotency-Key": string;
  };
};

type CheckoutIdempotencyKeyFactory = () => string;

const responseStatusFrom = (value: unknown): number | null => {
  if (!value || typeof value !== "object" || !("status" in value)) {
    return null;
  }

  const status = value.status;
  return typeof status === "number" && Number.isInteger(status) ? status : null;
};

const checkoutErrorStatus = (error: unknown): number | null => {
  if (!error || typeof error !== "object") return null;

  if ("context" in error) {
    const contextStatus = responseStatusFrom(error.context);
    if (contextStatus !== null) return contextStatus;
  }

  return responseStatusFrom(error);
};

export const isDefinitiveCheckoutFailure = (error: unknown) => {
  const status = checkoutErrorStatus(error);
  return (
    status !== null &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  );
};

export const createSecureCheckoutIdempotencyKey = () => {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi) {
    throw new Error("Secure browser cryptography is unavailable.");
  }

  if (typeof cryptoApi.randomUUID === "function") {
    return `checkout:${cryptoApi.randomUUID()}`;
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  return `checkout:${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
};

export const createCheckoutIdempotencyStore = (
  createKey: CheckoutIdempotencyKeyFactory = createSecureCheckoutIdempotencyKey
) => {
  const pendingKeys = new Map<string, string>();

  const clear = (scope: string) => {
    pendingKeys.delete(scope);
  };

  return {
    getOrCreateInvokeOptions(scope: string): CheckoutInvokeOptions {
      const existingKey = pendingKeys.get(scope);
      const idempotencyKey = existingKey ?? createKey();
      if (!existingKey) pendingKeys.set(scope, idempotencyKey);

      return {
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      };
    },

    complete(scope: string) {
      clear(scope);
    },

    handleFailure(scope: string, error: unknown) {
      if (isDefinitiveCheckoutFailure(error)) clear(scope);
    },
  };
};
