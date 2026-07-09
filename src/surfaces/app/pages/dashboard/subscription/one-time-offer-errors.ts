import type { CloudOneTimeOfferKey } from "@/lib/cloud-plans";

export type SoldOutOneTimeOfferNotice = {
  key: CloudOneTimeOfferKey;
  message: string;
};

type SoldOutPayload = {
  code?: unknown;
  offer?: {
    key?: unknown;
  };
};

type ResponseLike = {
  clone?: () => ResponseLike;
  json?: () => Promise<unknown>;
};

const soldOutCopy: Record<CloudOneTimeOfferKey, string> = {
  "lifetime-membership":
    "Lifetime membership is sold out. Private beta and cloud-plan waitlists are still open while we prepare the next availability window.",
  "founding-member":
    "Founding Member spots are sold out. Private beta and cloud-plan waitlists are still open while we prepare the next availability window.",
};

const isCloudOneTimeOfferKey = (
  value: unknown
): value is CloudOneTimeOfferKey =>
  value === "lifetime-membership" || value === "founding-member";

const readErrorPayload = async (error: unknown) => {
  const context = (error as { context?: unknown })?.context as
    ResponseLike | undefined;
  const response =
    typeof context?.clone === "function" ? context.clone() : context;
  if (typeof response?.json !== "function") return null;

  try {
    return (await response.json()) as SoldOutPayload;
  } catch {
    return null;
  }
};

export async function getSoldOutOneTimeOfferNotice(
  error: unknown
): Promise<SoldOutOneTimeOfferNotice | null> {
  const payload = await readErrorPayload(error);
  if (payload?.code !== "one_time_offer_sold_out") return null;
  const offerKey = payload.offer?.key;
  if (!isCloudOneTimeOfferKey(offerKey)) return null;

  return {
    key: offerKey,
    message: soldOutCopy[offerKey],
  };
}
