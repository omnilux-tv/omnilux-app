import { Gem } from "lucide-react";
import {
  formatOneTimeCloudPrice,
  foundingMemberOffer,
  lifetimeMembershipOffer,
  lifetimePlan,
} from "@/lib/cloud-plans";
import { buildMarketingHref } from "@/lib/site-surface";
import type { SubscriptionBillingViewModel } from "./useSubscriptionBilling";

type OneTimeOfferCardsProps = {
  vm: SubscriptionBillingViewModel;
};

export const OneTimeOfferCards = ({ vm }: OneTimeOfferCardsProps) => {
  const lifetimeSoldOut =
    vm.soldOutOneTimeOffer === lifetimeMembershipOffer.key;
  const foundingSoldOut = vm.soldOutOneTimeOffer === foundingMemberOffer.key;

  return (
    <>
      <div className="rounded-xl surface-soft p-6">
        <OfferHeader
          title={`${lifetimePlan.name} membership`}
          description={`${formatOneTimeCloudPrice(lifetimePlan.priceCents)}. ${lifetimePlan.description}`}
        />
        <p className="mt-4 text-sm leading-6 text-muted">
          Lifetime membership is a product purchase, not an investor path.
          OmniLux keeps issuing time-limited server access while the membership
          remains active.
        </p>
        <BulletList bullets={lifetimePlan.bullets} />
        {lifetimeSoldOut ? (
          <SoldOutNotice offerLabel="Lifetime membership" />
        ) : null}
        {vm.hasLifetimeMembership ? (
          <p className="mt-4 text-sm text-muted">
            Lifetime membership is active for this account.
          </p>
        ) : (
          <OfferButton
            pending={vm.lifetimeCheckoutPending}
            disabled={!vm.user || vm.lifetimeCheckoutPending || lifetimeSoldOut}
            label={
              lifetimeSoldOut
                ? "Lifetime sold out"
                : lifetimeMembershipOffer.copy.ctaLabel
            }
            onClick={vm.actions.startLifetimeMembershipCheckout}
          />
        )}
      </div>

      <div className="rounded-xl surface-soft p-6">
        <OfferHeader
          title={foundingMemberOffer.copy.name}
          description={`${formatOneTimeCloudPrice(foundingMemberOffer.priceCents)}. ${foundingMemberOffer.copy.description}`}
        />
        <p className="mt-4 text-sm leading-6 text-muted">
          Founding Member is for early supporters who want launch-era
          recognition, private briefings, and a closer seat to the roadmap
          without entering the investor path.
        </p>
        <BulletList bullets={foundingMemberOffer.copy.bullets} />
        {foundingSoldOut ? (
          <SoldOutNotice offerLabel="Founding Member" />
        ) : null}
        {vm.foundingMembershipQuery.error ? (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted">
            Founding-member status could not be loaded right now. Checkout is
            still available, but this card may be temporarily stale.
          </div>
        ) : null}
        {vm.hasFoundingMembership ? (
          <p className="mt-4 text-sm text-muted">
            {vm.foundingMembership?.purchased_at
              ? `Purchased on ${new Date(vm.foundingMembership.purchased_at).toLocaleDateString()}`
              : "Founding-member access is active."}
          </p>
        ) : (
          <OfferButton
            pending={vm.foundingCheckoutPending}
            disabled={
              !vm.user ||
              vm.foundingCheckoutPending ||
              vm.foundingMembershipQuery.isLoading ||
              foundingSoldOut
            }
            label={
              foundingSoldOut
                ? "Founding Member sold out"
                : foundingMemberOffer.copy.ctaLabel
            }
            onClick={vm.actions.startFoundingMemberCheckout}
          />
        )}
      </div>
    </>
  );
};

const OfferHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex items-center gap-3">
    <Gem className="h-6 w-6 text-accent" />
    <div>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted">{description}</p>
    </div>
  </div>
);

const OfferButton = ({
  pending,
  disabled,
  label,
  onClick,
}: {
  pending: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={() => void onClick()}
    disabled={disabled}
    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
  >
    <Gem className="h-4 w-4" />
    {pending ? "Opening checkout..." : label}
  </button>
);

const SoldOutNotice = ({ offerLabel }: { offerLabel: string }) => (
  <div
    className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-muted"
    role="status"
  >
    <p className="font-semibold text-foreground">
      {offerLabel} checkout is closed for this account right now.
    </p>
    <p className="mt-2">
      Private beta and cloud-plan waitlists are still open. Use the early-access
      page to choose the next available path.
    </p>
    <a
      href={buildMarketingHref("/early-access")}
      className="mt-3 inline-flex text-sm font-semibold text-accent hover:underline"
    >
      See early access options
    </a>
  </div>
);

const BulletList = ({ bullets }: { bullets: readonly string[] }) => (
  <ul className="mt-4 space-y-2">
    {bullets.map((bullet) => (
      <li key={bullet} className="flex gap-2 text-sm leading-6 text-muted">
        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
        <span>{bullet}</span>
      </li>
    ))}
  </ul>
);
