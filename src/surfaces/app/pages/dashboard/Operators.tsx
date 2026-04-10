import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LifeBuoy, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { buildDocsHref } from '@/lib/site-surface';
import { supabase } from '@/lib/supabase';
import { useAccessProfile, type AccessProfile } from '@/surfaces/app/lib/access-profile';
import {
  useOperatorActionAuditLog,
  useOperatorSupportProfile,
  useOpsServiceHealth,
  usePlatformSettings,
  usePlatformSettingsAuditLog,
  type AccessAuditRow,
  type ManagedMediaOperatingMode,
  type ManagedMediaPolicy,
  type OperatorActionAuditRow,
  type PlatformSettingsAuditRow,
  type RelayAccessPolicy,
} from '@/surfaces/app/lib/ops';

interface AccessProfileRow extends AccessProfile {}

const managedMediaPolicyCopy: Record<ManagedMediaPolicy, { label: string; description: string }> = {
  'all-authenticated-users': {
    label: 'All OmniLux Cloud accounts',
    description: 'Every signed-in OmniLux Cloud account, including free accounts, can access first-party managed media.',
  },
  'explicit-per-profile': {
    label: 'Explicit per-profile access',
    description: 'Managed media access is controlled account by account through the operator console.',
  },
};

const relayAccessPolicyCopy: Record<RelayAccessPolicy, { label: string; description: string }> = {
  'all-authenticated-users': {
    label: 'All OmniLux Cloud accounts',
    description: 'Remote relay access to self-hosted servers is available to any authenticated cloud account with server access.',
  },
  'paid-subscription': {
    label: 'Paid subscription required',
    description: 'Remote relay access to self-hosted servers requires the server owner to have an active or trialing paid cloud plan.',
  },
};

const renderProfileLabel = (profile: { displayName: string | null; email: string | null; userId: string | null }) =>
  profile.displayName || profile.email || profile.userId || 'Unknown account';

const formatTimestamp = (value: string | null) => (value ? new Date(value).toLocaleString() : 'Not available');

const renderAuditSummary = (row: AccessAuditRow) => {
  const changes: string[] = [];

  if (row.managedMediaEntitledBefore !== row.managedMediaEntitledAfter) {
    changes.push(row.managedMediaEntitledAfter ? 'managed media enabled' : 'managed media disabled');
  }

  if (row.isOperatorBefore !== row.isOperatorAfter) {
    changes.push(row.isOperatorAfter ? 'operator enabled' : 'operator disabled');
  }

  return changes.length > 0 ? changes.join(' · ') : 'No access change details recorded';
};

