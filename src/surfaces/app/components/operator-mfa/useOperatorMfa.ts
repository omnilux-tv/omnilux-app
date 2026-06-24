import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

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

export const DEFAULT_FRIENDLY_NAME = 'OmniLux Ops';

export const useOperatorMfa = (enabled: boolean) => {
  const { provider } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [friendlyName, setFriendlyName] = useState(DEFAULT_FRIENDLY_NAME);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [stepUpCode, setStepUpCode] = useState('');
  const [pendingEnrollment, setPendingEnrollment] = useState<PendingEnrollment | null>(null);
  const usesWorkos = provider === 'workos';

  const stateQuery = useQuery({
    queryKey: ['operator-mfa-state'],
    enabled: enabled && !usesWorkos,
    queryFn: async () => {
      const [{ data: factors, error: factorsError }, { data: assurance, error: assuranceError }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      if (factorsError) throw factorsError;
      if (assuranceError) throw assuranceError;
      const verifiedFactor = (factors?.totp?.[0] ?? null) as FactorLike | null;
      const pendingFactor =
        ((factors?.all ?? []).find((factor) => factor.factor_type === 'totp' && factor.status !== 'verified') as FactorLike | undefined) ??
        null;
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
  const mutationError = (fallback: string) => (error: unknown) => setMessage(error instanceof Error ? error.message : fallback);

  const enrollTotp = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName.trim() || DEFAULT_FRIENDLY_NAME,
        issuer: 'OmniLux Ops',
      });
      if (error) throw error;
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
    onError: mutationError('Failed to enroll authenticator.'),
  });

  const verifyEnrollment = useMutation({
    mutationFn: async (code: string) => {
      if (!pendingEnrollment) throw new Error('No pending authenticator setup exists.');
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: pendingEnrollment.factorId, code });
      if (error) throw error;
    },
    onSuccess: async () => {
      setPendingEnrollment(null);
      setEnrollmentCode('');
      setMessage('Authenticator protection is active and sensitive operator actions are unlocked for this session.');
      await refreshSecurityState();
    },
    onError: mutationError('Failed to verify authenticator.'),
  });

  const elevateSession = useMutation({
    mutationFn: async (code: string) => {
      const factorId = stateQuery.data?.verifiedFactor?.id;
      if (!factorId) throw new Error('No verified authenticator is available for this account.');
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
    },
    onSuccess: async () => {
      setStepUpCode('');
      setMessage('Sensitive operator actions are unlocked for this session.');
      await refreshSecurityState();
    },
    onError: mutationError('Failed to verify authenticator code.'),
  });

  const resetPendingEnrollment = useMutation({
    mutationFn: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
    },
    onSuccess: async () => {
      setPendingEnrollment(null);
      setEnrollmentCode('');
      setMessage('Unfinished authenticator setup was removed. You can start over now.');
      await refreshSecurityState();
    },
    onError: mutationError('Failed to reset authenticator setup.'),
  });

  const effectivePendingEnrollment = useMemo(() => {
    if (pendingEnrollment) return pendingEnrollment;
    if (!stateQuery.data?.pendingFactor) return null;
    return {
      factorId: stateQuery.data.pendingFactor.id,
      qrCode: '',
      secret: '',
      uri: '',
      friendlyName: stateQuery.data.pendingFactor.friendly_name ?? DEFAULT_FRIENDLY_NAME,
    } satisfies PendingEnrollment;
  }, [stateQuery.data?.pendingFactor, pendingEnrollment]);

  const assuranceLabel =
    stateQuery.data?.currentLevel === 'aal2'
      ? 'Verified this session'
      : stateQuery.data?.currentLevel === 'aal1'
        ? 'Authenticator required'
        : 'Not available';
  const canStepUp = Boolean(stateQuery.data?.verifiedFactor && stateQuery.data.currentLevel !== 'aal2');
  const hasVerifiedFactor = Boolean(stateQuery.data?.verifiedFactor);
  const sanitizeCode = (value: string) => value.replace(/\D/g, '').slice(0, 6);

  return {
    usesWorkos,
    stateQuery,
    message,
    setMessage,
    friendlyName,
    setFriendlyName,
    enrollmentCode,
    setEnrollmentCode: (value: string) => setEnrollmentCode(sanitizeCode(value)),
    stepUpCode,
    setStepUpCode: (value: string) => setStepUpCode(sanitizeCode(value)),
    effectivePendingEnrollment,
    assuranceLabel,
    canStepUp,
    hasVerifiedFactor,
    mutations: { enrollTotp, verifyEnrollment, elevateSession, resetPendingEnrollment },
  };
};

export type OperatorMfaViewModel = ReturnType<typeof useOperatorMfa>;
