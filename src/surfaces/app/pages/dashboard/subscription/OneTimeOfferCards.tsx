import { Gem } from 'lucide-react';
import {
  formatOneTimeCloudPrice,
  foundingMemberOffer,
  lifetimeMembershipOffer,
  lifetimePlan,
} from '@/lib/cloud-plans';
import type { SubscriptionBillingViewModel } from './useSubscriptionBilling';

type OneTimeOfferCardsProps = {
  vm: SubscriptionBillingViewModel;
};

export const OneTimeOfferCards = ({ vm }: OneTimeOfferCardsProps) => (
  <>
    <div className="rounded-xl surface-soft p-6">
      <OfferHeader title={`${lifetimePlan.name} membership`} description={`${formatOneTimeCloudPrice(lifetimePlan.priceCents)}. ${lifetimePlan.description}`} />
      <p className="mt-4 text-sm leading-6 text-muted">
        Lifetime membership is a product purchase, not an investor path. OmniLux keeps issuing time-limited server
        access while the membership remains active.
      </p>
      <BulletList bullets={lifetimePlan.bullets} />
      {vm.hasLifetimeMembership ? (
        <p className="mt-4 text-sm text-muted">Lifetime membership is active for this account.</p>
      ) : (
        <OfferButton
          pending={vm.lifetimeCheckoutPending}
          disabled={!vm.user || vm.lifetimeCheckoutPending}
          label={lifetimeMembershipOffer.copy.ctaLabel}
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
        Founding Member is for early supporters who want launch-era recognition, private briefings, and a closer seat to
        the roadmap without entering the investor path.
      </p>
      <BulletList bullets={foundingMemberOffer.copy.bullets} />
      {vm.foundingMembershipQuery.error ? (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted">
          Founding-member status could not be loaded right now. Checkout is still available, but this card may be temporarily stale.
        </div>
      ) : null}
      {vm.hasFoundingMembership ? (
        <p className="mt-4 text-sm text-muted">
          {vm.foundingMembership?.purchased_at
            ? `Purchased on ${new Date(vm.foundingMembership.purchased_at).toLocaleDateString()}`
            : 'Founding-member access is active.'}
        </p>
      ) : (
        <OfferButton
          pending={vm.foundingCheckoutPending}
          disabled={!vm.user || vm.foundingCheckoutPending || vm.foundingMembershipQuery.isLoading}
          label={foundingMemberOffer.copy.ctaLabel}
          onClick={vm.actions.startFoundingMemberCheckout}
        />
      )}
    </div>
  </>
);

const OfferHeader = ({ title, description }: { title: string; description: string }) => (
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
    {pending ? 'Opening checkout...' : label}
  </button>
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
