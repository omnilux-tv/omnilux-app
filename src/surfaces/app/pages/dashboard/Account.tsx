import { useState, type FormEvent } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { supabase } from '@/lib/supabase';

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

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Account</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Profile and Security</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Manage the identity attached to your OmniLux Cloud account, along with password hygiene and the current
            entitlement posture for managed media and self-hosted relay access.
          </p>
        </div>

        {message ? (
          <div className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-foreground">{message}</div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl surface-soft p-6">
            <h2 className="font-semibold text-foreground">Profile</h2>
            <form onSubmit={handleProfileSave} className="mt-4 space-y-4">
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
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                Save profile
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-background p-6">
            <h2 className="font-semibold text-foreground">Access posture</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Managed media</dt>
                <dd className="mt-1 text-foreground">
                  {accessProfile?.managedMediaEntitled ? 'Enabled for this account' : 'Not currently enabled'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Relay access</dt>
                <dd className="mt-1 text-foreground">
                  {accessProfile?.relayRemoteAccessEntitled ? 'Entitled' : 'Policy-gated'}
                </dd>
                <dd className="mt-1 text-muted">
                  {accessProfile?.relayAccessPolicyDescription ?? 'Relay policy is currently unavailable.'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Operator access</dt>
                <dd className="mt-1 text-foreground">
                  {accessProfile?.isOperator ? 'Available through the separate ops console' : 'Standard customer access'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Session expiry</dt>
                <dd className="mt-1 text-foreground">
                  {accessProfile?.sessionExpiresAt ? new Date(accessProfile.sessionExpiresAt).toLocaleString() : 'Unavailable'}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="rounded-xl border border-border bg-background p-6">
          <h2 className="font-semibold text-foreground">Password</h2>
          <p className="mt-2 text-sm text-muted">
            Use at least {minimumPasswordLength} characters and include both letters and numbers.
          </p>
          <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
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
                { label: `${minimumPasswordLength}+ chars`, ready: passwordMeetsLength },
                { label: 'Contains a letter', ready: passwordHasLetter },
                { label: 'Contains a number', ready: passwordHasNumber },
                { label: 'Matches confirmation', ready: passwordConfirmed },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {item.ready ? 'Ready' : 'Required'}
                  </p>
                  <p className="mt-3 text-sm text-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={
                saving || !newPassword || !passwordConfirmed || !passwordMeetsLength || !passwordHasLetter || !passwordHasNumber
              }
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              Update password
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
