import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface OperatorMfaCardProps {
  enabled: boolean;
}

interface FactorLike {
  id: string;
  friendly_name?: string | null;
  status?: string | null;
  factor_type?: string | null;
  created_at?: string | null;
}

interface OperatorMfaState {
  currentLevel: 'aal1' | 'aal2' | null;
  nextLevel: 'aal1' | 'aal2' | null;
  verifiedFactor: FactorLike | null;
  pendingFactor: FactorLike | null;
}

interface PendingEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
  friendlyName: string;
}

const DEFAULT_FRIENDLY_NAME = 'OmniLux Ops';

export const OperatorMfaCard = ({ enabled }: OperatorMfaCardProps) => {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [friendlyName, setFriendlyName] = useState(DEFAULT_FRIENDLY_NAME);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [stepUpCode, setStepUpCode] = useState('');
  const [pendingEnrollment, setPendingEnrollment] = useState<PendingEnrollment | null>(null);

  const {
    data: mfaState,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['operator-mfa-state'],
    enabled,
    queryFn: async () => {
      const [{ data: factors, error: factorsError }, { data: assurance, error: assuranceError }] =
        await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);

      if (factorsError) {
        throw factorsError;
      }

      if (assuranceError) {
        throw assuranceError;
      }

      const verifiedFactor = (factors?.totp?.[0] ?? null) as FactorLike | null;
      const pendingFactor =
        ((factors?.all ?? []).find(
          (factor) => factor.factor_type === 'totp' && factor.status !== 'verified',
        ) as FactorLike | undefined) ?? null;

      return {
        currentLevel: assurance?.currentLevel ?? null,
        nextLevel: assurance?.nextLevel ?? null,
        verifiedFactor,
        pendingFactor,
      } satisfies OperatorMfaState;
    },
  });

  const refreshSecurityState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['operator-mfa-state'] }),
      queryClient.invalidateQueries({ queryKey: ['access-profile'] }),
    ]);
  };

  const enrollTotp = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName.trim() || DEFAULT_FRIENDLY_NAME,
        issuer: 'OmniLux Ops',
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async (data) => {
      setPendingEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
        friendlyName: data.friendly_name ?? (friendlyName.trim() || DEFAULT_FRIENDLY_NAME),
      });
      setEnrollmentCode('');
      setMessage('Scan the authenticator QR code and verify it to unlock operator changes.');
      await refreshSecurityState();
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to enroll MFA factor.');
    },
  });

  const verifyEnrollment = useMutation({
    mutationFn: async (code: string) => {
      if (!pendingEnrollment) {
        throw new Error('No pending MFA enrollment exists.');
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: pendingEnrollment.factorId,
        code,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      setPendingEnrollment(null);
      setEnrollmentCode('');
      setMessage('MFA is active and this session is now elevated to AAL2.');
      await refreshSecurityState();
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to verify MFA factor.');
    },
  });

  const elevateSession = useMutation({
    mutationFn: async (code: string) => {
      const factorId = mfaState?.verifiedFactor?.id;
      if (!factorId) {
        throw new Error('No verified MFA factor is available for this account.');
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      setStepUpCode('');
      setMessage('Session elevated to AAL2. Sensitive operator actions are unlocked.');
      await refreshSecurityState();
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to verify MFA code.');
    },
  });

  const resetPendingEnrollment = useMutation({
    mutationFn: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      setPendingEnrollment(null);
      setEnrollmentCode('');
      setMessage('Unfinished MFA enrollment was removed. You can start over now.');
      await refreshSecurityState();
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to reset MFA enrollment.');
    },
  });

  const effectivePendingEnrollment = useMemo(() => {
    if (pendingEnrollment) {
      return pendingEnrollment;
    }

    if (mfaState?.pendingFactor) {
      return {
        factorId: mfaState.pendingFactor.id,
        qrCode: '',
        secret: '',
        uri: '',
        friendlyName: mfaState.pendingFactor.friendly_name ?? DEFAULT_FRIENDLY_NAME,
      } satisfies PendingEnrollment;
    }

    return null;
  }, [mfaState?.pendingFactor, pendingEnrollment]);

  const assuranceLabel = mfaState?.currentLevel?.toUpperCase() ?? 'Unknown';
  const canStepUp = Boolean(mfaState?.verifiedFactor && mfaState.currentLevel !== 'aal2');
  const hasVerifiedFactor = Boolean(mfaState?.verifiedFactor);

  return (
    <div className="rounded-xl border border-border bg-background p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-accent" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Operator MFA</h2>
          <p className="mt-1 text-sm text-muted">
            Sensitive operator changes require TOTP-based MFA and an `aal2` session.
          </p>
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-lg border border-border bg-surface/60 p-4 text-sm text-foreground">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-surface" />
      ) : error ? (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
          {error instanceof Error ? error.message : 'Failed to load MFA status.'}
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-surface/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Current Assurance</p>
              <p className="mt-2 text-foreground">{assuranceLabel}</p>
              <p className="mt-1 text-sm text-muted">
                {mfaState?.currentLevel === 'aal2'
                  ? 'Sensitive operator changes are unlocked for this session.'
                  : 'Verify your TOTP factor to elevate this session before changing live settings.'}
              </p>
            </div>
            <div className="rounded-lg bg-surface/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Verified Factor</p>
              <p className="mt-2 text-foreground">
                {hasVerifiedFactor
                  ? mfaState?.verifiedFactor?.friendly_name || 'Authenticator app'
                  : 'Not enrolled'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {hasVerifiedFactor
                  ? `Enrolled ${mfaState?.verifiedFactor?.created_at ? new Date(mfaState.verifiedFactor.created_at).toLocaleDateString() : 'recently'}.`
                  : 'Enroll a TOTP factor to protect the OmniLux Ops console.'}
              </p>
            </div>
            <div className="rounded-lg bg-surface/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Next Step</p>
              <p className="mt-2 text-foreground">
                {effectivePendingEnrollment
                  ? 'Finish verification'
                  : canStepUp
                    ? 'Step up this session'
                    : hasVerifiedFactor
                      ? 'Protected'
                      : 'Enroll authenticator'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {effectivePendingEnrollment
                  ? 'Complete the code challenge from your authenticator app.'
                  : canStepUp
                    ? 'Use your authenticator app to raise this session from aal1 to aal2.'
                    : hasVerifiedFactor
                      ? 'This operator account already satisfies the current MFA policy.'
                      : 'Scan the QR code in your authenticator app and confirm setup.'}
              </p>
            </div>
          </div>

          {!hasVerifiedFactor && !effectivePendingEnrollment ? (
            <div className="mt-6 rounded-xl bg-surface/50 p-5">
              <label
                htmlFor="operator-mfa-friendly-name"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-muted"
              >
                Authenticator Label
              </label>
              <input
                id="operator-mfa-friendly-name"
                type="text"
                value={friendlyName}
                onChange={(event) => setFriendlyName(event.currentTarget.value)}
                className="mt-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="mt-3 text-sm text-muted">
                Use a dedicated authenticator entry for OmniLux Ops so it stays separate from your customer account.
              </p>
              <button
                type="button"
                disabled={enrollTotp.isPending}
                onClick={() => {
                  setMessage(null);
                  enrollTotp.mutate();
                }}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {enrollTotp.isPending ? 'Preparing MFA...' : 'Enroll TOTP Factor'}
              </button>
            </div>
          ) : null}

          {effectivePendingEnrollment ? (
            <div className="mt-6 rounded-xl bg-surface/50 p-5">
              <h3 className="font-semibold text-foreground">Finish MFA Enrollment</h3>
              <p className="mt-2 text-sm text-muted">
                Scan the QR code below or enter the secret manually in your authenticator app, then confirm with the
                current six-digit code.
              </p>

              {effectivePendingEnrollment.qrCode ? (
                <div className="mt-4 flex justify-center rounded-xl bg-background p-4">
                  <img
                    src={effectivePendingEnrollment.qrCode}
                    alt="OmniLux Ops MFA QR code"
                    className="h-44 w-44 rounded-lg bg-white p-2"
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
                  A pending MFA factor exists, but the QR code is no longer available in this session. Reset the
                  unfinished enrollment and start again if needed.
                </div>
              )}

              {effectivePendingEnrollment.secret ? (
                <div className="mt-4 rounded-lg bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Manual Secret</p>
                  <p className="mt-2 break-all font-mono text-sm text-foreground">
                    {effectivePendingEnrollment.secret}
                  </p>
                </div>
              ) : null}

              <div className="mt-4">
                <label
                  htmlFor="operator-mfa-enrollment-code"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Authenticator Code
                </label>
                <input
                  id="operator-mfa-enrollment-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={enrollmentCode}
                  onChange={(event) => setEnrollmentCode(event.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={verifyEnrollment.isPending || enrollmentCode.length !== 6}
                  onClick={() => {
                    setMessage(null);
                    verifyEnrollment.mutate(enrollmentCode);
                  }}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                >
                  {verifyEnrollment.isPending ? 'Verifying...' : 'Verify and Elevate'}
                </button>
                <button
                  type="button"
                  disabled={resetPendingEnrollment.isPending}
                  onClick={() => {
                    if (!window.confirm('Reset the unfinished MFA enrollment and start over?')) {
                      return;
                    }
                    setMessage(null);
                    resetPendingEnrollment.mutate(effectivePendingEnrollment.factorId);
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50"
                >
                  Reset Enrollment
                </button>
              </div>
            </div>
          ) : null}

          {canStepUp ? (
            <div className="mt-6 rounded-xl bg-surface/50 p-5">
              <h3 className="font-semibold text-foreground">Step Up This Session</h3>
              <p className="mt-2 text-sm text-muted">
                Sensitive operator changes stay locked until this browser session is elevated from `aal1` to `aal2`.
              </p>
              <div className="mt-4">
                <label
                  htmlFor="operator-mfa-step-up-code"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Authenticator Code
                </label>
                <input
                  id="operator-mfa-step-up-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={stepUpCode}
                  onChange={(event) => setStepUpCode(event.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <button
                type="button"
                disabled={elevateSession.isPending || stepUpCode.length !== 6}
                onClick={() => {
                  setMessage(null);
                  elevateSession.mutate(stepUpCode);
                }}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {elevateSession.isPending ? 'Verifying...' : 'Verify MFA'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
