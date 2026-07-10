import { buildDocsHref } from "@/lib/site-surface";
import { CloudBillingModelPanels } from "./subscription/CloudBillingModelPanels";
import { CurrentPlanCard } from "./subscription/CurrentPlanCard";
import { OneTimeOfferCards } from "./subscription/OneTimeOfferCards";
import { PaidPlanGrid } from "./subscription/PaidPlanGrid";
import { StatusMessages } from "./subscription/StatusMessages";
import { useSubscriptionBilling } from "./subscription/useSubscriptionBilling";

export const Subscription = () => {
  const billing = useSubscriptionBilling();

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Cloud plan and billing
          </h1>
          <p className="mt-1 text-sm text-muted">
            Local playback and hosting stay free. Lifetime, founding-member, and
            recurring cloud checkout are closed during private beta; cloud plans
            remain visible for comparison and waitlist interest.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={buildDocsHref("/guide/cloud-product-contract")}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Cloud product guide
            </a>
            <a
              href={buildDocsHref("/guide/managed-media")}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Managed media guide
            </a>
          </div>
        </div>

        <StatusMessages vm={billing} />
        <CurrentPlanCard vm={billing} />
        <CloudBillingModelPanels vm={billing} />
        <OneTimeOfferCards vm={billing} />
        <PaidPlanGrid vm={billing} />
      </div>
    </div>
  );
};
