import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAccessProfile, type AccessProfile } from '@/surfaces/app/lib/access-profile';
import {
  usePlatformSettings,
  usePlatformSettingsAuditLog,
  type ManagedMediaPolicy,
  type PlatformSettingsAuditRow,
} from '@/surfaces/app/lib/ops';

interface AccessProfileRow extends AccessProfile {}
interface AccessAuditRow {
  id: number;
  source: string;
  createdAt: string;
  actor: {
    userId: string | null;
    email: string | null;
    displayName: string | null;
  };
  target: {
    userId: string;
    email: string | null;
    displayName: string | null;
  };
  managedMediaEntitledBefore: boolean | null;
  managedMediaEntitledAfter: boolean | null;
  isOperatorBefore: boolean | null;
  isOperatorAfter: boolean | null;
}

const managedMediaPolicyCopy: Record<ManagedMediaPolicy, { label: string; description: string }> = {
  'all-authenticated-users': {
    label: 'All authenticated cloud users',
    description: 'Every signed-in OmniLux Cloud account can access first-party managed media.',
  },
  'explicit-per-profile': {
    label: 'Explicit per-profile access',
    description: 'Managed media access is controlled account by account through the operator console.',
  },
};

const renderProfileLabel = (profile: { displayName: string | null; email: string | null; userId: string | null }) =>
  profile.displayName || profile.email || profile.userId || 'Unknown account';

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
  row.managedMediaPolicyBefore !== row.managedMediaPolicyAfter
    ? `${managedMediaPolicyCopy[row.managedMediaPolicyAfter ?? 'all-authenticated-users'].label} enabled`
    : 'No policy change details recorded';

export const Operators = () => {
  const queryClient = useQueryClient();
  const { data: accessProfile, isLoading: isAccessProfileLoading, error: accessProfileError } = useAccessProfile();
  const [message, setMessage] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
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
        queryClient.invalidateQueries({ queryKey: ['access-profile'] }),
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
    mutationFn: async (managedMediaPolicy: ManagedMediaPolicy) => {
      const { data, error } = await supabase.functions.invoke('update-platform-settings', {
        body: {
          managedMediaPolicy,
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
        queryClient.invalidateQueries({ queryKey: ['ops-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['access-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['operator-access-profiles'] }),
      ]);
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : 'Failed to update platform policy.');
    },
  });

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
  const profileManagedMediaControlsDisabled = managedMediaPolicy === 'all-authenticated-users';

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
            hosted `ops.omnilux.tv` console plus access-management tooling.
          </p>
        </div>

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
                    disabled={updatePlatformSettings.isPending}
                    onClick={() => {
                      if (policy === managedMediaPolicy) {
                        return;
                      }
                      setMessage(null);
                      updatePlatformSettings.mutate(policy);
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
          </div>
        )}

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
                  Managed media is currently granted to all authenticated cloud users, so per-profile managed-media toggles are paused until the policy switches back to explicit access.
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Per-profile managed-media toggles are live because the policy is set to explicit access.
                </p>
              )}
            </div>

            <div className="space-y-3">
              {filteredProfiles.map((profile) => {
                const isUpdatingThisProfile = updateProfileAccess.isPending && updateProfileAccess.variables?.userId === profile.id;
                const subscriptionLabel = profile.subscription
                  ? `${profile.subscription.tier} · ${profile.subscription.status}`
                  : 'No active subscription';

                return (
                  <div key={profile.id} className="rounded-xl border border-border bg-background p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="font-semibold text-foreground">
                          {profile.displayName || profile.email || profile.id}
                        </h2>
                        <p className="mt-1 text-sm text-muted">{profile.email || profile.id}</p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-muted">{subscriptionLabel}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-center justify-between gap-3 rounded-lg bg-surface/60 px-4 py-3 text-sm text-foreground">
                          <span>Managed media</span>
                          <input
                            type="checkbox"
                            checked={profile.managedMediaEntitled}
                            disabled={isUpdatingThisProfile || profileManagedMediaControlsDisabled}
                            onChange={(event) => {
                              setMessage(null);
                              updateProfileAccess.mutate({
                                userId: profile.id,
                                managedMediaEntitled: event.currentTarget.checked,
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
                            disabled={isUpdatingThisProfile}
                            onChange={(event) => {
                              setMessage(null);
                              updateProfileAccess.mutate({
                                userId: profile.id,
                                isOperator: event.currentTarget.checked,
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
