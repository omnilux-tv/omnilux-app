import { Link } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import {
  formatTimestamp,
  managedMediaPolicyCopy,
  relayAccessPolicyCopy,
  renderPolicySummary,
  renderProfileLabel,
} from '@/surfaces/app/lib/ops-formatters';
import {
  type ManagedMediaOperatingMode,
  type ManagedMediaPolicy,
  type RelayAccessPolicy,
  useOpsOverview,
  usePlatformSettings,
  usePlatformSettingsAuditLog,
} from '@/surfaces/app/lib/ops';
import { OpsLoadingState, OpsNotice, OpsPageShell } from '@/surfaces/app/pages/dashboard/OpsPageShell';

export const OpsControlPlane = () => {
  const queryClient = useQueryClient();
  const {
    data: accessProfile,
    isLoading: isAccessProfileLoading,
    error: accessProfileError,
  } = useAccessProfile();
  const operatorEnabled = Boolean(accessProfile?.isOperator);
  const operatorMutationsLocked = accessProfile?.sessionAssuranceLevel !== 'aal2';
  const [message, setMessage] = useState<string | null>(null);
  const [managedMediaOperatingModeDraft, setManagedMediaOperatingModeDraft] =
    useState<ManagedMediaOperatingMode>('normal');
  const [managedMediaIncidentMessageDraft, setManagedMediaIncidentMessageDraft] = useState('');
  const {
    data: platformSettings,
    error: platformSettingsError,
    isLoading: isPlatformSettingsLoading,
  } = usePlatformSettings(operatorEnabled);
  const {
    data: opsOverview,
    error: opsOverviewError,
    isLoading: isOpsOverviewLoading,
  } = useOpsOverview(operatorEnabled);
  const {
    data: policyAuditLog,
    error: policyAuditError,
    isLoading: isPolicyAuditLoading,
  } = usePlatformSettingsAuditLog(operatorEnabled);

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
      setMessage('Control-plane policy updated.');
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

  useEffect(() => {
    if (!platformSettings) {
      return;
    }

    setManagedMediaOperatingModeDraft(platformSettings.managedMediaOperatingMode);
    setManagedMediaIncidentMessageDraft(platformSettings.managedMediaIncidentMessage ?? '');
  }, [platformSettings]);

  if (isAccessProfileLoading) {
    return <OpsLoadingState />;
  }

  if (accessProfileError) {
    return (
      <OpsNotice
        title="Control plane unavailable"
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

  const incidentStateDirty =
    managedMediaOperatingModeDraft !== (platformSettings?.managedMediaOperatingMode ?? 'normal') ||
    managedMediaIncidentMessageDraft !== (platformSettings?.managedMediaIncidentMessage ?? '');

  return (
    <OpsPageShell
      eyebrow="Control Plane"
      title="Change policy where the platform actually runs."
      description="Managed media rules, relay entitlement posture, and live runtime advisories live here so operators can make controlled decisions with full platform context."
      metrics={[
        {
          label: 'Managed media policy',
          value: platformSettings?.managedMediaPolicyLabel ?? 'Loading',
          detail: 'Who gets first-party media access by default.',
        },
        {
          label: 'Relay policy',
          value: platformSettings?.relayAccessPolicyLabel ?? 'Loading',
          detail: 'How self-hosted remote access is gated.',
        },
        {
          label: 'Operating mode',
          value: platformSettings?.managedMediaOperatingModeLabel ?? 'Loading',
          detail: 'Live state for the managed runtime.',
        },
        {
          label: 'Explicit overrides',
          value: String(opsOverview?.metrics.explicitlyEntitledProfilesTotal ?? 0),
          detail: 'Accounts with direct managed-media overrides.',
        },
      ]}
    >
      {operatorMutationsLocked ? (
        <section className="rounded-[1.75rem] border border-warning/30 bg-warning/10 p-5 text-sm text-foreground">
          <p className="font-semibold text-foreground">Sensitive control-plane changes are locked for this session.</p>
          <p className="mt-2">
            Current assurance: {accessProfile.sessionAssuranceLevel?.toUpperCase() ?? 'Unknown'}. Verify MFA in your
            account security settings before changing platform policy or incident state.
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Policy lanes</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                Decide who gets managed media, how relay access is priced, and how the managed runtime should present
                its live state to operators.
              </p>
            </div>
            <Link
              to="/dashboard/media-control"
              className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
            >
              Open media operations
            </Link>
          </div>

          {isPlatformSettingsLoading || isOpsOverviewLoading ? (
            <div className="mt-5 space-y-4">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-32 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
              ))}
            </div>
          ) : platformSettingsError || opsOverviewError ? (
            <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
              {platformSettingsError instanceof Error
                ? platformSettingsError.message
                : opsOverviewError instanceof Error
                  ? opsOverviewError.message
                  : 'Failed to load platform policy.'}
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Managed media access</p>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {(['all-authenticated-users', 'explicit-per-profile'] as const).map((policy) => {
                    const copy = managedMediaPolicyCopy[policy];
                    const selected = platformSettings?.managedMediaPolicy === policy;

                    return (
                      <button
                        key={policy}
                        type="button"
                        disabled={updatePlatformSettings.isPending || operatorMutationsLocked}
                        onClick={() => {
                          if (selected) {
                            return;
                          }
                          if (!window.confirm(`Switch managed media policy to "${copy.label}"?`)) {
                            return;
                          }
                          setMessage(null);
                          updatePlatformSettings.mutate({ managedMediaPolicy: policy });
                        }}
                        className={`rounded-[1.25rem] border p-5 text-left transition-colors ${
                          selected
                            ? 'border-accent bg-accent/10'
                            : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.06]'
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Policy</p>
                        <h3 className="mt-2 text-lg font-semibold text-foreground">{copy.label}</h3>
                        <p className="mt-2 text-sm text-muted">{copy.description}</p>
                        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">
                          {policy === 'all-authenticated-users'
                            ? `${opsOverview?.metrics.profilesTotal ?? 0} accounts covered automatically`
                            : `${opsOverview?.metrics.explicitlyEntitledProfilesTotal ?? 0} explicit account overrides`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Self-hosted relay access</p>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {(['all-authenticated-users', 'paid-subscription'] as const).map((policy) => {
                    const copy = relayAccessPolicyCopy[policy];
                    const selected = platformSettings?.relayAccessPolicy === policy;

                    return (
                      <button
                        key={policy}
                        type="button"
                        disabled={updatePlatformSettings.isPending || operatorMutationsLocked}
                        onClick={() => {
                          if (selected) {
                            return;
                          }
                          if (!window.confirm(`Switch relay access policy to "${copy.label}"?`)) {
                            return;
                          }
                          setMessage(null);
                          updatePlatformSettings.mutate({ relayAccessPolicy: policy });
                        }}
                        className={`rounded-[1.25rem] border p-5 text-left transition-colors ${
                          selected
                            ? 'border-accent bg-accent/10'
                            : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.06]'
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Policy</p>
                        <h3 className="mt-2 text-lg font-semibold text-foreground">{copy.label}</h3>
                        <p className="mt-2 text-sm text-muted">{copy.description}</p>
                        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">
                          {opsOverview?.metrics.activeSubscriptionsTotal ?? 0} active plans in current coverage
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Managed runtime advisory</h3>
                    <p className="mt-2 text-sm text-muted">
                      Publish the live operating state for `media.omnilux.tv` and keep the current incident brief
                      attached to the platform configuration.
                    </p>
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">
                    Current {platformSettings?.managedMediaOperatingModeLabel ?? 'Unknown'}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {([
                    { value: 'normal', label: 'Normal', description: 'Routine operations with no active advisory.' },
                    { value: 'degraded', label: 'Degraded', description: 'Customer impact exists but the runtime is still operating.' },
                    { value: 'maintenance', label: 'Maintenance', description: 'Planned or emergency work is affecting service.' },
                  ] as const).map((mode) => {
                    const selected = managedMediaOperatingModeDraft === mode.value;

                    return (
                      <button
                        key={mode.value}
                        type="button"
                        disabled={updatePlatformSettings.isPending || operatorMutationsLocked}
                        onClick={() => setManagedMediaOperatingModeDraft(mode.value)}
                        className={`rounded-[1.25rem] border p-4 text-left transition-colors ${
                          selected
                            ? 'border-accent bg-accent/10'
                            : 'border-white/10 bg-black/20 hover:bg-white/[0.06]'
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Mode</p>
                        <h4 className="mt-2 text-lg font-semibold text-foreground">{mode.label}</h4>
                        <p className="mt-2 text-sm text-muted">{mode.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="control-plane-incident-message"
                    className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                  >
                    Incident brief
                  </label>
                  <textarea
                    id="control-plane-incident-message"
                    rows={5}
                    value={managedMediaIncidentMessageDraft}
                    onChange={(event) => setManagedMediaIncidentMessageDraft(event.currentTarget.value)}
                    placeholder="Summarize the customer impact, what changed, and when operators should expect the next update."
                    disabled={operatorMutationsLocked}
                    className="mt-3 w-full rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none focus:border-white/20"
                  />
                  <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-muted">
                      Keep this written for operators and support staff, not as public marketing copy.
                    </p>
                    <button
                      type="button"
                      disabled={updatePlatformSettings.isPending || operatorMutationsLocked || !incidentStateDirty}
                      onClick={() => {
                        const nextMode = managedMediaOperatingModeDraft;
                        const nextMessage = managedMediaIncidentMessageDraft.trim();
                        const confirmationMessage =
                          nextMode === 'normal' && nextMessage.length === 0
                            ? 'Clear the managed runtime advisory and return to normal operation?'
                            : `Save the ${nextMode.replaceAll('-', ' ')} advisory state?`;

                        if (!window.confirm(confirmationMessage)) {
                          return;
                        }

                        setMessage(null);
                        updatePlatformSettings.mutate({
                          managedMediaOperatingMode: nextMode,
                          managedMediaIncidentMessage: nextMessage,
                        });
                      }}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-95 disabled:opacity-50"
                    >
                      Save advisory
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Policy audit</h2>
              <p className="mt-2 text-sm text-muted">
                Every control-plane change stays attached to an actor and timestamp.
              </p>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-muted">
              {policyAuditLog?.length ?? 0} events
            </span>
          </div>

          {isPolicyAuditLoading ? (
            <div className="mt-5 space-y-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
              ))}
            </div>
          ) : policyAuditError ? (
            <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
              {policyAuditError instanceof Error ? policyAuditError.message : 'Failed to load platform policy audit.'}
            </div>
          ) : (policyAuditLog?.length ?? 0) === 0 ? (
            <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
              No control-plane policy changes have been recorded yet.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {policyAuditLog?.slice(0, 10).map((row) => (
                <div key={row.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {renderProfileLabel(row.actor)} updated platform policy
                  </p>
                  <p className="mt-2 text-sm text-muted">{renderPolicySummary(row)}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
                    {formatTimestamp(row.createdAt)} · {row.source}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </OpsPageShell>
  );
};
