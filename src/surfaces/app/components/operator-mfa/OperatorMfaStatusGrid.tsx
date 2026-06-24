import type { OperatorMfaViewModel } from './useOperatorMfa';

type OperatorMfaStatusGridProps = {
  vm: OperatorMfaViewModel;
};

export const OperatorMfaStatusGrid = ({ vm }: OperatorMfaStatusGridProps) => {
  const mfaState = vm.stateQuery.data;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <StatusTile
        label="Current protection"
        value={vm.assuranceLabel}
        detail={
          mfaState?.currentLevel === 'aal2'
            ? 'Sensitive operator changes are unlocked for this session.'
            : 'Verify your authenticator app before changing live settings.'
        }
      />
      <StatusTile
        label="Verified factor"
        value={vm.hasVerifiedFactor ? mfaState?.verifiedFactor?.friendly_name || 'Authenticator app' : 'Not enrolled'}
        detail={
          vm.hasVerifiedFactor
            ? `Enrolled ${mfaState?.verifiedFactor?.created_at ? new Date(mfaState.verifiedFactor.created_at).toLocaleDateString() : 'recently'}.`
            : 'Enroll an authenticator factor to protect the OmniLux Ops console.'
        }
      />
      <StatusTile
        label="Next step"
        value={
          vm.effectivePendingEnrollment
            ? 'Finish verification'
            : vm.canStepUp
              ? 'Step up this session'
              : vm.hasVerifiedFactor
                ? 'Protected'
                : 'Enroll authenticator'
        }
        detail={
          vm.effectivePendingEnrollment
            ? 'Complete the code challenge from your authenticator app.'
            : vm.canStepUp
              ? 'Use your authenticator app to unlock sensitive controls for this session.'
              : vm.hasVerifiedFactor
                ? 'This operator account already satisfies the current security policy.'
                : 'Scan the QR code in your authenticator app and confirm setup.'
        }
      />
    </div>
  );
};

const StatusTile = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <div className="rounded-lg bg-surface/60 p-4">
    <p className="text-xs font-semibold text-muted">{label}</p>
    <p className="mt-2 text-foreground">{value}</p>
    <p className="mt-1 text-sm text-muted">{detail}</p>
  </div>
);