const renderPolicySummary = (row: PlatformSettingsAuditRow) =>
  [
    row.managedMediaPolicyBefore !== row.managedMediaPolicyAfter
      ? `Managed media: ${managedMediaPolicyCopy[row.managedMediaPolicyAfter ?? 'all-authenticated-users'].label}`
      : null,
    row.relayAccessPolicyBefore !== row.relayAccessPolicyAfter
      ? `Relay: ${relayAccessPolicyCopy[row.relayAccessPolicyAfter ?? 'paid-subscription'].label}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'No policy change details recorded';

const renderOperatorActionSummary = (row: OperatorActionAuditRow) => {
  switch (row.actionType) {
    case 'profile_lookup':
      return `Opened support view for ${renderProfileLabel(row.target ?? { userId: null, email: null, displayName: null })}`;
    case 'update_profile_access':
      return `Updated access controls for ${renderProfileLabel(row.target ?? { userId: null, email: null, displayName: null })}`;
    case 'update_managed_media_policy':
      return 'Updated the managed media platform policy';
    case 'update_managed_media_operations':
      return 'Updated managed media operating state';
    case 'update_relay_access_policy':
      return 'Updated the self-hosted relay access policy';
    case 'send_password_reset_email':
      return `Sent a password reset email to ${renderProfileLabel(row.target ?? { userId: null, email: null, displayName: null })}`;
    case 'create_support_note':
      return `Saved a support note for ${renderProfileLabel(row.target ?? { userId: null, email: null, displayName: null })}`;
    case 'revoke_relay_session':
      return `Revoked a relay session for ${renderProfileLabel(row.target ?? { userId: null, email: null, displayName: null })}`;
    case 'revoke_server_relay_token':
      return `Revoked a relay token for ${row.server?.name ?? 'a self-hosted server'}`;
    default:
      return row.actionType.replaceAll('_', ' ');
  }
};

const renderOperatorActionDetail = (row: OperatorActionAuditRow) => {
  if (row.actionType === 'profile_lookup') {
    const selfHostedServers = typeof row.metadata.selfHostedServers === 'number' ? row.metadata.selfHostedServers : null;
    const relaySessions = typeof row.metadata.relaySessions === 'number' ? row.metadata.relaySessions : null;
    return [selfHostedServers !== null ? `${selfHostedServers} self-hosted servers` : null, relaySessions !== null ? `${relaySessions} recent relay sessions` : null]
      .filter(Boolean)
      .join(' · ');
  }

  if (row.actionType === 'update_profile_access') {
    const changedFields = Array.isArray(row.metadata.changedFields)
      ? row.metadata.changedFields.map((value) => String(value).replaceAll('_', ' '))
      : [];
    return changedFields.length > 0 ? changedFields.join(' · ') : 'Access controls changed';
  }

  if (row.actionType === 'update_managed_media_policy') {
    const nextPolicy = typeof row.metadata.managedMediaPolicyAfter === 'string'
      ? row.metadata.managedMediaPolicyAfter
      : null;
    return nextPolicy ? managedMediaPolicyCopy[nextPolicy as ManagedMediaPolicy]?.description ?? nextPolicy : 'Platform policy changed';
  }

  if (row.actionType === 'update_relay_access_policy') {
    const nextPolicy =
      typeof row.metadata.relayAccessPolicyAfter === 'string'
        ? row.metadata.relayAccessPolicyAfter
        : null;
    return nextPolicy
      ? relayAccessPolicyCopy[nextPolicy as RelayAccessPolicy]?.description ?? nextPolicy
      : 'Relay access policy changed';
  }

  if (row.actionType === 'update_managed_media_operations') {
    const nextMode = typeof row.metadata.managedMediaOperatingModeAfter === 'string'
      ? row.metadata.managedMediaOperatingModeAfter
      : null;
    const nextMessage = typeof row.metadata.managedMediaIncidentMessageAfter === 'string'
      ? row.metadata.managedMediaIncidentMessageAfter
      : '';
    return [nextMode ? `Mode: ${nextMode.replaceAll('-', ' ')}` : null, nextMessage || null].filter(Boolean).join(' · ');
  }

  if (row.actionType === 'send_password_reset_email') {
    return typeof row.metadata.email === 'string' ? `Reset email sent to ${row.metadata.email}` : 'Password reset email sent';
  }

  if (row.actionType === 'create_support_note') {
    const preview = typeof row.metadata.notePreview === 'string' ? row.metadata.notePreview : null;
    return preview ? preview : 'Support note created';
  }

  if (row.actionType === 'revoke_relay_session') {
    return typeof row.metadata.sessionId === 'string' ? `Session ${row.metadata.sessionId} revoked` : 'Relay session revoked';
  }

  if (row.actionType === 'revoke_server_relay_token') {
    return typeof row.metadata.tokenId === 'string' ? `Token ${row.metadata.tokenId} revoked` : 'Relay token revoked';
  }

  return row.server?.name ? `Target server: ${row.server.name}` : 'Sensitive operator action';
};

export const Operators = () => {
  const queryClient = useQueryClient();
  const { data: accessProfile, isLoading: isAccessProfileLoading, error: accessProfileError } = useAccessProfile();
  const [message, setMessage] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [managedMediaOperatingModeDraft, setManagedMediaOperatingModeDraft] = useState<ManagedMediaOperatingMode>('normal');
  const [managedMediaIncidentMessageDraft, setManagedMediaIncidentMessageDraft] = useState('');
  const [supportNoteDraft, setSupportNoteDraft] = useState('');
  const [supportNoteTagsDraft, setSupportNoteTagsDraft] = useState('');
  const deferredSearchValue = useDeferredValue(searchValue);

  const {
    data: profiles,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['operator-access-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<AccessProfileRow[]>('list-access-profiles');
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: Boolean(accessProfile?.isOperator),
  });

  const {
    data: auditLog,
    error: auditError,
    isLoading: isAuditLoading,
  } = useQuery({
    queryKey: ['operator-access-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<AccessAuditRow[]>('list-access-audit-log');
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: Boolean(accessProfile?.isOperator),
  });

  const {
    data: platformSettings,
    error: platformSettingsError,
    isLoading: isPlatformSettingsLoading,
  } = usePlatformSettings(Boolean(accessProfile?.isOperator));

  const {
    data: operatorActionAuditLog,
    error: operatorActionAuditError,
    isLoading: isOperatorActionAuditLoading,
  } = useOperatorActionAuditLog(Boolean(accessProfile?.isOperator));

  const {
    data: supportProfile,
    error: supportProfileError,
    isLoading: isSupportProfileLoading,
  } = useOperatorSupportProfile(Boolean(accessProfile?.isOperator), selectedProfileId);

  const {
    data: opsServiceHealth,
    error: opsServiceHealthError,
    isLoading: isOpsServiceHealthLoading,
  } = useOpsServiceHealth(Boolean(accessProfile?.isOperator));

  const {
    data: policyAuditLog,
    error: policyAuditError,
    isLoading: isPolicyAuditLoading,
  } = usePlatformSettingsAuditLog(Boolean(accessProfile?.isOperator));

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
      const { data, error } = await supabase.functions.invoke<AccessProfileRow>('update-profile-access', {
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
      return data as AccessProfileRow;
    },
    onSuccess: async (_, variables) => {
      setMessage('Access settings updated.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operator-access-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['operator-access-audit-log'] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
        queryClient.invalidateQueries({ queryKey: ['access-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['operator-support-profile', variables.userId] }),
      ]);

      if (variables.userId === accessProfile?.id && variables.isOperator === false) {
        setMessage('Your operator access was removed. Refreshing profile state.');
      }
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to update profile access.');
    },
  });

  const updatePlatformSettings = useMutation({
    mutationFn: async ({
      managedMediaPolicy,
      relayAccessPolicy,
      managedMediaOperatingMode,
      managedMediaIncidentMessage,
    }: {
      managedMediaPolicy?: ManagedMediaPolicy;
      relayAccessPolicy?: RelayAccessPolicy;
      managedMediaOperatingMode?: ManagedMediaOperatingMode;
      managedMediaIncidentMessage?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('update-platform-settings', {
        body: {
          managedMediaPolicy,
          relayAccessPolicy,
          managedMediaOperatingMode,
          managedMediaIncidentMessage,
          source: 'operator-dashboard',
        },
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: async () => {
      setMessage('Platform policy updated.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['platform-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['platform-settings-audit-log'] }),
        queryClient.invalidateQueries({ queryKey: ['operator-action-audit-log'] }),
        queryClient.invalidateQueries({ queryKey: ['ops-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['access-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['operator-access-profiles'] }),
      ]);
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to update platform policy.');
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
      const { data, error } = await supabase.functions.invoke<{ sent: boolean; email: string }>(
        'send-password-reset-email',
        {
          body: {
            userId,
            source: 'operator-dashboard',
          },
        },
      );
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

  useEffect(() => {
    if (!platformSettings) {
      return;
    }
    setManagedMediaOperatingModeDraft(platformSettings.managedMediaOperatingMode);
    setManagedMediaIncidentMessageDraft(platformSettings.managedMediaIncidentMessage ?? '');
  }, [
    platformSettings?.managedMediaIncidentMessage,
    platformSettings?.managedMediaOperatingMode,
    platformSettings,
  ]);

  const sortedProfiles = useMemo(
    () =>
      [...(profiles ?? [])].sort((a, b) => {
        if (a.isOperator !== b.isOperator) {
          return a.isOperator ? -1 : 1;
        }
        return (a.email ?? '').localeCompare(b.email ?? '');
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
  const operatorCount = useMemo(
    () => (profiles ?? []).filter((profile) => profile.isOperator).length,
    [profiles],
  );
  const explicitlyEntitledCount = useMemo(
    () => (profiles ?? []).filter((profile) => profile.managedMediaEntitled).length,
    [profiles],
  );
  const managedMediaPolicy = platformSettings?.managedMediaPolicy ?? 'all-authenticated-users';
  const relayAccessPolicy = platformSettings?.relayAccessPolicy ?? 'paid-subscription';
  const incidentStateDirty =
    managedMediaOperatingModeDraft !== (platformSettings?.managedMediaOperatingMode ?? 'normal') ||
    managedMediaIncidentMessageDraft !== (platformSettings?.managedMediaIncidentMessage ?? '');
  const supportNoteTags = supportNoteTagsDraft
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const profileManagedMediaControlsDisabled = managedMediaPolicy === 'all-authenticated-users';
  const operatorMutationsLocked = accessProfile?.sessionAssuranceLevel !== 'aal2';

  if (isAccessProfileLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
      </div>
    );
  }

  if (accessProfileError) {
    return (
      <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-danger/30 bg-danger/10 p-6 text-sm text-foreground">
          {accessProfileError instanceof Error ? accessProfileError.message : 'Failed to load access profile.'}
        </div>
      </div>
    );
  }

  if (!accessProfile?.isOperator) {
    return (
      <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-warning/30 bg-warning/10 p-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Operator Access Required</h1>
          <p className="mt-2 text-sm text-foreground">
            This page manages managed-media entitlement and OmniLux Ops console access. Standard cloud accounts cannot access it.
          </p>
        </div>
      </div>
    );
  }

  const operatorSessionAssuranceLevel = accessProfile.sessionAssuranceLevel;

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-accent" />
            <h1 className="font-display text-2xl font-bold text-foreground">Operator Access</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Manage which cloud accounts can see first-party OmniLux media and which accounts can access the
            hosted `ops.omnilux.tv` console plus access-management tooling. This is also where OmniLux defines the
            live policy for self-hosted relay access.
          </p>
        </div>

        {operatorMutationsLocked ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
            <p className="font-semibold text-foreground">Sensitive changes are locked for this session.</p>
            <p className="mt-2">
              Current assurance: {operatorSessionAssuranceLevel?.toUpperCase() ?? 'Unknown'}. Open your account settings, verify MFA, and come back before
              changing operator access, relay policy, support notes, or live platform controls.
            </p>
            <Link
              to="/dashboard/account"
              className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Open Account Security
            </Link>
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm text-foreground">
            {message}
          </div>
        ) : null}

        <div className="rounded-xl surface-soft p-6">
          <div className="grid gap-4 text-sm text-muted sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">Managed Media</p>
              <p className="mt-2">Explicit per-profile entitlement for `media.omnilux.tv` and other managed media surfaces.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">Operator</p>
              <p className="mt-2">Controls visibility to `ops.omnilux.tv` and access-management endpoints.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">Safety</p>
              <p className="mt-2">The last remaining operator account cannot be demoted through this interface.</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-6">
          <h2 className="font-display text-xl font-semibold text-foreground">Runbooks & contracts</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Keep the hosted product promise, operator drill, and client handoff documented in one place so policy
            changes do not drift away from the customer and support experience.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={buildDocsHref('/guide/operator-runbook')}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Operator runbook
            </a>
            <a
              href={buildDocsHref('/guide/cloud-product-contract')}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Product contract
            </a>
            <a
              href={buildDocsHref('/guide/client-readiness')}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Client readiness
            </a>
          </div>
        </div>

        {isPlatformSettingsLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-surface" />
        ) : platformSettingsError ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-6 text-sm text-foreground">
            {platformSettingsError instanceof Error ? platformSettingsError.message : 'Failed to load platform settings.'}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-background p-6">
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="h-5 w-5 text-accent" />
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">Managed Media Policy</h2>
                <p className="mt-1 text-sm text-muted">
                  Decide whether managed media is granted to every authenticated cloud user or controlled account by account.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {(['all-authenticated-users', 'explicit-per-profile'] as const).map((policy) => {
                const copy = managedMediaPolicyCopy[policy];
                const selected = managedMediaPolicy === policy;

                return (
                  <button
                    key={policy}
                    type="button"
                    disabled={updatePlatformSettings.isPending || operatorMutationsLocked}
                    onClick={() => {
                      if (policy === managedMediaPolicy) {
                        return;
                      }
                      if (!window.confirm(`Switch managed media policy to "${copy.label}"?`)) {
                        return;
                      }
                      setMessage(null);
                      updatePlatformSettings.mutate({ managedMediaPolicy: policy });
                    }}
                    className={`rounded-xl border p-5 text-left transition-colors ${
                      selected
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-surface/40 hover:bg-surface'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Policy</p>
                    <h3 className="mt-2 font-semibold text-foreground">{copy.label}</h3>
                    <p className="mt-2 text-sm text-muted">{copy.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Self-Hosted Relay Policy</p>
              <p className="mt-2 text-sm text-muted">
                Decide whether OmniLux relay access to self-hosted servers is included for any authenticated cloud
                account or limited to active and trialing paid subscriptions.
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {(['all-authenticated-users', 'paid-subscription'] as const).map((policy) => {
                  const copy = relayAccessPolicyCopy[policy];
                  const selected = relayAccessPolicy === policy;

                  return (
                    <button
                      key={policy}
                      type="button"
                      disabled={updatePlatformSettings.isPending || operatorMutationsLocked}
                      onClick={() => {
                        if (policy === relayAccessPolicy) {
                          return;
                        }
                        if (!window.confirm(`Switch relay access policy to "${copy.label}"?`)) {
                          return;
                        }
                        setMessage(null);
                        updatePlatformSettings.mutate({ relayAccessPolicy: policy });
                      }}
                      className={`rounded-xl border p-5 text-left transition-colors ${
                        selected
                          ? 'border-accent bg-accent/10'
                          : 'border-border bg-surface/40 hover:bg-surface'
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Policy</p>
                      <h3 className="mt-2 font-semibold text-foreground">{copy.label}</h3>
                      <p className="mt-2 text-sm text-muted">{copy.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-surface/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Profiles</p>
                <p className="mt-2 font-display text-2xl font-bold text-foreground">{profiles?.length ?? 0}</p>
              </div>
              <div className="rounded-lg bg-surface/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Operators</p>
                <p className="mt-2 font-display text-2xl font-bold text-foreground">{operatorCount}</p>
              </div>
              <div className="rounded-lg bg-surface/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Explicit Overrides</p>
                <p className="mt-2 font-display text-2xl font-bold text-foreground">{explicitlyEntitledCount}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-surface/40 p-5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Managed Media Operations</h3>
                  <p className="mt-1 text-sm text-muted">
                    Set the live operating state for `media.omnilux.tv` and publish an operator-facing incident message.
                  </p>
                </div>
                <div className="text-xs uppercase tracking-wide text-muted">
                  Current: {platformSettings?.managedMediaOperatingModeLabel ?? 'Normal operation'}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {([
                  { value: 'normal', label: 'Normal', description: 'No incident banner and routine operations.' },
                  { value: 'degraded', label: 'Degraded', description: 'Partial customer impact or elevated latency.' },
                  { value: 'maintenance', label: 'Maintenance', description: 'Planned or emergency work affecting service.' },
                ] as const).map((mode) => {
                  const selected = managedMediaOperatingModeDraft === mode.value;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      disabled={updatePlatformSettings.isPending || operatorMutationsLocked}
                      onClick={() => setManagedMediaOperatingModeDraft(mode.value)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        selected ? 'border-accent bg-accent/10' : 'border-border bg-background hover:bg-surface'
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Mode</p>
                      <h4 className="mt-2 font-semibold text-foreground">{mode.label}</h4>
                      <p className="mt-2 text-sm text-muted">{mode.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <label
                  htmlFor="managed-media-incident-message"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Incident Message
                </label>
                <textarea
                  id="managed-media-incident-message"
                  value={managedMediaIncidentMessageDraft}
                  onChange={(event) => setManagedMediaIncidentMessageDraft(event.currentTarget.value)}
                  rows={4}
                  placeholder="Summarize the current customer impact, what is degraded, and the expected next update."
                  disabled={operatorMutationsLocked}
                  className="mt-3 w-full rounded-xl border border-border bg-input px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-muted">
                    This state is intended for operator coordination and incident handling, not customer-facing status pages yet.
                  </p>
                  <button
                    type="button"
                    disabled={updatePlatformSettings.isPending || operatorMutationsLocked || !incidentStateDirty}
                    onClick={() => {
                      const nextMode = managedMediaOperatingModeDraft;
                      const nextMessage = managedMediaIncidentMessageDraft.trim();
                      const nextModeLabel = nextMode.replaceAll('-', ' ');
                      const confirmationMessage =
                        nextMode === 'normal' && nextMessage.length === 0
                          ? 'Clear the managed media incident state and return to normal operation?'
                          : `Update managed media operations to ${nextModeLabel}${nextMessage ? ' and publish the current incident summary?' : '?'}`;

                      if (!window.confirm(confirmationMessage)) {
                        return;
                      }

                      setMessage(null);
                      updatePlatformSettings.mutate({
                        managedMediaOperatingMode: nextMode,
                        managedMediaIncidentMessage: nextMessage,
                      });
                    }}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                  >
                    Save Incident State
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-background p-6">
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-5 w-5 text-accent" />
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Public Service Health</h2>
              <p className="mt-1 text-sm text-muted">
                Live reachability for the hosted customer app, operator console, relay, managed media runtime, and cloud control plane.
              </p>
            </div>
          </div>

          {isOpsServiceHealthLoading ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : opsServiceHealthError ? (
            <div className="mt-5 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
              {opsServiceHealthError instanceof Error ? opsServiceHealthError.message : 'Failed to load service health.'}
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {opsServiceHealth?.services.map((service) => (
                <div key={service.key} className="rounded-xl bg-surface/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{service.label}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        service.status === 'online'
                          ? 'bg-success/15 text-success'
                          : service.status === 'degraded'
                            ? 'bg-warning/15 text-warning'
                            : 'bg-danger/15 text-danger'
                      }`}
                    >
                      {service.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{service.detail}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-muted">
                    {service.responseTimeMs !== null ? `${service.responseTimeMs} ms` : 'Internal check'} ·{' '}
                    {service.httpStatus !== null ? `HTTP ${service.httpStatus}` : 'No HTTP status'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-20 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-6 text-sm text-foreground">
            {error instanceof Error ? error.message : 'Failed to load access profiles.'}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-background p-5">
              <label htmlFor="operator-search" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Search Accounts
              </label>
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-input px-3 py-2">
                <Search className="h-4 w-4 text-muted" />
                <input
                  id="operator-search"
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.currentTarget.value)}
                  placeholder="Search by display name, email, or user id"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                />
              </div>
              {profileManagedMediaControlsDisabled ? (
                <p className="mt-3 text-sm text-muted">
                  Managed media is currently granted to every OmniLux Cloud account, including free accounts, so per-profile managed-media toggles are paused until the policy switches back to explicit access.
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Per-profile managed-media toggles are live because the platform policy is set to explicit access.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">Support View</h2>
                  <p className="mt-2 text-sm text-muted">
                    Select a cloud account to inspect its entitlement state, self-hosted servers, relay sessions, and recent access changes.
                  </p>
                </div>
                <div className="text-xs uppercase tracking-wide text-muted">
                  Selecting a profile records a sensitive operator audit event.
                </div>
              </div>

              {!selectedProfileId ? (
                <div className="mt-4 rounded-xl border border-dashed border-border bg-surface/40 p-4 text-sm text-muted">
                  Choose a profile from the list below to open the support view.
                </div>
              ) : isSupportProfileLoading ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="h-44 animate-pulse rounded-xl bg-surface" />
                  <div className="h-44 animate-pulse rounded-xl bg-surface" />
                </div>
              ) : supportProfileError ? (
                <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
                  {supportProfileError instanceof Error ? supportProfileError.message : 'Failed to load support profile.'}
                </div>
              ) : supportProfile ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-xl bg-surface/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Account</p>
                      <h3 className="mt-2 font-semibold text-foreground">
                        {supportProfile.profile.displayName || supportProfile.profile.email || supportProfile.profile.id}
                      </h3>
                      <p className="mt-1 text-sm text-muted">{supportProfile.profile.email || supportProfile.profile.id}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-background p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Managed Media</p>
                          <p className="mt-2 text-foreground">
                            {supportProfile.profile.managedMediaEntitled ? 'Enabled' : 'Disabled'}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            Override: {supportProfile.profile.managedMediaAccessOverride ? 'enabled' : 'disabled'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-background p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Operator</p>
                          <p className="mt-2 text-foreground">
                            {supportProfile.profile.isOperator ? 'Operator account' : 'Standard account'}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            Updated {new Date(supportProfile.profile.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-lg bg-background p-4 text-sm text-muted">
                        Last sign-in {formatTimestamp(supportProfile.profile.lastSignInAt)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-surface/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Billing</p>
                      {supportProfile.profile.subscription ? (
                        <>
                          <p className="mt-2 font-semibold text-foreground">
                            {supportProfile.profile.subscription.tier} · {supportProfile.profile.subscription.status}
                          </p>
                          <p className="mt-2 text-sm text-muted">
                            Current period ends{' '}
                            {supportProfile.profile.subscription.currentPeriodEnd
                              ? new Date(supportProfile.profile.subscription.currentPeriodEnd).toLocaleString()
                              : 'not scheduled'}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-muted">No active subscription record.</p>
                      )}
                      <div className="mt-4 rounded-lg bg-background p-4 text-sm text-muted">
                        Account created {new Date(supportProfile.profile.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={sendPasswordResetEmail.isPending || operatorMutationsLocked}
                          onClick={() => {
                            const label = supportProfile.profile.email || supportProfile.profile.id;
                            if (!window.confirm(`Send a password reset email to ${label}?`)) {
                              return;
                            }
                            setMessage(null);
                            sendPasswordResetEmail.mutate(supportProfile.profile.id);
                          }}
                          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                        >
                          Send Password Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-xl bg-surface/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Self-Hosted Servers</p>
                          <p className="mt-1 text-sm text-muted">
                            Customer-owned runtimes linked to this cloud account.
                          </p>
                        </div>
                        <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground">
                          {supportProfile.selfHostedServers.length}
                        </span>
                      </div>

                      {supportProfile.selfHostedServers.length === 0 ? (
                        <div className="mt-4 rounded-lg bg-background p-4 text-sm text-muted">
                          No self-hosted servers are linked to this account.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {supportProfile.selfHostedServers.map((server) => (
                            <div key={server.id} className="rounded-lg bg-background p-4">
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <p className="font-medium text-foreground">{server.name}</p>
                                  <p className="mt-1 text-sm text-muted">
                                    {server.ownership === 'owner' ? 'Owner' : `Shared · ${server.accessRole}`}
                                  </p>
                                </div>
                                <div className="text-xs uppercase tracking-wide text-muted">
                                  {server.relayStatus ?? 'unknown'} relay
                                </div>
                              </div>
                              <p className="mt-3 text-xs text-muted">
                                {server.publicOrigin ?? 'No public origin'} · Last seen{' '}
                                {server.lastSeenAt ? new Date(server.lastSeenAt).toLocaleString() : 'never'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-surface/60 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent Relay Sessions</p>
                        <p className="mt-1 text-sm text-muted">
                          Latest remote-access session grants issued for this account.
                        </p>
                      </div>
                      {supportProfile.recentRelaySessions.length === 0 ? (
                        <div className="mt-4 rounded-lg bg-background p-4 text-sm text-muted">
                          No recent relay sessions were issued for this account.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {supportProfile.recentRelaySessions.map((session) => (
                            <div key={session.id} className="rounded-lg bg-background p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <p className="font-medium text-foreground">{session.serverName}</p>
                                  <p className="mt-1 text-sm text-muted">
                                    {session.sessionType} · {session.status}
                                  </p>
                                  <p className="mt-2 text-xs text-muted">
                                    Issued {new Date(session.issuedAt).toLocaleString()} · Expires {formatTimestamp(session.expiresAt)}
                                  </p>
                                </div>
                                {session.revocable ? (
                                  <button
                                    type="button"
                                    disabled={revokeRelaySession.isPending || operatorMutationsLocked}
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
                                    className="rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                                  >
                                    Revoke Session
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-xl bg-surface/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Active Relay Tokens</p>
                          <p className="mt-1 text-sm text-muted">
                            Current server relay credentials that can be revoked without changing server ownership.
                          </p>
                        </div>
                        <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground">
                          {supportProfile.relayTokens.length}
                        </span>
                      </div>

                      {supportProfile.relayTokens.length === 0 ? (
                        <div className="mt-4 rounded-lg bg-background p-4 text-sm text-muted">
                          No active relay tokens were found for this account’s self-hosted servers.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {supportProfile.relayTokens.map((token) => (
                            <div key={token.tokenId} className="rounded-lg bg-background p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <p className="font-medium text-foreground">{token.serverName}</p>
                                  <p className="mt-1 text-sm text-muted">
                                    {token.ownership === 'owner' ? 'Owner' : 'Shared'} · {token.issuedFor}
                                  </p>
                                  <p className="mt-2 text-xs text-muted">
                                    {token.tokenPrefix} · Last used {formatTimestamp(token.lastUsedAt)} · Expires {formatTimestamp(token.expiresAt)}
                                  </p>
                                </div>
                                {token.revocable ? (
                                  <button
                                    type="button"
                                    disabled={revokeServerRelayToken.isPending || operatorMutationsLocked}
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
                                    className="rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                                  >
                                    Revoke Token
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-surface/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Support Notes</p>
                      <p className="mt-1 text-sm text-muted">
                        Operator-only notes for support handoff, incident context, and follow-up actions.
                      </p>
                      <div className="mt-4 space-y-3">
                        <textarea
                          value={supportNoteDraft}
                          onChange={(event) => setSupportNoteDraft(event.currentTarget.value)}
                          rows={5}
                          placeholder="Summarize the issue, the action taken, and what the next operator should know."
                          disabled={operatorMutationsLocked}
                          className="w-full rounded-xl border border-border bg-input px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
                        />
                        <input
                          type="text"
                          value={supportNoteTagsDraft}
                          onChange={(event) => setSupportNoteTagsDraft(event.currentTarget.value)}
                          placeholder="Optional tags, comma separated (billing, relay, auth)"
                          disabled={operatorMutationsLocked}
                          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-muted">
                            Tagged notes stay in the operator audit history and support view for this account.
                          </p>
                          <button
                            type="button"
                            disabled={operatorMutationsLocked || createSupportNote.isPending || supportNoteDraft.trim().length === 0}
                            onClick={() => {
                              const note = supportNoteDraft.trim();
                              if (!note) {
                                return;
                              }
                              if (!window.confirm(`Save a support note for ${supportProfile.profile.email || supportProfile.profile.id}?`)) {
                                return;
                              }
                              setMessage(null);
                              createSupportNote.mutate({
                                userId: supportProfile.profile.id,
                                note,
                                tags: supportNoteTags,
                              });
                            }}
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>

                      {supportProfile.supportNotes.length === 0 ? (
                        <div className="mt-4 rounded-lg bg-background p-4 text-sm text-muted">
                          No support notes have been recorded for this account yet.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {supportProfile.supportNotes.map((note) => (
                            <div key={note.id} className="rounded-lg bg-background p-4">
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                <p className="text-sm font-medium text-foreground">
                                  {renderProfileLabel(note.actor)} · {formatTimestamp(note.createdAt)}
                                </p>
                                {note.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {note.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full bg-surface px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm text-muted">{note.note}</p>
                              {note.server ? (
                                <p className="mt-2 text-xs text-muted">Server context: {note.server.name}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-surface/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent Access Changes For This Account</p>
                    {supportProfile.recentAccessChanges.length === 0 ? (
                      <div className="mt-4 rounded-lg bg-background p-4 text-sm text-muted">
                        No access changes have been recorded for this account.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {supportProfile.recentAccessChanges.map((row) => (
                          <div key={row.id} className="rounded-lg bg-background p-4">
                            <p className="text-sm font-medium text-foreground">
                              {renderProfileLabel(row.actor)} changed {renderProfileLabel(row.target)}
                            </p>
                            <p className="mt-1 text-sm text-muted">{renderAuditSummary(row)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {filteredProfiles.map((profile) => {
                const isUpdatingThisProfile = updateProfileAccess.isPending && updateProfileAccess.variables?.userId === profile.id;
                const isSelectedProfile = selectedProfileId === profile.id;
                const subscriptionLabel = profile.subscription
                  ? `${profile.subscription.tier} · ${profile.subscription.status}`
                  : 'No active subscription';

                return (
                  <div
                    key={profile.id}
                    className={`rounded-xl border p-5 ${
                      isSelectedProfile ? 'border-accent bg-accent/5' : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="font-semibold text-foreground">
                          {profile.displayName || profile.email || profile.id}
                        </h2>
                        <p className="mt-1 text-sm text-muted">{profile.email || profile.id}</p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-muted">{subscriptionLabel}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null);
                            setSelectedProfileId(profile.id);
                          }}
                          className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                            isSelectedProfile
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-surface/60 text-foreground hover:bg-surface'
                          }`}
                        >
                          {isSelectedProfile ? 'Viewing support details' : 'Open support view'}
                        </button>

                        <label className="flex items-center justify-between gap-3 rounded-lg bg-surface/60 px-4 py-3 text-sm text-foreground">
                          <span>Managed media</span>
                          <input
                            type="checkbox"
                            checked={profile.managedMediaEntitled}
                            disabled={operatorMutationsLocked || isUpdatingThisProfile || profileManagedMediaControlsDisabled}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.checked;
                              const actionLabel = nextValue ? 'enable' : 'disable';
                              if (!window.confirm(`Really ${actionLabel} managed media for ${profile.email || profile.id}?`)) {
                                event.currentTarget.checked = !nextValue;
                                return;
                              }
                              setMessage(null);
                              updateProfileAccess.mutate({
                                userId: profile.id,
                                managedMediaEntitled: nextValue,
                              });
                            }}
                            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                          />
                        </label>

                        <label className="flex items-center justify-between gap-3 rounded-lg bg-surface/60 px-4 py-3 text-sm text-foreground">
                          <span>Operator</span>
                          <input
                            type="checkbox"
                            checked={profile.isOperator}
                            disabled={operatorMutationsLocked || isUpdatingThisProfile}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.checked;
                              const actionLabel = nextValue ? 'grant' : 'remove';
                              if (!window.confirm(`Really ${actionLabel} operator access for ${profile.email || profile.id}?`)) {
                                event.currentTarget.checked = !nextValue;
                                return;
                              }
                              setMessage(null);
                              updateProfileAccess.mutate({
                                userId: profile.id,
                                isOperator: nextValue,
                              });
                            }}
                            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl surface-soft p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">Sensitive Operator Activity</h2>
                  <p className="mt-2 text-sm text-muted">
                    Unified audit feed for support lookups and high-impact control-plane changes.
                  </p>
                </div>
              </div>

              {isOperatorActionAuditLoading ? (
                <div className="mt-4 space-y-3">
                  {[1, 2, 3].map((index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-background/70" />
                  ))}
                </div>
              ) : operatorActionAuditError ? (
                <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
                  {operatorActionAuditError instanceof Error
                    ? operatorActionAuditError.message
                    : 'Failed to load sensitive operator activity.'}
                </div>
              ) : (operatorActionAuditLog?.length ?? 0) === 0 ? (
                <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted">
                  No sensitive operator actions have been recorded yet.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {operatorActionAuditLog?.map((row) => (
                    <div key={row.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {renderProfileLabel(row.actor)} · {renderOperatorActionSummary(row)}
                          </p>
                          <p className="mt-1 text-sm text-muted">{renderOperatorActionDetail(row)}</p>
                        </div>
                        <div className="text-xs uppercase tracking-wide text-muted">
                          {new Date(row.createdAt).toLocaleString()} · {row.source}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl surface-soft p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">Recent Access Changes</h2>
                  <p className="mt-2 text-sm text-muted">
                    Latest managed-media and operator access changes from the dashboard or bootstrap tooling.
                  </p>
                </div>
              </div>

              {isAuditLoading ? (
                <div className="mt-4 space-y-3">
                  {[1, 2, 3].map((index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-background/70" />
                  ))}
                </div>
              ) : auditError ? (
                <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
                  {auditError instanceof Error ? auditError.message : 'Failed to load access audit log.'}
                </div>
              ) : (auditLog?.length ?? 0) === 0 ? (
                <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted">
                  No access changes have been recorded yet.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {auditLog?.map((row) => (
                    <div key={row.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {renderProfileLabel(row.actor)} changed {renderProfileLabel(row.target)}
                          </p>
                          <p className="mt-1 text-sm text-muted">{renderAuditSummary(row)}</p>
                        </div>
                        <div className="text-xs uppercase tracking-wide text-muted">
                          {new Date(row.createdAt).toLocaleString()} · {row.source}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl surface-soft p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">Recent Policy Changes</h2>
                  <p className="mt-2 text-sm text-muted">
                    Managed media policy flips recorded from the operator console or bootstrap tooling.
                  </p>
                </div>
              </div>

              {isPolicyAuditLoading ? (
                <div className="mt-4 space-y-3">
                  {[1, 2, 3].map((index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-background/70" />
                  ))}
                </div>
              ) : policyAuditError ? (
                <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
                  {policyAuditError instanceof Error ? policyAuditError.message : 'Failed to load policy audit log.'}
                </div>
              ) : (policyAuditLog?.length ?? 0) === 0 ? (
                <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted">
                  No policy changes have been recorded yet.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {policyAuditLog?.map((row) => (
                    <div key={row.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {renderProfileLabel(row.actor)} updated managed media policy
                          </p>
                          <p className="mt-1 text-sm text-muted">{renderPolicySummary(row)}</p>
                        </div>
                        <div className="text-xs uppercase tracking-wide text-muted">
                          {new Date(row.createdAt).toLocaleString()} · {row.source}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
