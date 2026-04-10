import { useState, type FormEvent } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { OperatorMfaCard } from '@/surfaces/app/components/OperatorMfaCard';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { supabase } from '@/lib/supabase';

const destructiveAccountActionsAvailable = false;

export const Account = () => {
  const { user } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const minimumPasswordLength = accessProfile?.isOperator ? 16 : 12;
  const passwordMeetsLength = newPassword.length >= minimumPasswordLength;
  const passwordHasLetter = /[A-Za-z]/.test(newPassword);
  const passwordHasNumber = /\d/.test(newPassword);
  const passwordConfirmed = confirmPassword.length > 0 && confirmPassword === newPassword;
  const sessionAssuranceLabel = accessProfile?.sessionAssuranceLevel
    ? accessProfile.sessionAssuranceLevel.toUpperCase()
    : 'Unknown';

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });

    setSaving(false);
    setMessage(error ? error.message : 'Profile updated.');
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    if (!passwordMeetsLength || !passwordHasLetter || !passwordHasNumber) {
      setMessage(
        `Use at least ${minimumPasswordLength} characters and include both letters and numbers before updating your password.`,
      );
      return;
    }

    if (!passwordConfirmed) {
      setMessage('Password confirmation does not match.');
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setSaving(false);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password updated.');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cloud Account</h1>
          <p className="mt-1 text-sm text-muted">
            Manage the identity that powers subscriptions, claimed servers, companion sign-in, and future relay access.
          </p>
        </div>

        {message && (
          <div className="rounded-lg bg-surface p-3 text-sm text-foreground">{message}</div>
        )}

        <form onSubmit={handleProfileSave} className="rounded-xl surface-soft p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Profile</h2>
          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-foreground">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-input/50 px-3 py-2 text-sm text-muted"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            Save Profile
          </button>
        </form>

        <form onSubmit={handlePasswordChange} className="rounded-xl surface-soft p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Change Password</h2>
          <div>
            <label htmlFor="newPw" className="mb-1 block text-sm font-medium text-foreground">
              New password
            </label>
            <input
              id="newPw"
              type="password"
              minLength={minimumPasswordLength}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-ring"
            />
          </div>
          <div>
            <label htmlFor="confirmPw" className="mb-1 block text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <input
              id="confirmPw"
              type="password"
              minLength={minimumPasswordLength}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-ring"
            />
          </div>
          <div className="rounded-lg bg-surface/50 p-4 text-sm text-muted">
            <p className="font-medium text-foreground">
              {accessProfile?.isOperator
                ? 'Operator accounts require a stronger password.'
                : 'Use a long password for your hosted cloud account.'}
            </p>
            <ul className="mt-3 space-y-2">
              <li>{passwordMeetsLength ? 'Meets' : 'Needs'} the {minimumPasswordLength}-character minimum</li>
              <li>{passwordHasLetter ? 'Contains' : 'Needs'} at least one letter</li>
              <li>{passwordHasNumber ? 'Contains' : 'Needs'} at least one number</li>
              <li>{passwordConfirmed ? 'Matches' : 'Needs'} confirmation</li>
            </ul>
            {accessProfile?.isOperator ? (
              <p className="mt-3">
                Keep operator credentials separate from customer accounts, store them in a password manager, and rotate them after any shared operational access.
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={saving || !newPassword || !passwordConfirmed || !passwordMeetsLength || !passwordHasLetter || !passwordHasNumber}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            Update Password
          </button>
        </form>

        <div className="rounded-xl surface-soft p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">Cloud Access</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-surface/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Managed Media</p>
              <p className="mt-2 text-foreground">
                {accessProfile?.managedMediaEntitled ? 'Enabled' : 'Disabled'}
              </p>
              <p className="mt-1 text-muted">
                {accessProfile?.managedMediaPolicy === 'all-authenticated-users'
                  ? 'Managed media is currently granted platform-wide to every authenticated cloud account.'
                  : 'Managed media is currently controlled per profile through operator-managed overrides.'}
              </p>
              {accessProfile?.managedMediaPolicy === 'explicit-per-profile' ? (
                <p className="mt-2 text-xs text-muted">
                  Profile override: {accessProfile.managedMediaAccessOverride ? 'enabled' : 'disabled'}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg bg-surface/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Self-Hosted Relay Access</p>
              <p className="mt-2 text-foreground">
                {accessProfile?.relayRemoteAccessEntitled ? 'Entitled' : 'Paid plan required'}
              </p>
              <p className="mt-1 text-muted">
                {accessProfile?.relayAccessPolicyDescription ??
                  'Remote relay policy for self-hosted servers is currently unavailable.'}
              </p>
              <p className="mt-2 text-xs text-muted">
                {accessProfile?.hasPaidCloudPlan
                  ? 'This account currently has an active or trialing OmniLux Cloud subscription.'
                  : 'This account does not currently have an active or trialing OmniLux Cloud subscription.'}
              </p>
            </div>
            <div className="rounded-lg bg-surface/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Operator Access</p>
              <p className="mt-2 text-foreground">
                {accessProfile?.isOperator ? 'Operator account' : 'Standard account'}
              </p>
              <p className="mt-1 text-muted">
                Operator access exposes the internal `ops.omnilux.tv` console and cloud access-management tools.
              </p>
              {accessProfile?.isOperator ? (
                <p className="mt-2 text-xs text-muted">
                  Sensitive operator actions now require MFA and an `aal2` session, not just operator role membership.
                </p>
              ) : null}
            </div>
            <div className="rounded-lg bg-surface/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Last Sign-In</p>
              <p className="mt-2 text-foreground">
                {accessProfile?.lastSignInAt ? new Date(accessProfile.lastSignInAt).toLocaleString() : 'Not available'}
              </p>
              <p className="mt-1 text-muted">
                Latest hosted auth sign-in recorded by OmniLux Cloud for this account.
              </p>
            </div>
            <div className="rounded-lg bg-surface/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Session Window</p>
              <p className="mt-2 text-foreground">
                {accessProfile?.sessionExpiresAt ? new Date(accessProfile.sessionExpiresAt).toLocaleString() : 'Not available'}
              </p>
              <p className="mt-1 text-muted">
                Session issued {accessProfile?.sessionIssuedAt ? new Date(accessProfile.sessionIssuedAt).toLocaleString() : 'not available'}.
              </p>
            </div>
            <div className="rounded-lg bg-surface/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Session Assurance</p>
              <p className="mt-2 text-foreground">{sessionAssuranceLabel}</p>
              <p className="mt-1 text-muted">
                Operator changes stay locked until this session is elevated with MFA.
              </p>
            </div>
          </div>
        </div>

        {accessProfile?.isOperator ? <OperatorMfaCard enabled /> : null}

        <div className="rounded-xl border border-danger/30 p-6">
          <h2 className="text-lg font-bold text-danger">Danger Zone</h2>
          <p className="mt-2 text-sm text-muted">
            Self-service account deletion is not live yet. Contact OmniLux support if you need account removal before
            the hosted backend flow is available.
          </p>
          <button
            type="button"
            disabled={!destructiveAccountActionsAvailable}
            className="mt-4 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground opacity-60"
          >
            Delete Account Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
};
