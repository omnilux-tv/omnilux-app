import { Link } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import {
  formatTimestamp,
  renderAuditSummary,
  renderProfileLabel,
} from '@/surfaces/app/lib/ops-formatters';
import {
  useOperatorAccessProfiles,
  useOperatorSupportProfile,
  usePlatformSettings,
} from '@/surfaces/app/lib/ops';
import { OpsLoadingState, OpsNotice, OpsPageShell } from '@/surfaces/app/pages/dashboard/OpsPageShell';

interface OpsAccountsProps {
  initialLookup?: string;
}

export const OpsAccounts = ({ initialLookup }: OpsAccountsProps) => {
  const queryClient = useQueryClient();
  const {
    data: accessProfile,
    isLoading: isAccessProfileLoading,
    error: accessProfileError,
  } = useAccessProfile();
  const operatorEnabled = Boolean(accessProfile?.isOperator);
  const operatorMutationsLocked = accessProfile?.sessionAssuranceLevel !== 'aal2';
  const [message, setMessage] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(initialLookup ?? '');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [supportNoteDraft, setSupportNoteDraft] = useState('');
  const [supportNoteTagsDraft, setSupportNoteTagsDraft] = useState('');
  const deferredSearchValue = useDeferredValue(searchValue);
  const { data: profiles, error, isLoading } = useOperatorAccessProfiles(operatorEnabled);
  const { data: platformSettings } = usePlatformSettings(operatorEnabled);

  const sortedProfiles = useMemo(
    () =>
      [...(profiles ?? [])].sort((left, right) => {
        if (left.isOperator !== right.isOperator) {
          return left.isOperator ? -1 : 1;
        }

        return (left.email ?? left.displayName ?? left.id).localeCompare(right.email ?? right.displayName ?? right.id);
      }),
    [profiles],
  );

  const filteredProfiles = useMemo(() => {
    const query = deferredSearchValue.trim().toLowerCase();

    if (!query) {
      return sortedProfiles;
    }

    return sortedProfiles.filter((profile) =>
      [profile.displayName, profile.email, profile.id]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [deferredSearchValue, sortedProfiles]);

  useEffect(() => {
    setSearchValue(initialLookup ?? '');
  }, [initialLookup]);

  useEffect(() => {
    if (filteredProfiles.length === 0) {
      setSelectedProfileId(null);
      return;
    }

    if (selectedProfileId && filteredProfiles.some((profile) => profile.id === selectedProfileId)) {
      return;
    }

    setSelectedProfileId(filteredProfiles[0]?.id ?? null);
  }, [filteredProfiles, selectedProfileId]);

  const {
    data: supportProfile,
    error: supportProfileError,
    isLoading: isSupportProfileLoading,
  } = useOperatorSupportProfile(operatorEnabled, selectedProfileId);

  const updateProfileAccess = useMutation({
    mutationFn: async ({
      userId,
      managedMediaEntitled,
      isOperator,
    }: {
      userId: string;
      managedMediaEntitled?: boolean;
      isOperator?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('update-profile-access', {
        body: {
          userId,
          managedMediaEntitled,
          isOperator,
          source: 'operator-dashboard',
        },
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: async (_, variables) => {
      setMessage('Account access updated.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operator-access-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['operator-access-audit-log'] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
        queryClient.invalidateQueries({ queryKey: ['access-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['operator-support-profile', variables.userId] }),
      ]);
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to update account access.');
    },
  });

  const createSupportNote = useMutation({
    mutationFn: async ({
      userId,
      note,
      tags,
    }: {
      userId: string;
      note: string;
      tags: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke('create-support-note', {
        body: {
          userId,
          note,
          tags,
          source: 'operator-dashboard',
        },
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: async (_, variables) => {
      setSupportNoteDraft('');
      setSupportNoteTagsDraft('');
      setMessage('Support note saved.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operator-support-profile', variables.userId] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
        queryClient.invalidateQueries({ queryKey: ['ops-overview'] }),
      ]);
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to save support note.');
    },
  });

  const sendPasswordResetEmail = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('send-password-reset-email', {
        body: {
          userId,
          source: 'operator-dashboard',
        },
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: async (_, userId) => {
      setMessage('Password reset email sent.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operator-support-profile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
      ]);
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to send password reset email.');
    },
  });

  const revokeRelaySession = useMutation({
    mutationFn: async ({
      sessionId,
      userId,
    }: {
      sessionId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('revoke-relay-session', {
        body: {
          sessionId,
          source: 'operator-dashboard',
        },
      });
      if (error) {
        throw error;
      }
      return { data, userId };
    },
    onSuccess: async ({ userId }) => {
      setMessage('Relay session revoked.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operator-support-profile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
        queryClient.invalidateQueries({ queryKey: ['ops-overview'] }),
      ]);
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to revoke relay session.');
    },
  });

  const revokeServerRelayToken = useMutation({
    mutationFn: async ({
      tokenId,
      userId,
    }: {
      tokenId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('revoke-server-relay-token', {
        body: {
          tokenId,
          source: 'operator-dashboard',
        },
      });
      if (error) {
        throw error;
      }
      return { data, userId };
    },
    onSuccess: async ({ userId }) => {
      setMessage('Relay token revoked.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operator-support-profile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
      ]);
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to revoke relay token.');
    },
  });

  if (isAccessProfileLoading) {
    return <OpsLoadingState />;
  }

  if (accessProfileError) {
    return (
      <OpsNotice
        title="Account operations unavailable"
        body={accessProfileError instanceof Error ? accessProfileError.message : 'Failed to load access profile.'}
        tone="danger"
      />
    );
  }

  if (!accessProfile?.isOperator) {
    return (
      <OpsNotice
        title="Operator Access Required"
        body="This page is reserved for internal OmniLux operator accounts."
      />
    );
  }

  const profileManagedMediaControlsDisabled =
    platformSettings?.managedMediaPolicy === 'all-authenticated-users';
  const paidPlanCount = (profiles ?? []).filter((profile) => profile.subscription).length;
  const operatorCount = (profiles ?? []).filter((profile) => profile.isOperator).length;
  const explicitAccessCount = (profiles ?? []).filter((profile) => profile.managedMediaEntitled).length;
  const supportNoteTags = supportNoteTagsDraft
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <OpsPageShell
      eyebrow="Accounts"
      title="Run customer operations with full account context."
      description="Search cloud accounts, inspect billing and linked runtime posture, and take controlled support actions from a dedicated workspace instead of a mixed admin card stack."
      metrics={[
        {
          label: 'Accounts',
          value: String(profiles?.length ?? 0),
          detail: 'Cloud customer profiles available to ops.',
        },
        {
          label: 'Paid plans',
          value: String(paidPlanCount),
          detail: 'Accounts with an attached subscription record.',
        },
        {
          label: 'Operators',
          value: String(operatorCount),
          detail: 'Profiles with org-operator privileges.',
        },
        {
          label: 'Explicit media access',
          value: String(explicitAccessCount),
          detail: 'Direct managed-media entitlements.',
        },
      ]}
    >
      {operatorMutationsLocked ? (
        <section className="rounded-[1.75rem] border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
          <p className="font-semibold text-foreground">Sensitive account actions are locked for this session.</p>
          <p className="mt-2">
            Current assurance: {accessProfile.sessionAssuranceLevel?.toUpperCase() ?? 'Unknown'}. Verify MFA in your
            own account before changing operator access, sending reset links, revoking relay credentials, or writing
            support notes.
          </p>
          <Link
            to="/dashboard/account"
            className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
          >
            Open account security
          </Link>
        </section>
      ) : null}

      {message ? (
        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-4 text-sm text-foreground">
          {message}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-5">
            <label
              htmlFor="ops-accounts-search"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
            >
              Search accounts
            </label>
            <div className="mt-3 flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3">
              <Search className="h-4 w-4 text-muted" />
              <input
                id="ops-accounts-search"
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.currentTarget.value)}
                placeholder="Search by name, email, or user id"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              />
            </div>
            <p className="mt-3 text-sm text-muted">
              {profileManagedMediaControlsDisabled
                ? 'Managed media is currently granted to every authenticated OmniLux Cloud account, so per-profile media toggles are paused.'
                : 'Managed media is currently controlled account by account, so per-profile media toggles are live.'}
            </p>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-foreground">Account rail</h2>
              <span className="text-xs uppercase tracking-[0.18em] text-muted">{filteredProfiles.length} visible</span>
            </div>

            {isLoading ? (
              <div className="mt-5 space-y-3">
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="h-24 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
                ))}
              </div>
            ) : error ? (
              <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
                {error instanceof Error ? error.message : 'Failed to load access profiles.'}
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
                No accounts matched the current search.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {filteredProfiles.map((profile) => {
                  const selected = profile.id === selectedProfileId;
                  const subscriptionLabel = profile.subscription
                    ? `${profile.subscription.tier} · ${profile.subscription.status}`
                    : 'No active subscription';

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        setMessage(null);
                        setSelectedProfileId(profile.id);
                      }}
                      className={`w-full rounded-[1.25rem] border p-4 text-left transition-colors ${
                        selected
                          ? 'border-accent bg-accent/10'
                          : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.06]'
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {profile.displayName || profile.email || profile.id}
                      </p>
                      <p className="mt-1 text-sm text-muted">{profile.email || profile.id}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
                          {subscriptionLabel}
                        </span>
                        {profile.managedMediaEntitled ? (
                          <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-success">
                            Media
                          </span>
                        ) : null}
                        {profile.isOperator ? (
                          <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-warning">
                            Operator
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </aside>

        <section className="space-y-6">
          {!selectedProfileId ? (
            <section className="rounded-[1.75rem] border border-dashed border-white/10 bg-black/18 p-10 text-sm text-muted">
              Choose an account from the rail to open its dedicated workspace.
            </section>
          ) : isSupportProfileLoading ? (
            <section className="grid gap-6 xl:grid-cols-2">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="h-44 animate-pulse rounded-[1.75rem] bg-white/[0.04]" />
              ))}
            </section>
          ) : supportProfileError ? (
            <section className="rounded-[1.75rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
              {supportProfileError instanceof Error ? supportProfileError.message : 'Failed to load account workspace.'}
            </section>
          ) : supportProfile ? (
            <>
              <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Selected account</p>
                    <h2 className="mt-2 font-display text-3xl font-bold text-foreground">
                      {supportProfile.profile.displayName || supportProfile.profile.email || supportProfile.profile.id}
                    </h2>
                    <p className="mt-2 text-sm text-muted">
                      {supportProfile.profile.email || supportProfile.profile.id}
                    </p>
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">
                    Opening an account records a sensitive operator audit event
                  </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_420px]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] bg-black/20 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Managed media</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {supportProfile.profile.managedMediaEntitled ? 'Enabled' : 'Disabled'}
                        </p>
                        <p className="mt-2 text-sm text-muted">
                          Override {supportProfile.profile.managedMediaAccessOverride ? 'enabled' : 'disabled'}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] bg-black/20 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Account role</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {supportProfile.profile.isOperator ? 'Operator account' : 'Standard account'}
                        </p>
                        <p className="mt-2 text-sm text-muted">Updated {formatTimestamp(supportProfile.profile.updatedAt)}</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-black/20 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Last sign-in</p>
                        <p className="mt-2 text-sm text-foreground">{formatTimestamp(supportProfile.profile.lastSignInAt)}</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-black/20 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Created</p>
                        <p className="mt-2 text-sm text-foreground">{formatTimestamp(supportProfile.profile.createdAt)}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 xl:grid-cols-3">
                      <button
                        type="button"
                        disabled={
                          operatorMutationsLocked ||
                          updateProfileAccess.isPending ||
                          profileManagedMediaControlsDisabled
                        }
                        onClick={() => {
                          const nextValue = !supportProfile.profile.managedMediaEntitled;
                          const actionLabel = nextValue ? 'enable' : 'disable';
                          const label = supportProfile.profile.email || supportProfile.profile.id;

                          if (!window.confirm(`Really ${actionLabel} managed media for ${label}?`)) {
                            return;
                          }

                          setMessage(null);
                          updateProfileAccess.mutate({
                            userId: supportProfile.profile.id,
                            managedMediaEntitled: nextValue,
                          });
                        }}
                        className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                      >
                        <p className="font-semibold text-foreground">
                          {supportProfile.profile.managedMediaEntitled ? 'Disable' : 'Enable'} managed media
                        </p>
                        <p className="mt-1 text-muted">
                          {profileManagedMediaControlsDisabled
                            ? 'Paused by current global media policy.'
                            : 'Change direct access for this account.'}
                        </p>
                      </button>

                      <button
                        type="button"
                        disabled={operatorMutationsLocked || updateProfileAccess.isPending}
                        onClick={() => {
                          const nextValue = !supportProfile.profile.isOperator;
                          const actionLabel = nextValue ? 'grant' : 'remove';
                          const label = supportProfile.profile.email || supportProfile.profile.id;

                          if (!window.confirm(`Really ${actionLabel} operator access for ${label}?`)) {
                            return;
                          }

                          setMessage(null);
                          updateProfileAccess.mutate({
                            userId: supportProfile.profile.id,
                            isOperator: nextValue,
                          });
                        }}
                        className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                      >
                        <p className="font-semibold text-foreground">
                          {supportProfile.profile.isOperator ? 'Remove' : 'Grant'} operator access
                        </p>
                        <p className="mt-1 text-muted">Use for real internal staff only.</p>
                      </button>

                      <button
                        type="button"
                        disabled={operatorMutationsLocked || sendPasswordResetEmail.isPending}
                        onClick={() => {
                          const label = supportProfile.profile.email || supportProfile.profile.id;

                          if (!window.confirm(`Send a password reset email to ${label}?`)) {
                            return;
                          }

                          setMessage(null);
                          sendPasswordResetEmail.mutate(supportProfile.profile.id);
                        }}
                        className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                      >
                        <p className="font-semibold text-foreground">Send password reset</p>
                        <p className="mt-1 text-muted">Deliver a reset link to the account email.</p>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Billing posture</p>
                    {supportProfile.profile.subscription ? (
                      <>
                        <p className="mt-3 text-xl font-semibold text-foreground">
                          {supportProfile.profile.subscription.tier} · {supportProfile.profile.subscription.status}
                        </p>
                        <p className="mt-2 text-sm text-muted">
                          Current period ends {formatTimestamp(supportProfile.profile.subscription.currentPeriodEnd)}
                        </p>
                        <p className="mt-2 text-sm text-muted">
                          Billing record updated {formatTimestamp(supportProfile.profile.subscription.updatedAt)}
                        </p>
                        <div className="mt-5">
                          <Link
                            to="/dashboard/financials"
                            className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                          >
                            Open financial lane
                          </Link>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mt-3 text-lg font-semibold text-foreground">No active subscription record</p>
                        <p className="mt-2 text-sm text-muted">
                          This account is not currently attached to a cloud billing record.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-foreground">Self-hosted servers</h2>
                      <p className="mt-2 text-sm text-muted">
                        Customer-owned runtimes linked to this cloud account.
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.18em] text-muted">
                      {supportProfile.selfHostedServers.length} servers
                    </span>
                  </div>

                  {supportProfile.selfHostedServers.length === 0 ? (
                    <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
                      No self-hosted servers are linked to this account.
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {supportProfile.selfHostedServers.map((server) => (
                        <div key={server.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{server.name}</p>
                              <p className="mt-1 text-sm text-muted">
                                {server.ownership === 'owner' ? 'Owner' : `Shared · ${server.accessRole}`}
                              </p>
                            </div>
                            <span className="text-xs uppercase tracking-[0.18em] text-muted">
                              {server.relayStatus ?? 'unknown'} relay
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-muted">
                            {server.publicOrigin ?? 'No public origin'} · Last seen {formatTimestamp(server.lastSeenAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-foreground">Recent relay sessions</h2>
                      <p className="mt-2 text-sm text-muted">
                        Remote-access sessions issued for this account.
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.18em] text-muted">
                      {supportProfile.recentRelaySessions.length} sessions
                    </span>
                  </div>

                  {supportProfile.recentRelaySessions.length === 0 ? (
                    <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
                      No recent relay sessions were issued for this account.
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {supportProfile.recentRelaySessions.map((session) => (
                        <div key={session.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{session.serverName}</p>
                              <p className="mt-1 text-sm text-muted">
                                {session.sessionType} · {session.status}
                              </p>
                              <p className="mt-2 text-sm text-muted">
                                Issued {formatTimestamp(session.issuedAt)} · Expires {formatTimestamp(session.expiresAt)}
                              </p>
                            </div>
                            {session.revocable ? (
                              <button
                                type="button"
                                disabled={operatorMutationsLocked || revokeRelaySession.isPending}
                                onClick={() => {
                                  if (!window.confirm(`Revoke the relay session for ${session.serverName}?`)) {
                                    return;
                                  }

                                  setMessage(null);
                                  revokeRelaySession.mutate({
                                    sessionId: session.id,
                                    userId: supportProfile.profile.id,
                                  });
                                }}
                                className="rounded-full border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                              >
                                Revoke session
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-foreground">Active relay tokens</h2>
                      <p className="mt-2 text-sm text-muted">
                        Current relay credentials tied to this account’s servers.
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.18em] text-muted">
                      {supportProfile.relayTokens.length} tokens
                    </span>
                  </div>

                  {supportProfile.relayTokens.length === 0 ? (
                    <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
                      No active relay tokens were found for this account’s self-hosted servers.
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {supportProfile.relayTokens.map((token) => (
                        <div key={token.tokenId} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{token.serverName}</p>
                              <p className="mt-1 text-sm text-muted">
                                {token.ownership === 'owner' ? 'Owner' : 'Shared'} · {token.issuedFor}
                              </p>
                              <p className="mt-2 text-sm text-muted">
                                {token.tokenPrefix} · Last used {formatTimestamp(token.lastUsedAt)} · Expires{' '}
                                {formatTimestamp(token.expiresAt)}
                              </p>
                            </div>
                            {token.revocable ? (
                              <button
                                type="button"
                                disabled={operatorMutationsLocked || revokeServerRelayToken.isPending}
                                onClick={() => {
                                  if (!window.confirm(`Revoke the active relay token for ${token.serverName}?`)) {
                                    return;
                                  }

                                  setMessage(null);
                                  revokeServerRelayToken.mutate({
                                    tokenId: token.tokenId,
                                    userId: supportProfile.profile.id,
                                  });
                                }}
                                className="rounded-full border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                              >
                                Revoke token
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
                  <h2 className="font-display text-2xl font-bold text-foreground">Support notes</h2>
                  <p className="mt-2 text-sm text-muted">
                    Operator-only notes for handoff, incident context, and next actions.
                  </p>

                  <div className="mt-5 space-y-3">
                    <textarea
                      rows={5}
                      value={supportNoteDraft}
                      onChange={(event) => setSupportNoteDraft(event.currentTarget.value)}
                      placeholder="Summarize the issue, the action taken, and what the next operator should know."
                      disabled={operatorMutationsLocked}
                      className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none focus:border-white/20"
                    />
                    <input
                      type="text"
                      value={supportNoteTagsDraft}
                      onChange={(event) => setSupportNoteTagsDraft(event.currentTarget.value)}
                      placeholder="Optional tags, comma separated (billing, relay, auth)"
                      disabled={operatorMutationsLocked}
                      className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none focus:border-white/20"
                    />
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <p className="text-sm text-muted">
                        Tagged notes remain attached to this account’s operator history.
                      </p>
                      <button
                        type="button"
                        disabled={
                          operatorMutationsLocked ||
                          createSupportNote.isPending ||
                          supportNoteDraft.trim().length === 0
                        }
                        onClick={() => {
                          const note = supportNoteDraft.trim();

                          if (!note) {
                            return;
                          }

                          if (
                            !window.confirm(
                              `Save a support note for ${supportProfile.profile.email || supportProfile.profile.id}?`,
                            )
                          ) {
                            return;
                          }

                          setMessage(null);
                          createSupportNote.mutate({
                            userId: supportProfile.profile.id,
                            note,
                            tags: supportNoteTags,
                          });
                        }}
                        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-95 disabled:opacity-50"
                      >
                        Save note
                      </button>
                    </div>
                  </div>

                  {supportProfile.supportNotes.length === 0 ? (
                    <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
                      No support notes have been recorded for this account yet.
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {supportProfile.supportNotes.map((note) => (
                        <div key={note.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <p className="text-sm font-semibold text-foreground">
                              {renderProfileLabel(note.actor)} · {formatTimestamp(note.createdAt)}
                            </p>
                            {note.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {note.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-muted">{note.note}</p>
                          {note.server ? (
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
                              Server context {note.server.name}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground">Recent access changes</h2>
                    <p className="mt-2 text-sm text-muted">
                      Account-specific entitlement and operator access changes.
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">
                    {supportProfile.recentAccessChanges.length} events
                  </span>
                </div>

                {supportProfile.recentAccessChanges.length === 0 ? (
                  <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
                    No access changes have been recorded for this account.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {supportProfile.recentAccessChanges.map((row) => (
                      <div key={row.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                        <p className="text-sm font-semibold text-foreground">
                          {renderProfileLabel(row.actor)} changed {renderProfileLabel(row.target)}
                        </p>
                        <p className="mt-2 text-sm text-muted">{renderAuditSummary(row)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </section>
      </div>
    </OpsPageShell>
  );
};
