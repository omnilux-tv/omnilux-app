import type { OperatorMfaViewModel } from './useOperatorMfa';

type OperatorMfaPendingPanelProps = {
  vm: OperatorMfaViewModel;
};

export const OperatorMfaPendingPanel = ({ vm }: OperatorMfaPendingPanelProps) => {
  const enrollment = vm.effectivePendingEnrollment;
  if (!enrollment) return null;

  return (
    <div className="mt-6 rounded-xl bg-surface/50 p-5">
      <h3 className="font-semibold text-foreground">Finish authenticator setup</h3>
      <p className="mt-2 text-sm text-muted">
        Scan the QR code below or enter the secret manually in your authenticator app, then confirm with the current six-digit code.
      </p>
      {enrollment.qrCode ? (
        <div className="mt-4 flex justify-center rounded-xl bg-background p-4">
          <img src={enrollment.qrCode} alt="OmniLux Ops authenticator QR code" className="h-44 w-44 rounded-lg bg-white p-2" />
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
          A pending authenticator factor exists, but the QR code is no longer available in this session. Reset the unfinished enrollment and start again if needed.
        </div>
      )}
      {enrollment.secret ? (
        <div className="mt-4 rounded-lg bg-background p-4">
          <p className="text-xs font-semibold text-muted">Manual secret</p>
          <p className="mt-2 break-all font-mono text-sm text-foreground">{enrollment.secret}</p>
        </div>
      ) : null}
      <div className="mt-4">
        <label htmlFor="operator-mfa-enrollment-code" className="text-xs font-semibold text-muted">
          Authenticator code
        </label>
        <input
          id="operator-mfa-enrollment-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={vm.enrollmentCode}
          onChange={(event) => vm.setEnrollmentCode(event.currentTarget.value)}
          className="mt-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={vm.mutations.verifyEnrollment.isPending || vm.enrollmentCode.length !== 6}
          onClick={() => {
            vm.setMessage(null);
            vm.mutations.verifyEnrollment.mutate(vm.enrollmentCode);
          }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
        >
          {vm.mutations.verifyEnrollment.isPending ? 'Verifying...' : 'Verify and unlock'}
        </button>
        <button
          type="button"
          disabled={vm.mutations.resetPendingEnrollment.isPending}
          onClick={() => {
            if (!window.confirm('Reset the unfinished authenticator setup and start over?')) return;
            vm.setMessage(null);
            vm.mutations.resetPendingEnrollment.mutate(enrollment.factorId);
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50"
        >
          Reset setup
        </button>
      </div>
    </div>
  );
};
