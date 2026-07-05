import type { SubscriptionBillingViewModel } from './useSubscriptionBilling';

type StatusMessagesProps = {
  vm: SubscriptionBillingViewModel;
};

const messageClass = {
  success: 'rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground',
  warning: 'rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground',
  danger: 'rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground',
};

export const StatusMessages = ({ vm }: StatusMessagesProps) => (
  <>
    {vm.states.checkoutState === 'success' ? (
      <div className={messageClass.success}>
        Checkout completed. Stripe subscription events are syncing now, so your plan status may take a few moments to update.
      </div>
    ) : null}
    {vm.states.checkoutState === 'canceled' ? (
      <div className={messageClass.warning}>Checkout was canceled before payment completed. You can try again whenever you are ready.</div>
    ) : null}
    {vm.waitlistMessage ? <div className={messageClass.success}>{vm.waitlistMessage}</div> : null}
    {vm.states.waitlistState === 'cloud-plan' && !vm.waitlistMessage ? (
      <div className={messageClass.warning}>Cloud plan checkout is not open during beta. Your selected plan can be joined from the waitlist cards below.</div>
    ) : null}
    {vm.states.portalState === 'canceled' ? (
      <div className={messageClass.success}>
        Cancellation was submitted in Stripe. Subscription events are syncing now, so the plan status may take a few moments to update.
      </div>
    ) : null}
    {vm.states.foundingState === 'success' ? (
      <div className={messageClass.success}>Founding-member checkout completed. Your supporter status is syncing now.</div>
    ) : null}
    {vm.states.foundingState === 'canceled' ? (
      <div className={messageClass.warning}>Founding-member checkout was canceled before payment completed.</div>
    ) : null}
    {vm.states.lifetimeState === 'success' ? (
      <div className={messageClass.success}>Lifetime checkout completed. Your paid access is syncing now.</div>
    ) : null}
    {vm.states.lifetimeState === 'canceled' ? (
      <div className={messageClass.warning}>Lifetime checkout was canceled before payment completed.</div>
    ) : null}
    {vm.billingError ? <div className={messageClass.danger}>{vm.billingError}</div> : null}
  </>
);
