import { Link } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, RefreshCcw, Search, ShieldAlert, ShieldCheck, ShieldQuestion, Wrench } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { formatTimestamp, renderProfileLabel } from '@/surfaces/app/lib/ops-formatters';
import {
  RescueFailureClass,
  useOperatorAccessProfiles,
  useOperatorRescueProfile,
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

interface OpsRescueProps {
  initialLookup?: string;
}

const rescueTone = (failureClass: RescueFailureClass) => {
  switch (failureClass) {
    case 'authentication':
      return 'danger' as const;
    case 'billing':
      return 'warning' as const;
    case 'entitlement':
      return 'warning' as const;
    case 'linked-server':
      return 'warning' as const;
    case 'relay':
      return 'info' as const;
    case 'mixed-signals':
      return 'info' as const;
    default:
      return 'neutral' as const;
  }
};

const rescueTitle = (failureClass: RescueFailureClass) => {
  switch (failureClass) {
    case 'authentication':
      return 'Authentication / account context issue';
    case 'billing':
      return 'Billing mismatch';
    case 'entitlement':
      return 'Entitlement signal mismatch';
    case 'linked-server':
      return 'Linked-server posture issue';
    case 'relay':
      return 'Relay/session problem';
    case 'mixed-signals':
      return 'Mixed operational signals';
    default:
      return 'Unknown access state';
  }
};

const rescueIcon = {
  authentication: <ShieldAlert className="h-5 w-5" />,
  billing: <AlertTriangle className="h-5 w-5" />,
  entitlement: <ShieldQuestion className="h-5 w-5" />,
  'linked-server': <Wrench className="h-5 w-5" />,
  relay: <RefreshCcw className="h-5 w-5" />,
  'mixed-signals': <CheckCircle2 className="h-5 w-5" />,
  unknown: <AlertTriangle className="h-5 w-5" />,
};

const normalizeLookup = (value: string | undefined) => value?.trim().toLowerCase() ?? '';

export const OpsRescue = ({ initialLookup }: OpsRescueProps) => {
  const queryClient = useQueryClient();
  const {
    data: accessProfile,
    isLoading: isAccessProfileLoading,
    error: accessProfileError,
  } = useAccessProfile();
  const operatorEnabled = Boolean(accessProfile?.isOperator);
  const operatorMutationsLocked = accessProfile?.sessionAssuranceLevel !== 'aal2';
  const platformSettings = usePlatformSettings(operatorEnabled);

  const [searchValue, setSearchValue] = useState(initialLookup ?? '');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [supportNoteDraft, setSupportNoteDraft] = useState('');
  const [supportNoteTagsDraft, setSupportNoteTagsDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    confirmTone?: 'primary' | 'danger';
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    setSearchValue(initialLookup ?? '');
  }, [initialLookup]);

  const {
    data: profiles,
    error: profilesError,
    isLoading: isProfilesLoading,
  } = useOperatorAccessProfiles(operatorEnabled);

  const normalizedLookup = normalizeLookup(searchValue);
  const filteredProfiles = useMemo(() => {
    return [...(profiles ?? [])].filter((profile) => {
      if (!normalizedLookup) {
        return true;
      }
      const haystack = `${profile.id} ${profile.email ?? ''} ${profile.displayName ?? ''}`.toLowerCase();
      return haystack.includes(normalizedLookup);
    });
  }, [profiles, normalizedLookup]);

  useEffect(() => {
    if (filteredProfiles.length === 0) {
      setSelectedProfileId(null);
      return;
    }

    const exactByLookup =
      normalizedLookup.length > 0
        ? filteredProfiles.find((profile) =>
            [profile.id, profile.email ?? '', profile.displayName ?? ''].some((value) => value.toLowerCase() === normalizedLookup),
          )
        : null;

    setSelectedProfileId(exactByLookup?.id ?? filteredProfiles[0]?.id ?? null);
  }, [filteredProfiles, normalizedLookup]);

  const {
    data: rescueProfile,
    isLoading: isRescueProfileLoading,
    error: rescueProfileError,
  } = useOperatorRescueProfile(operatorEnabled, selectedProfileId);

  const createSupportNote = useMutation({
    mutationFn: async ({ userId, note, tags }: { userId: string; note: string; tags: string[] }) => {
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
        queryClient.invalidateQueries({ queryKey: ['operator-rescue-profile', variables.userId] }),
        queryClient.invalidateQueries({ queryKey: ['operator-support-profile', variables.userId] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
      ]);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to save support note.');
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
        queryClient.invalidateQueries({ queryKey: ['operator-rescue-profile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
      ]);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to send password reset email.');
    },
  });

  const revokeRelaySession = useMutation({
    mutationFn: async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
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
        queryClient.invalidateQueries({ queryKey: ['operator-rescue-profile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
      ]);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to revoke relay session.');
    },
  });

  const revokeServerRelayToken = useMutation({
    mutationFn: async ({ tokenId, userId }: { tokenId: string; userId: string }) => {
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
        queryClient.invalidateQueries({ queryKey: ['operator-rescue-profile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
      ]);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to revoke relay token.');
    },
  });

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

  if (isAccessProfileLoading) {
    return <OpsLoadingState label="Loading rescue console" />;
  }

  if (accessProfileError) {
    return (
      <OpsNotice
        title="Rescue workflow unavailable"
        body={accessProfileError instanceof Error ? accessProfileError.message : 'Failed to verify operator session.'}
        tone="danger"
      />
    );
  }

  if (!accessProfile?.isOperator) {
    return <OpsNotice title="Operator Access Required" body="This page is reserved for internal OmniLux operator accounts." />;
  }

  const profile = rescueProfile?.summary.account;

  const supportNoteTags = supportNoteTagsDraft
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <>
      <OpsPageShell
        eyebrow="Customer Rescue"
        title="One route to classify and safely resolve a customer access failure."
        description="Use this page as the primary support path for identity, entitlement, billing, linked-server, and relay issues."
        metrics={[
          {
            label: 'Profile selected',
            value: profile ? String(profile.id).slice(0, 8) : 'None',
            detail: profile ? renderProfileLabel({ displayName: profile.displayName, email: profile.email, userId: profile.id }) : 'Pick a customer below.',
          },
          {
            label: 'Last sign-in',
            value: formatTimestamp(profile?.lastSignInAt ?? null),
            detail: profile ? (profile.lastSignInAt ? 'Last known authentication' : 'No sign-in signal') : 'Unavailable',
          },
          {
            label: 'Entitled',
            value: profile ? (profile.managedMediaEntitled ? 'Yes' : 'No') : 'Unknown',
            detail: profile ? (profile.managedMediaAccessOverride ? 'Override active' : 'No override') : 'Unavailable',
          },
          {
            label: 'Linked servers',
            value: profile ? String(rescueProfile?.summary.selfHostedServers.length ?? 0) : '0',
            detail: profile ? `${rescueProfile?.summary.recentRelaySessions.length ?? 0} sessions tracked` : 'Unavailable',
          },
        ]}
      >
        {platformSettings.data?.managedMediaPolicy === 'all-authenticated-users' ? (
          <OpsCallout
            tone="info"
            title="Managed media policy is global"
            body="Managed media is granted to all authenticated users, so access failures are likely elsewhere in this flow."
          />
        ) : null}

        {operatorMutationsLocked ? (
          <OpsCallout
            tone="warning"
            title="Sensitive actions are temporarily locked"
            body={`Session assurance level ${accessProfile.sessionAssuranceLevel?.toUpperCase() ?? 'Unknown'} is below required controls.`}
          />
        ) : null}

        {message ? <OpsCallout tone="info" title="Operator update" body={message} /> : null}

        <OpsPanel title="Customer lookup" description="Start here with user id, email, or display name." className="mb-4">
          <OpsToolbar className="gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="ops-rescue-lookup"
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.currentTarget.value)}
                placeholder="Search by name, email, or user id"
                className="h-10 w-full rounded-md border border-border bg-input pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-border-hover"
              />
            </div>
          </OpsToolbar>
        </OpsPanel>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(520px,1.22fr)]">
          <OpsPanel
            title="Customer directory"
            description="Select one customer, then compare inspect and action surfaces in the rescue lane."
            meta={isProfilesLoading ? 'Loading profiles' : `${filteredProfiles.length} match`}
          >
            {profilesError ? (
              <OpsNotice
                title="Customer directory unavailable"
                body={profilesError instanceof Error ? profilesError.message : 'Failed to load profiles.'}
                tone="danger"
              />
            ) : isProfilesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((row) => (
                  <div key={row} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
                ))}
              </div>
            ) : filteredProfiles.length === 0 ? (
              <OpsEmptyState title="No matching customers" body="Try a broader query with email fragments or user id." />
            ) : (
              <OpsTable>
                <OpsTableHead>
                  <tr>
                    <OpsTableHeaderCell>Account</OpsTableHeaderCell>
                    <OpsTableHeaderCell>Access</OpsTableHeaderCell>
                    <OpsTableHeaderCell>Billing</OpsTableHeaderCell>
                    <OpsTableHeaderCell align="right">Open</OpsTableHeaderCell>
                  </tr>
                </OpsTableHead>
                <OpsTableBody>
                  {filteredProfiles.map((lookupProfile) => {
                    const selected = lookupProfile.id === selectedProfileId;
                    const planStatus = lookupProfile.subscription?.status?.toLowerCase() ?? 'No plan';
                    return (
                      <OpsTableRow
                        key={lookupProfile.id}
                        active={selected}
                        onClick={() => {
                          setMessage(null);
                          setSelectedProfileId(lookupProfile.id);
                        }}
                      >
                        <OpsTableCell>
                          <p className="font-medium text-foreground">{renderProfileLabel({ displayName: lookupProfile.displayName, email: lookupProfile.email, userId: lookupProfile.id })}</p>
                          <p className="mt-1 text-sm text-muted">{lookupProfile.id}</p>
                        </OpsTableCell>
                        <OpsTableCell>
                          <OpsStatusBadge tone={lookupProfile.managedMediaEntitled ? 'success' : 'warning'}>
                            {lookupProfile.managedMediaEntitled ? 'Entitled' : 'Not entitled'}
                          </OpsStatusBadge>
                        </OpsTableCell>
                        <OpsTableCell>
                          <OpsStatusBadge tone={planStatus === 'active' || planStatus === 'trialing' ? 'success' : 'warning'}>
                            {lookupProfile.subscription ? `${lookupProfile.subscription.tier} · ${lookupProfile.subscription.status}` : 'No plan'}
                          </OpsStatusBadge>
                        </OpsTableCell>
                        <OpsTableCell align="right">
                          <Link
                            to="/dashboard/rescue"
                            search={{ lookup: lookupProfile.email ?? lookupProfile.id } as never}
                            className="text-xs font-medium uppercase tracking-[0.16em] text-info hover:text-foreground"
                          >
                            Deep-link
                          </Link>
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
              <OpsEmptyState title="Select a customer" body="Choose a customer from the left column to load rescue context." />
            ) : isRescueProfileLoading ? (
              <OpsLoadingState label="Loading rescue context" />
            ) : rescueProfileError ? (
              <OpsNotice
                title="Rescue data unavailable"
                body={rescueProfileError instanceof Error ? rescueProfileError.message : 'Could not load rescue context.'}
                tone="danger"
              />
            ) : !rescueProfile ? (
              <OpsEmptyState title="Customer context incomplete" body="No rescue payload returned. Open a different customer." />
            ) : (
              <>
                <OpsPanel title="Inspect: failure classification" description="High-signal diagnosis to guide next actions.">
                  <div className="rounded-lg border border-border bg-panel-muted p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-warning">{rescueIcon[rescueProfile.failureClass]}</span>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
                          {rescueTitle(rescueProfile.failureClass)}
                        </p>
                        <p className="mt-1 text-sm text-muted">{rescueProfile.failureReason}</p>
                        <div className="mt-2 rounded-md border border-border bg-black/20 p-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted">Recommended next action</p>
                          <p className="mt-1 text-sm text-foreground">{rescueProfile.nextSafeAction}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </OpsPanel>

                <div className="grid gap-4 xl:grid-cols-2">
                  <OpsPanel title="Inspect: account and entitlement" description="Identity and entitlements at a glance." >
                    <OpsKeyValueList
                      items={[
                        { label: 'Profile', value: profile ? renderProfileLabel({ displayName: profile.displayName, email: profile.email, userId: profile.id }) : 'Unavailable' },
                        { label: 'Managed media entitlement', value: rescueProfile.entitlement.managedMediaEntitled ? 'Enabled' : 'Disabled' },
                        { label: 'Override active', value: rescueProfile.entitlement.managedMediaAccessOverride ? 'Yes' : 'No' },
                        { label: 'Subscription', value: rescueProfile.billing.tier ?? 'Missing' },
                        { label: 'Subscription status', value: rescueProfile.billing.status ?? 'Missing' },
                        { label: 'Current period end', value: formatTimestamp(rescueProfile.billing.currentPeriodEnd) },
                      ]}
                    />
                  </OpsPanel>

                  <OpsPanel title="Inspect: relay & linked servers" description="Server linkage and relay safety surface." >
                    <div className="space-y-2">
                      <OpsKeyValueList
                        items={[
                          { label: 'Has linked server', value: rescueProfile.relay.hasLinkedServer ? 'Yes' : 'No' },
                          { label: 'Online servers', value: String(rescueProfile.relay.onlineServers) },
                          { label: 'Stale server sessions', value: String(rescueProfile.relay.staleServers) },
                          { label: 'Active relay sessions', value: String(rescueProfile.relay.recentSessionCount) },
                          { label: 'Revocable session', value: rescueProfile.relay.hasRevocableSession ? 'Available' : 'No' },
                          { label: 'Revocable token', value: rescueProfile.relay.hasRevocableToken ? 'Available' : 'No' },
                        ]}
                      />
                      {rescueProfile.summary.selfHostedServers.length === 0 ? (
                        <OpsEmptyState title="No linked server" body="No self-hosted servers are attached to this account." />
                      ) : (
                        <div className="space-y-2">
                          {rescueProfile.summary.selfHostedServers.map((server) => (
                            <div key={server.id} className="rounded-md border border-border bg-black/20 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-foreground">{server.name || server.id}</p>
                                <OpsStatusBadge tone={server.relayStatus?.toLowerCase().includes('online') ? 'success' : 'warning'}>
                                  {server.relayStatus ?? 'Unknown'}
                                </OpsStatusBadge>
                              </div>
                              <p className="mt-1 text-xs text-muted">{server.publicOrigin ?? 'No public origin'}</p>
                              <p className="mt-1 text-xs text-muted">Last seen {formatTimestamp(server.lastSeenAt)}</p>
                              <a
                                href={`/dashboard/servers/${server.id}`}
                                className="mt-2 inline-block text-xs uppercase tracking-[0.16em] text-info hover:text-foreground"
                              >
                                Open server
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </OpsPanel>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <OpsPanel title="Inspect: support notes" description="Recent context for this rescue case.">
                    {rescueProfile.summary.supportNotes.length === 0 ? (
                      <OpsEmptyState title="No support notes" body="No notes are attached yet." />
                    ) : (
                      <div className="space-y-3">
                        {rescueProfile.summary.supportNotes.slice(0, 4).map((note) => (
                          <div key={note.id} className="rounded-lg border border-border bg-black/20 px-3 py-2">
                            <p className="text-sm text-muted">{note.note}</p>
                            <p className="mt-1 text-xs text-muted">{formatTimestamp(note.createdAt)}</p>
                            <p className="mt-1 text-xs text-muted">Tags: {note.tags.join(', ') || 'none'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </OpsPanel>

                  <OpsPanel title="Inspect: case and deep-links" description="Context and specialist surfaces for deeper triage.">
                    <div className="space-y-2">
                      <div className="space-x-2">
                        <Link
                          to="/dashboard/accounts"
                          search={{ lookup: profile?.email ?? profile?.id } as never}
                          className="text-xs font-medium uppercase tracking-[0.16em] text-info hover:text-foreground"
                        >
                          Open account workspace
                        </Link>
                        <Link
                          to="/dashboard/financials"
                          search={{ lookup: profile?.email ?? profile?.id } as never}
                          className="text-xs font-medium uppercase tracking-[0.16em] text-info hover:text-foreground"
                        >
                          Open financials
                        </Link>
                        <a
                          href="/dashboard/logs"
                          className="text-xs font-medium uppercase tracking-[0.16em] text-info hover:text-foreground"
                        >
                          Open logs
                        </a>
                        <a
                          href="/dashboard/health"
                          className="text-xs font-medium uppercase tracking-[0.16em] text-info hover:text-foreground"
                        >
                          Open health
                        </a>
                      </div>
                      <OpsStatusBadge tone={rescueTone(rescueProfile.failureClass)}>{rescueProfile.caseContext ? 'Case linked' : 'No linked case'}</OpsStatusBadge>
                      {rescueProfile.caseContext ? (
                        <OpsKeyValueList
                          items={[
                          { label: 'Case status', value: rescueProfile.caseContext.status ?? 'Unknown' },
                          { label: 'Owner', value: rescueProfile.caseContext.ownerId ?? 'Unassigned' },
                          { label: 'Channel', value: rescueProfile.caseContext.channel ?? 'Unknown' },
                          ]}
                        />
                      ) : null}
                    </div>
                  </OpsPanel>
                </div>

                <OpsPanel title="Mutate: safe operator actions" description="High-signal actions separated from read-only context.">
                  <div className="space-y-3">
                    <OpsStatusBadge tone="warning">Identity recovery actions</OpsStatusBadge>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={operatorMutationsLocked}
                        className={opsButtonClassName({
                          tone: 'secondary',
                          className: 'rounded-md px-3 py-2 text-sm',
                        })}
                        onClick={() => {
                          if (!selectedProfileId) return;
                          requestConfirmation({
                            title: 'Send password reset',
                            body: 'Email a fresh password reset link to this customer.',
                            confirmTone: 'primary',
                            confirmLabel: 'Send reset',
                            onConfirm: () => sendPasswordResetEmail.mutate(selectedProfileId),
                          });
                        }}
                      >
                        Send password reset
                      </button>
                      {rescueProfile.summary.recentRelaySessions
                        .filter((session) => session.revocable)
                        .slice(0, 1)
                        .map((session) => (
                          <button
                            key={session.id}
                            type="button"
                            disabled={operatorMutationsLocked}
                            className={opsButtonClassName({
                              tone: 'danger',
                              className: 'rounded-md px-3 py-2 text-sm',
                            })}
                            onClick={() => {
                              requestConfirmation({
                                title: 'Revoke relay session',
                                body: 'Revoking this relay session will force a fresh handshake.',
                                confirmTone: 'danger',
                                confirmLabel: 'Revoke session',
                                onConfirm: () =>
                                  revokeRelaySession.mutate({
                                    sessionId: session.id,
                                    userId: selectedProfileId,
                                  }),
                              });
                            }}
                          >
                            Revoke most recent relay session
                          </button>
                        ))}
                      {rescueProfile.summary.relayTokens
                        .filter((token) => token.revocable)
                        .slice(0, 1)
                        .map((token) => (
                          <button
                            key={token.tokenId}
                            type="button"
                            disabled={operatorMutationsLocked}
                            className={opsButtonClassName({
                              tone: 'danger',
                              className: 'rounded-md px-3 py-2 text-sm',
                            })}
                            onClick={() => {
                              requestConfirmation({
                                title: 'Revoke relay token',
                                body: 'Revoking this token prevents stale devices from reconnecting.',
                                confirmTone: 'danger',
                                confirmLabel: 'Revoke token',
                                onConfirm: () =>
                                  revokeServerRelayToken.mutate({
                                    tokenId: token.tokenId,
                                    userId: selectedProfileId,
                                  }),
                              });
                            }}
                          >
                            Revoke token {token.tokenPrefix}
                          </button>
                        ))}
                    </div>

                    <div className="rounded-md border border-border bg-black/20 p-3">
                      <p className="text-sm font-medium text-foreground">Support note</p>
                      <textarea
                        value={supportNoteDraft}
                        onChange={(event) => setSupportNoteDraft(event.currentTarget.value)}
                        placeholder="Summarize what was verified and what still needs work."
                        className="mt-2 h-24 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
                      />
                      <input
                        value={supportNoteTagsDraft}
                        onChange={(event) => setSupportNoteTagsDraft(event.currentTarget.value)}
                        placeholder="Tags, comma-separated"
                        className="mt-2 h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground outline-none placeholder:text-muted"
                      />
                      <div className="mt-2">
                        <button
                          type="button"
                          disabled={operatorMutationsLocked || supportNoteDraft.length < 4 || !selectedProfileId}
                          onClick={() => {
                            if (!selectedProfileId) return;
                            requestConfirmation({
                              title: 'Add support note',
                              body: 'This note will be added to the customer support log.',
                              confirmTone: 'primary',
                              confirmLabel: 'Save note',
                              onConfirm: () =>
                                createSupportNote.mutate({
                                  userId: selectedProfileId,
                                  note: supportNoteDraft,
                                  tags: supportNoteTags,
                                }),
                            });
                          }}
                          className={opsButtonClassName({
                            tone: 'secondary',
                            className: 'rounded-md px-3 py-2 text-sm',
                          })}
                        >
                          Save support note
                        </button>
                      </div>
                    </div>
                  </div>
                </OpsPanel>
              </>
            )}
          </div>
        </div>
      </OpsPageShell>

      {confirmation ? (
        <OpsConfirmDialog
          open={Boolean(confirmation)}
          title={confirmation.title}
          body={confirmation.body}
          confirmLabel={confirmation.confirmLabel}
          confirmTone={confirmation.confirmTone}
          onClose={() => setConfirmation(null)}
          onConfirm={() => {
            confirmation.onConfirm();
            setConfirmation(null);
          }}
        />
      ) : null}
    </>
  );
};
