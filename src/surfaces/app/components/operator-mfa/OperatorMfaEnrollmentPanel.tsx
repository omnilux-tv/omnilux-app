import type { OperatorMfaViewModel } from './useOperatorMfa';

type OperatorMfaEnrollmentPanelProps = {
  vm: OperatorMfaViewModel;
};

export const OperatorMfaEnrollmentPanel = ({ vm }: OperatorMfaEnrollmentPanelProps) => {
  if (vm.hasVerifiedFactor || vm.effectivePendingEnrollment) return null;

  return (
    <div className="mt-6 rounded-xl bg-surface/50 p-5">
      <label htmlFor="operator-mfa-friendly-name" className="text-xs font-semibold text-muted">
        Authenticator label
      </label>
      <input
        id="operator-mfa-friendly-name"
        type="text"
        value={vm.friendlyName}
        onChange={(event) => vm.setFriendlyName(event.currentTarget.value)}
        className="mt-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
      />
      <p className="mt-3 text-sm text-muted">
        Use a dedicated authenticator entry for OmniLux Ops so it stays separate from your customer account.
      </p>
      <button
        type="button"
        disabled={vm.mutations.enrollTotp.isPending}
        onClick={() => {
          vm.setMessage(null);
          vm.mutations.enrollTotp.mutate();
        }}
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
      >
        {vm.mutations.enrollTotp.isPending ? 'Preparing security setup...' : 'Enroll authenticator'}
      </button>
    </div>
  );
};
