import { ShieldCheck } from 'lucide-react';
import { OperatorMfaEnrollmentPanel } from './operator-mfa/OperatorMfaEnrollmentPanel';
import { OperatorMfaPendingPanel } from './operator-mfa/OperatorMfaPendingPanel';
import { OperatorMfaStatusGrid } from './operator-mfa/OperatorMfaStatusGrid';
import { OperatorMfaStepUpPanel } from './operator-mfa/OperatorMfaStepUpPanel';
import { useOperatorMfa } from './operator-mfa/useOperatorMfa';

interface OperatorMfaCardProps {
  enabled: boolean;
}

export const OperatorMfaCard = ({ enabled }: OperatorMfaCardProps) => {
  const mfa = useOperatorMfa(enabled);

  return (
    <div className="rounded-xl border border-border bg-background p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-accent" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Operator security</h2>
          <p className="mt-1 text-sm text-muted">
            Sensitive operator changes require a verified authenticator app for the current session.
          </p>
        </div>
      </div>

      {mfa.message ? (
        <div className="mt-4 rounded-lg border border-border bg-surface/60 p-4 text-sm text-foreground">{mfa.message}</div>
      ) : null}
      {mfa.usesWorkos ? (
        <div className="mt-4 rounded-lg border border-border bg-surface/60 p-4 text-sm text-foreground">
          Operator step-up security is now enforced by WorkOS policy and roles. Configure authenticator requirements in
          WorkOS for operator organizations before enabling sensitive ops mutations for WorkOS-only sessions.
        </div>
      ) : mfa.stateQuery.isLoading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-surface" />
      ) : mfa.stateQuery.error ? (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
          {mfa.stateQuery.error instanceof Error ? mfa.stateQuery.error.message : 'Failed to load authenticator status.'}
        </div>
      ) : (
        <>
          <OperatorMfaStatusGrid vm={mfa} />
          <OperatorMfaEnrollmentPanel vm={mfa} />
          <OperatorMfaPendingPanel vm={mfa} />
          <OperatorMfaStepUpPanel vm={mfa} />
        </>
      )}
    </div>
  );
};
