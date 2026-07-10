export const ONE_TIME_CLOUD_CHECKOUT_CLOSED_MESSAGE =
  "Lifetime and Founding Member checkout is closed during private beta. Join early access or a cloud-plan waitlist for launch updates.";

export const isOneTimeCloudCheckoutExplicitlyEnabled = (value: unknown) =>
  typeof value === "string" && value.trim().toLowerCase() === "true";
