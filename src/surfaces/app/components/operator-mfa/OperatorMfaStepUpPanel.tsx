import type { OperatorMfaViewModel } from './useOperatorMfa';

type OperatorMfaStepUpPanelProps = {
  vm: OperatorMfaViewModel;
};

export const OperatorMfaStepUpPanel = ({ vm }: OperatorMfaStepUpPanelProps) => {
  if (!vm.canStepUp) return null;

  return (
    <div className="mt-6 rounded-xl bg-surface/50 p-5">
      <h3 className="font-semibold text-foreground">Unlock this session</h3>
      <p className="mt-2 text-sm text-muted">
        Sensitive operator changes stay locked until this browser session is verified with your authenticator app.
      </p>
      <div className="mt-4">
        <label htmlFor="operator-mfa-step-up-code" className="text-xs font-semibold text-muted">
          Authenticator code
        </label>
        <input
          id="operator-mfa-step-up-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={vm.stepUpCode}
          onChange={(event) => vm.setStepUpCode(event.currentTarget.value)}
          className="mt-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <button
        type="button"
        disabled={vm.mutations.elevateSession.isPending || vm.stepUpCode.length !== 6}
        onClick={() => {
          vm.setMessage(null);
          vm.mutations.elevateSession.mutate(vm.stepUpCode);
        }}
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
      >
        {vm.mutations.elevateSession.isPending ? 'Verifying...' : 'Verify authenticator'}
      </button>
    </div>
  );
};
