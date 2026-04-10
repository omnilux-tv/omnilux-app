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
import {
  OpsCallout,
  OpsConfirmDialog,
  OpsEmptyState,
  OpsKeyValueList,
  OpsLoadingState,
  OpsNotice,
  OpsPageShell,
  OpsPanel,
  OpsStatusBadge,
  OpsTable,
  OpsTableBody,
  OpsTableCell,
  OpsTableHead,
  OpsTableHeaderCell,
  OpsTableRow,
  OpsToolbar,
  opsButtonClassName,
} from '@/surfaces/app/pages/dashboard/OpsPageShell';

interface OpsAccountsProps {
  initialLookup?: string;
}

type AccountFilter = 'all' | 'operators' | 'paid' | 'attention';

const normalizeSubscriptionStatus = (value: string | null | undefined) => (value ?? 'unknown').toLowerCase();

const subscriptionTone = (value: string | null | undefined) => {
  const normalized = normalizeSubscriptionStatus(value);
  if (normalized === 'active') return 'success' as const;
  if (normalized === 'trialing') return 'info' as const;
  if (normalized === 'unknown') return 'neutral' as const;
  return 'warning' as const;
};

const relayTone = (value: string | null | undefined) => {
  const normalized = (value ?? 'unknown').toLowerCase();
  if (normalized.includes('online') || normalized.includes('connected')) return 'success' as const;
  if (normalized.includes('degraded') || normalized.includes('attention')) return 'warning' as const;
  if (normalized.includes('offline') || normalized.includes('error')) return 'danger' as const;
  return 'neutral' as const;
};

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
  const [activeFilter, setActiveFilter] = useState<AccountFilter>('all');
  const [confirmation, setConfirmation] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    confirmTone?: 'primary' | 'danger';
    onConfirm: () => void;
  } | null>(null);
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

    return sortedProfiles.filter((profile) => {
      const matchesQuery =
        query.length === 0 ||
        [profile.displayName, profile.email, profile.id].filter(Boolean).some((value) => value!.toLowerCase().includes(query));

      if (!matchesQuery) {
        return false;
      }

      if (activeFilter === 'operators') {
        return profile.isOperator;
      }

      if (activeFilter === 'paid') {
        return Boolean(profile.subscription);
      }

      if (activeFilter === 'attention') {
        const status = normalizeSubscriptionStatus(profile.subscription?.status);
        return !profile.subscription || (status !== 'active' && status !== 'trialing');
      }

      return true;
    });
  }, [activeFilter, deferredSearchValue, sortedProfiles]);

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
    return <OpsLoadingState label="Loading account workspace" />;
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
    return <OpsNotice title="Operator Access Required" body="This page is reserved for internal OmniLux operator accounts." />;
  }

  const profileManagedMediaControlsDisabled = platformSettings?.managedMediaPolicy === 'all-authenticated-users';
  const paidPlanCount = (profiles ?? []).filter((profile) => profile.subscription).length;
  const operatorCount = (profiles ?? []).filter((profile) => profile.isOperator).length;
  const explicitAccessCount = (profiles ?? []).filter((profile) => profile.managedMediaEntitled).length;
  const supportNoteTags = supportNoteTagsDraft
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const requestConfirmation = ({
    title,
    body,
    confirmLabel,
    confirmTone = 'danger',
    onConfirm,
  }: {
    title: string;
    body: string;
    confirmLabel: string;
    confirmTone?: 'primary' | 'danger';
    onConfirm: () => void;
  }) => {
    setConfirmation({ title, body, confirmLabel, confirmTone, onConfirm });
  };

  return (
    <>
      <OpsPageShell
        eyebrow="Accounts"
        title="Run customer operations with full account context."
        description="Search cloud accounts, inspect billing and linked runtime posture, and take controlled support actions from a dedicated list/detail workspace."
        metrics={[
          {
            label: 'Accounts',
            value: String(profiles?.length ?? 0),
            detail: 'Cloud customer profiles visible to ops.',
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
          <OpsCallout
            tone="warning"
            title="Sensitive account actions are locked for this session."
            body={`Current assurance: ${accessProfile.sessionAssuranceLevel?.toUpperCase() ?? 'Unknown'}. Verify MFA in your own account before changing operator access, sending reset links, revoking relay credentials, or writing support notes.`}
            action={
              <Link to="/dashboard/account" className={opsButtonClassName({ tone: 'secondary' })}>
                Open account security
              </Link>
            }
          />
        ) : null}

        {message ? <OpsCallout tone="info" title="Operator update" body={message} /> : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(520px,1.22fr)]">
          <OpsPanel
            title="Account directory"
            description="Search, filter, and open the full operator workspace for a customer account."
            meta={isLoading ? 'Refreshing' : `${filteredProfiles.length} visible`}
          >
            <OpsToolbar className="mb-4">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="ops-accounts-search"
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.currentTarget.value)}
                  placeholder="Search by name, email, or user id"
                  className="h-10 w-full rounded-md border border-border bg-input pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-border-hover"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'operators', label: 'Operators' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'attention', label: 'Needs follow-up' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value as AccountFilter)}
                    className={opsButtonClassName({
                      tone: activeFilter === filter.value ? 'primary' : 'secondary',
                      className: 'min-h-8 px-3 py-1.5 text-xs',
                    })}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </OpsToolbar>

            <div className="mb-4 text-sm text-muted">
              {profileManagedMediaControlsDisabled
                ? 'Managed media is currently granted to every authenticated OmniLux Cloud account, so per-profile media toggles are paused.'
                : 'Managed media is controlled account by account, so per-profile media toggles are live.'}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((index) => (
                  <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
                ))}
              </div>
            ) : error ? (
              <OpsNotice
                title="Account directory unavailable"
                body={error instanceof Error ? error.message : 'Failed to load access profiles.'}
                tone="danger"
              />
            ) : filteredProfiles.length === 0 ? (
              <OpsEmptyState title="No accounts matched the current filters" body="Broaden the search terms or switch filters to see more profiles." />
            ) : (
              <OpsTable>
                <OpsTableHead>
                  <tr>
                    <OpsTableHeaderCell>Account</OpsTableHeaderCell>
                    <OpsTableHeaderCell>Role</OpsTableHeaderCell>
                    <OpsTableHeaderCell>Billing</OpsTableHeaderCell>
                    <OpsTableHeaderCell align="right">Last sign-in</OpsTableHeaderCell>
                  </tr>
                </OpsTableHead>
                <OpsTableBody>
                  {filteredProfiles.map((profile) => {
                    const selected = profile.id === selectedProfileId;

                    return (
                      <OpsTableRow
                        key={profile.id}
                        active={selected}
                        onClick={() => {
                          setMessage(null);
                          setSelectedProfileId(profile.id);
                        }}
                      >
                        <OpsTableCell>
                          <p className="font-medium text-foreground">{profile.displayName || profile.email || profile.id}</p>
                          <p className="mt-1 text-sm text-muted">{profile.email || profile.id}</p>
                        </OpsTableCell>
                        <OpsTableCell>
                          <div className="flex flex-wrap gap-2">
                            {profile.isOperator ? <OpsStatusBadge tone="warning">Operator</OpsStatusBadge> : null}
                            {profile.managedMediaEntitled ? <OpsStatusBadge tone="info">Media</OpsStatusBadge> : null}
                            {!profile.isOperator && !profile.managedMediaEntitled ? (
                              <OpsStatusBadge tone="neutral">Standard</OpsStatusBadge>
                            ) : null}
                          </div>
                        </OpsTableCell>
                        <OpsTableCell>
                          <OpsStatusBadge tone={subscriptionTone(profile.subscription?.status)}>
                            {profile.subscription
                              ? `${profile.subscription.tier} · ${profile.subscription.status}`
                              : 'No plan'}
                          </OpsStatusBadge>
                        </OpsTableCell>
                        <OpsTableCell align="right" className="text-muted">
                          {formatTimestamp(profile.lastSignInAt)}
                        </OpsTableCell>
                      </OpsTableRow>
                    );
                  })}
                </OpsTableBody>
              </OpsTable>
            )}
          </OpsPanel>

          <div className="space-y-4">
            {!selectedProfileId ? (
              <OpsEmptyState title="No account selected" body="Choose an account from the directory to open its operator workspace." />
            ) : isSupportProfileLoading ? (
              <OpsLoadingState label="Loading account detail" />
            ) : supportProfileError ? (
              <OpsNotice
                title="Account workspace unavailable"
                body={
                  supportProfileError instanceof Error
                    ? supportProfileError.message
                    : 'Failed to load account workspace.'
                }
                tone="danger"
              />
            ) : supportProfile ? (
              <>
                <OpsPanel
                  title={supportProfile.profile.displayName || supportProfile.profile.email || supportProfile.profile.id}
                  description={supportProfile.profile.email || supportProfile.profile.id}
                  meta="Opening an account records a sensitive operator audit event"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_320px]">
                    <div className="space-y-4">
                      <OpsKeyValueList
                        columns={4}
                        items={[
                          {
                            label: 'Managed media',
                            value: supportProfile.profile.managedMediaEntitled ? 'Enabled' : 'Disabled',
                            detail: `Override ${supportProfile.profile.managedMediaAccessOverride ? 'enabled' : 'disabled'}`,
                            tone: supportProfile.profile.managedMediaEntitled ? 'info' : 'neutral',
                          },
                          {
                            label: 'Account role',
                            value: supportProfile.profile.isOperator ? 'Operator account' : 'Standard account',
                            detail: `Updated ${formatTimestamp(supportProfile.profile.updatedAt)}`,
                            tone: supportProfile.profile.isOperator ? 'warning' : 'neutral',
                          },
                          {
                            label: 'Last sign-in',
                            value: formatTimestamp(supportProfile.profile.lastSignInAt),
                            detail: 'Latest observed authentication event.',
                          },
                          {
                            label: 'Created',
                            value: formatTimestamp(supportProfile.profile.createdAt),
                            detail: 'Cloud profile creation timestamp.',
                          },
                        ]}
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={operatorMutationsLocked || updateProfileAccess.isPending || profileManagedMediaControlsDisabled}
                          onClick={() => {
                            const nextValue = !supportProfile.profile.managedMediaEntitled;
                            requestConfirmation({
                              title: `${nextValue ? 'Enable' : 'Disable'} managed media`,
                              body: `Apply a direct managed-media access change for ${supportProfile.profile.email || supportProfile.profile.id}.`,
                              confirmLabel: nextValue ? 'Enable access' : 'Disable access',
                              onConfirm: () => {
                                setMessage(null);
                                updateProfileAccess.mutate({
                                  userId: supportProfile.profile.id,
                                  managedMediaEntitled: nextValue,
                                });
                              },
                            });
                          }}
                          className={opsButtonClassName({ tone: 'secondary' })}
                        >
                          {supportProfile.profile.managedMediaEntitled ? 'Disable' : 'Enable'} managed media
                        </button>

                        <button
                          type="button"
                          disabled={operatorMutationsLocked || updateProfileAccess.isPending}
                          onClick={() => {
                            const nextValue = !supportProfile.profile.isOperator;
                            requestConfirmation({
                              title: `${nextValue ? 'Grant' : 'Remove'} operator access`,
                              body: `Change operator privileges for ${supportProfile.profile.email || supportProfile.profile.id}.`,
                              confirmLabel: nextValue ? 'Grant access' : 'Remove access',
                              onConfirm: () => {
                                setMessage(null);
                                updateProfileAccess.mutate({
                                  userId: supportProfile.profile.id,
                                  isOperator: nextValue,
                                });
                              },
                            });
                          }}
                          className={opsButtonClassName({ tone: 'secondary' })}
                        >
                          {supportProfile.profile.isOperator ? 'Remove' : 'Grant'} operator access
                        </button>

                        <button
                          type="button"
                          disabled={operatorMutationsLocked || sendPasswordResetEmail.isPending}
                          onClick={() =>
                            requestConfirmation({
                              title: 'Send password reset',
                              body: `Deliver a password reset email to ${supportProfile.profile.email || supportProfile.profile.id}.`,
                              confirmLabel: 'Send reset',
                              onConfirm: () => {
                                setMessage(null);
                                sendPasswordResetEmail.mutate(supportProfile.profile.id);
                              },
                            })
                          }
                          className={opsButtonClassName({ tone: 'danger' })}
                        >
                          Send password reset
                        </button>
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-panel-muted px-4 py-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Billing posture</p>
                      {supportProfile.profile.subscription ? (
                        <div className="mt-3 space-y-3">
                          <OpsStatusBadge tone={subscriptionTone(supportProfile.profile.subscription.status)}>
                            {supportProfile.profile.subscription.tier} · {supportProfile.profile.subscription.status}
                          </OpsStatusBadge>
                          <OpsKeyValueList
                            columns={1}
                            items={[
                              {
                                label: 'Current period end',
                                value: formatTimestamp(supportProfile.profile.subscription.currentPeriodEnd),
                              },
                              {
                                label: 'Billing record updated',
                                value: formatTimestamp(supportProfile.profile.subscription.updatedAt),
                              },
                            ]}
                          />
                          <Link
                            to="/dashboard/financials"
                            className={opsButtonClassName({ tone: 'secondary' })}
                          >
                            Open financial lane
                          </Link>
                        </div>
                      ) : (
                        <>
                          <p className="mt-3 text-sm font-semibold text-foreground">No active subscription record</p>
                          <p className="mt-1 text-sm text-muted">
                            This account is not currently attached to a cloud billing record.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </OpsPanel>

                <div className="grid gap-4 xl:grid-cols-2">
                  <OpsPanel
                    title="Linked self-hosted servers"
                    description="Customer-owned runtimes linked to this cloud account."
                    meta={`${supportProfile.selfHostedServers.length} servers`}
                  >
                    {supportProfile.selfHostedServers.length === 0 ? (
                      <OpsEmptyState title="No linked servers" body="No self-hosted servers are linked to this account." />
                    ) : (
                      <OpsTable>
                        <OpsTableHead>
                          <tr>
                            <OpsTableHeaderCell>Server</OpsTableHeaderCell>
                            <OpsTableHeaderCell>Ownership</OpsTableHeaderCell>
                            <OpsTableHeaderCell>Relay</OpsTableHeaderCell>
                            <OpsTableHeaderCell align="right">Last seen</OpsTableHeaderCell>
                          </tr>
                        </OpsTableHead>
                        <OpsTableBody>
                          {supportProfile.selfHostedServers.map((server) => (
                            <OpsTableRow key={server.id}>
                              <OpsTableCell>
                                <p className="font-medium text-foreground">{server.name}</p>
                                <p className="mt-1 text-xs font-mono text-muted">{server.publicOrigin ?? 'No public origin'}</p>
                              </OpsTableCell>
                              <OpsTableCell className="text-muted">
                                {server.ownership === 'owner' ? 'Owner' : `Shared · ${server.accessRole}`}
                              </OpsTableCell>
                              <OpsTableCell>
                                <OpsStatusBadge tone={relayTone(server.relayStatus)}>{server.relayStatus ?? 'unknown'}</OpsStatusBadge>
                              </OpsTableCell>
                              <OpsTableCell align="right" className="text-muted">
                                {formatTimestamp(server.lastSeenAt)}
                              </OpsTableCell>
                            </OpsTableRow>
                          ))}
                        </OpsTableBody>
                      </OpsTable>
                    )}
                  </OpsPanel>

                  <OpsPanel
                    title="Recent relay sessions"
                    description="Remote-access sessions issued for this account."
                    meta={`${supportProfile.recentRelaySessions.length} sessions`}
                  >
                    {supportProfile.recentRelaySessions.length === 0 ? (
                      <OpsEmptyState title="No recent relay sessions" body="No recent relay sessions were issued for this account." />
                    ) : (
                      <OpsTable>
                        <OpsTableHead>
                          <tr>
                            <OpsTableHeaderCell>Server</OpsTableHeaderCell>
                            <OpsTableHeaderCell>Status</OpsTableHeaderCell>
                            <OpsTableHeaderCell>Issued</OpsTableHeaderCell>
                            <OpsTableHeaderCell align="right">Action</OpsTableHeaderCell>
                          </tr>
                        </OpsTableHead>
                        <OpsTableBody>
                          {supportProfile.recentRelaySessions.map((session) => (
                            <OpsTableRow key={session.id}>
                              <OpsTableCell>
                                <p className="font-medium text-foreground">{session.serverName}</p>
                                <p className="mt-1 text-sm text-muted">
                                  {session.sessionType} · expires {formatTimestamp(session.expiresAt)}
                                </p>
                              </OpsTableCell>
                              <OpsTableCell>
                                <OpsStatusBadge tone={relayTone(session.status)}>{session.status}</OpsStatusBadge>
                              </OpsTableCell>
                              <OpsTableCell className="text-muted">{formatTimestamp(session.issuedAt)}</OpsTableCell>
                              <OpsTableCell align="right">
                                {session.revocable ? (
                                  <button
                                    type="button"
                                    disabled={operatorMutationsLocked || revokeRelaySession.isPending}
                                    onClick={() =>
                                      requestConfirmation({
                                        title: 'Revoke relay session',
                                        body: `Revoke the active relay session for ${session.serverName}.`,
                                        confirmLabel: 'Revoke session',
                                        onConfirm: () => {
                                          setMessage(null);
                                          revokeRelaySession.mutate({
                                            sessionId: session.id,
                                            userId: supportProfile.profile.id,
                                          });
                                        },
                                      })
                                    }
                                    className={opsButtonClassName({ tone: 'danger', className: 'min-h-8 px-3 py-1.5 text-xs' })}
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <span className="text-xs uppercase tracking-[0.16em] text-muted">Locked</span>
                                )}
                              </OpsTableCell>
                            </OpsTableRow>
                          ))}
                        </OpsTableBody>
                      </OpsTable>
                    )}
                  </OpsPanel>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                  <OpsPanel
                    title="Active relay tokens"
                    description="Current relay credentials tied to this account’s servers."
                    meta={`${supportProfile.relayTokens.length} tokens`}
                  >
                    {supportProfile.relayTokens.length === 0 ? (
                      <OpsEmptyState title="No active relay tokens" body="No active relay tokens were found for this account’s servers." />
                    ) : (
                      <OpsTable>
                        <OpsTableHead>
                          <tr>
                            <OpsTableHeaderCell>Server</OpsTableHeaderCell>
                            <OpsTableHeaderCell>Token</OpsTableHeaderCell>
                            <OpsTableHeaderCell>Last used</OpsTableHeaderCell>
                            <OpsTableHeaderCell align="right">Action</OpsTableHeaderCell>
                          </tr>
                        </OpsTableHead>
                        <OpsTableBody>
                          {supportProfile.relayTokens.map((token) => (
                            <OpsTableRow key={token.tokenId}>
                              <OpsTableCell>
                                <p className="font-medium text-foreground">{token.serverName}</p>
                                <p className="mt-1 text-sm text-muted">
                                  {token.ownership === 'owner' ? 'Owner' : 'Shared'} · {token.issuedFor}
                                </p>
                              </OpsTableCell>
                              <OpsTableCell className="font-mono text-muted">
                                {token.tokenPrefix} · expires {formatTimestamp(token.expiresAt)}
                              </OpsTableCell>
                              <OpsTableCell className="text-muted">{formatTimestamp(token.lastUsedAt)}</OpsTableCell>
                              <OpsTableCell align="right">
                                {token.revocable ? (
                                  <button
                                    type="button"
                                    disabled={operatorMutationsLocked || revokeServerRelayToken.isPending}
                                    onClick={() =>
                                      requestConfirmation({
                                        title: 'Revoke relay token',
                                        body: `Revoke the active relay token for ${token.serverName}.`,
                                        confirmLabel: 'Revoke token',
                                        onConfirm: () => {
                                          setMessage(null);
                                          revokeServerRelayToken.mutate({
                                            tokenId: token.tokenId,
                                            userId: supportProfile.profile.id,
                                          });
                                        },
                                      })
                                    }
                                    className={opsButtonClassName({ tone: 'danger', className: 'min-h-8 px-3 py-1.5 text-xs' })}
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <span className="text-xs uppercase tracking-[0.16em] text-muted">Locked</span>
                                )}
                              </OpsTableCell>
                            </OpsTableRow>
                          ))}
                        </OpsTableBody>
                      </OpsTable>
                    )}
                  </OpsPanel>

                  <OpsPanel title="Support notes" description="Operator-only handoff notes, incident context, and next actions.">
                    <div className="space-y-3">
                      <textarea
                        rows={5}
                        value={supportNoteDraft}
                        onChange={(event) => setSupportNoteDraft(event.currentTarget.value)}
                        placeholder="Summarize the issue, the action taken, and what the next operator should know."
                        disabled={operatorMutationsLocked}
                        className="w-full rounded-md border border-border bg-input px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-border-hover"
                      />
                      <input
                        type="text"
                        value={supportNoteTagsDraft}
                        onChange={(event) => setSupportNoteTagsDraft(event.currentTarget.value)}
                        placeholder="Optional tags, comma separated (billing, relay, auth)"
                        disabled={operatorMutationsLocked}
                        className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-border-hover"
                      />
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <p className="text-sm text-muted">Tagged notes remain attached to this account’s operator history.</p>
                        <button
                          type="button"
                          disabled={operatorMutationsLocked || createSupportNote.isPending || supportNoteDraft.trim().length === 0}
                          onClick={() => {
                            const note = supportNoteDraft.trim();
                            if (!note) {
                              return;
                            }
                            setMessage(null);
                            createSupportNote.mutate({
                              userId: supportProfile.profile.id,
                              note,
                              tags: supportNoteTags,
                            });
                          }}
                          className={opsButtonClassName({ tone: 'primary' })}
                        >
                          Save note
                        </button>
                      </div>
                    </div>

                    <div className="mt-5">
                      {supportProfile.supportNotes.length === 0 ? (
                        <OpsEmptyState title="No support notes" body="No support notes have been recorded for this account yet." />
                      ) : (
                        <div className="space-y-3">
                          {supportProfile.supportNotes.map((note) => (
                            <div key={note.id} className="rounded-md border border-border bg-panel-muted px-4 py-4">
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                <p className="text-sm font-medium text-foreground">
                                  {renderProfileLabel(note.actor)} · {formatTimestamp(note.createdAt)}
                                </p>
                                {note.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {note.tags.map((tag) => (
                                      <OpsStatusBadge key={tag} tone="neutral">
                                        {tag}
                                      </OpsStatusBadge>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm leading-6 text-muted">{note.note}</p>
                              {note.server ? (
                                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">
                                  Server context {note.server.name}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </OpsPanel>
                </div>

                <OpsPanel
                  title="Recent access changes"
                  description="Account-specific entitlement and operator access changes."
                  meta={`${supportProfile.recentAccessChanges.length} events`}
                >
                  {supportProfile.recentAccessChanges.length === 0 ? (
                    <OpsEmptyState title="No access changes" body="No access changes have been recorded for this account." />
                  ) : (
                    <OpsTable>
                      <OpsTableHead>
                        <tr>
                          <OpsTableHeaderCell>Actor</OpsTableHeaderCell>
                          <OpsTableHeaderCell>Change</OpsTableHeaderCell>
                          <OpsTableHeaderCell align="right">When</OpsTableHeaderCell>
                        </tr>
                      </OpsTableHead>
                      <OpsTableBody>
                        {supportProfile.recentAccessChanges.map((row) => (
                          <OpsTableRow key={row.id}>
                            <OpsTableCell>{renderProfileLabel(row.actor)}</OpsTableCell>
                            <OpsTableCell className="text-muted">{renderAuditSummary(row)}</OpsTableCell>
                            <OpsTableCell align="right" className="text-muted">
                              {formatTimestamp(row.createdAt)}
                            </OpsTableCell>
                          </OpsTableRow>
                        ))}
                      </OpsTableBody>
                    </OpsTable>
                  )}
                </OpsPanel>
              </>
            ) : null}
          </div>
        </div>
      </OpsPageShell>

      <OpsConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title ?? ''}
        body={confirmation?.body ?? ''}
        confirmLabel={confirmation?.confirmLabel ?? 'Confirm'}
        confirmTone={confirmation?.confirmTone ?? 'danger'}
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          const next = confirmation;
          setConfirmation(null);
          next?.onConfirm();
        }}
      />
    </>
  );
};
