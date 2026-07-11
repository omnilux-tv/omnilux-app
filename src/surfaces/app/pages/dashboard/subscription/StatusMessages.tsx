import type { SubscriptionBillingViewModel } from "./useSubscriptionBilling";

type StatusMessagesProps = {
  vm: SubscriptionBillingViewModel;
};

const messageClass = {
  success:
    "rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground",
  warning:
    "rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground",
  danger:
    "rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground",
};

export const StatusMessages = ({ vm }: StatusMessagesProps) => (
  <>
    {vm.states.checkoutState === "success" ? (
      <div className={messageClass.success}>
        Returned from checkout. The current plan status below is the source of
        truth while account events finish syncing.
      </div>
    ) : null}
    {vm.states.checkoutState === "canceled" ? (
      <div className={messageClass.warning}>
        Returned without confirmed plan access. Paid checkout remains closed
        during private beta.
      </div>
    ) : null}
    {vm.waitlistMessage ? (
      <div className={messageClass.success}>{vm.waitlistMessage}</div>
    ) : null}
    {vm.states.waitlistState === "cloud-plan" && !vm.waitlistMessage ? (
      <div className={messageClass.warning}>
        Cloud plan checkout is not open during beta. Your selected plan can be
        joined from the waitlist cards below.
      </div>
    ) : null}
    {vm.states.portalState === "canceled" ? (
      <div className={messageClass.success}>
        Returned from the billing portal. The current plan status below confirms
        whether any account change completed.
      </div>
    ) : null}
    {vm.states.foundingState === "success" ? (
      <div className={messageClass.success}>
        Returned from Founding Member checkout. The customer product and its
        Family-level lifetime entitlement are active only when the account
        summary confirms them.
      </div>
    ) : null}
    {vm.states.foundingState === "canceled" ? (
      <div className={messageClass.warning}>
        Returned without confirmed Founding Member product access.
      </div>
    ) : null}
    {vm.states.lifetimeState === "success" ? (
      <div className={messageClass.success}>
        Returned from Lifetime checkout. Paid access is active only when the
        account summary confirms it.
      </div>
    ) : null}
    {vm.states.lifetimeState === "canceled" ? (
      <div className={messageClass.warning}>
        Returned without confirmed Lifetime access.
      </div>
    ) : null}
    {vm.billingError ? (
      <div className={messageClass.danger}>{vm.billingError}</div>
    ) : null}
  </>
);
