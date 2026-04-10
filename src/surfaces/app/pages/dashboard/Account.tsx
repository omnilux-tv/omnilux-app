import { useState, type FormEvent } from 'react';
import { getCurrentSiteSurface } from '@/lib/site-surface';
import { useAuth } from '@/providers/AuthProvider';
import { OperatorMfaCard } from '@/surfaces/app/components/OperatorMfaCard';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import {
  OpsCallout,
  OpsPageShell,
  OpsPanel,
  OpsStatusBadge,
  opsButtonClassName,
} from '@/surfaces/app/pages/dashboard/OpsPageShell';
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
  const isOpsSurface =
    typeof window !== 'undefined' && getCurrentSiteSurface(window.location.hostname) === 'ops';

  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });

    setSaving(false);
    setMessage(error ? error.message : 'Profile updated.');
  };

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault();
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

  if (isOpsSurface) {
    return (
      <OpsPageShell
        eyebrow="Account Settings"
        title="Keep operator identity and session assurance current."
        description="Manage the operator identity that powers privileged access, session step-up, and sensitive control-plane actions."
        metrics={[
          {
            label: 'Operator access',
            value: accessProfile?.isOperator ? 'Enabled' : 'Standard',
            detail: 'Role membership for the ops console.',
            tone: accessProfile?.isOperator ? 'warning' : 'neutral',
          },
          {
            label: 'Session assurance',
            value: sessionAssuranceLabel,
            detail: 'Sensitive operator actions require AAL2.',
            tone: accessProfile?.sessionAssuranceLevel === 'aal2' ? 'success' : 'warning',
          },
          {
            label: 'Managed media',
            value: accessProfile?.managedMediaEntitled ? 'Enabled' : 'Disabled',
            detail: 'Current managed-media entitlement state.',
            tone: accessProfile?.managedMediaEntitled ? 'info' : 'neutral',
          },
          {
            label: 'Relay access',
            value: accessProfile?.relayRemoteAccessEntitled ? 'Entitled' : 'Policy-gated',
            detail: 'Remote self-hosted access entitlement.',
          },
        ]}
      >
        {message ? <OpsCallout tone="info" title="Account update" body={message} /> : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_360px]">
          <div className="space-y-4">
            <OpsPanel title="Profile" description="Display metadata used throughout the operator console.">
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="text-muted">Display name</span>
                    <input
                      id="displayName"
                      type="text"
                      autoComplete="name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground outline-none focus:border-border-hover"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-muted">Email</span>
                    <input
                      type="email"
                      value={user?.email ?? ''}
                      disabled
                      autoComplete="email"
                      className="h-10 w-full rounded-md border border-border bg-panel-muted px-3 text-sm text-muted"
                    />
                  </label>
                </div>
                <button type="submit" disabled={saving} className={opsButtonClassName({ tone: 'primary' })}>
                  Save profile
                </button>
              </form>
            </OpsPanel>

            <OpsPanel
              title="Password and session hygiene"
              description="Operator accounts require stronger passwords and step-up MFA for sensitive actions."
            >
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="text-muted">New password</span>
                    <input
                      id="newPw"
                      type="password"
                      minLength={minimumPasswordLength}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground outline-none focus:border-border-hover"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-muted">Confirm password</span>
                    <input
                      id="confirmPw"
                      type="password"
                      minLength={minimumPasswordLength}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground outline-none focus:border-border-hover"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: `${minimumPasswordLength}+ chars`,
                      ready: passwordMeetsLength,
                    },
                    {
                      label: 'Contains a letter',
                      ready: passwordHasLetter,
                    },
                    {
                      label: 'Contains a number',
                      ready: passwordHasNumber,
                    },
                    {
                      label: 'Matches confirmation',
                      ready: passwordConfirmed,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                      <OpsStatusBadge tone={item.ready ? 'success' : 'warning'}>
                        {item.ready ? 'Ready' : 'Required'}
                      </OpsStatusBadge>
                      <p className="mt-3 text-sm text-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={
                    saving || !newPassword || !passwordConfirmed || !passwordMeetsLength || !passwordHasLetter || !passwordHasNumber
                  }
                  className={opsButtonClassName({ tone: 'primary' })}
                >
                  Update password
                </button>
              </form>
            </OpsPanel>
          </div>

          <div className="space-y-4">
            <OpsPanel title="Access posture" description="Current privilege, entitlement, and session state for this account.">
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Managed media</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {accessProfile?.managedMediaEntitled ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {accessProfile?.managedMediaPolicy === 'all-authenticated-users'
                      ? 'Managed media is currently granted platform-wide to every authenticated cloud account.'
                      : 'Managed media is currently controlled per profile through operator-managed overrides.'}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Self-hosted relay access</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {accessProfile?.relayRemoteAccessEntitled ? 'Entitled' : 'Paid plan required'}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {accessProfile?.relayAccessPolicyDescription ??
                      'Remote relay policy for self-hosted servers is currently unavailable.'}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Operator access</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {accessProfile?.isOperator ? 'Operator account' : 'Standard account'}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Operator access exposes the internal `ops.omnilux.tv` console and cloud access-management tools.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Session window</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {accessProfile?.sessionExpiresAt
                      ? new Date(accessProfile.sessionExpiresAt).toLocaleString()
                      : 'Not available'}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Issued{' '}
                    {accessProfile?.sessionIssuedAt
                      ? new Date(accessProfile.sessionIssuedAt).toLocaleString()
                      : 'not available'}
                    .
                  </p>
                </div>
              </div>
            </OpsPanel>

            {accessProfile?.isOperator ? <OperatorMfaCard enabled /> : null}

            <OpsPanel title="Danger zone" description="Self-service account deletion is not live yet.">
              <button
                type="button"
                disabled={!destructiveAccountActionsAvailable}
                className={opsButtonClassName({ tone: 'danger' })}
              >
                Request account deletion
              </button>
            </OpsPanel>
          </div>
        </div>
      </OpsPageShell>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cloud Account</h1>
          <p className="mt-1 text-sm text-muted">
            Manage the identity that powers subscriptions, claimed servers, companion sign-in, and future relay access.
          </p>
        </div>

        {message && <div className="rounded-lg bg-surface p-3 text-sm text-foreground">{message}</div>}

        <form onSubmit={handleProfileSave} className="rounded-xl space-y-4 surface-soft p-6">
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
              onChange={(event) => setDisplayName(event.target.value)}
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

        <form onSubmit={handlePasswordChange} className="rounded-xl space-y-4 surface-soft p-6">
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
              onChange={(event) => setNewPassword(event.target.value)}
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
              onChange={(event) => setConfirmPassword(event.target.value)}
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
          </div>
          <button
            type="submit"
            disabled={saving || !newPassword || !passwordConfirmed || !passwordMeetsLength || !passwordHasLetter || !passwordHasNumber}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            Update Password
          </button>
        </form>

        {accessProfile?.isOperator ? <OperatorMfaCard enabled /> : null}
      </div>
    </div>
  );
};
