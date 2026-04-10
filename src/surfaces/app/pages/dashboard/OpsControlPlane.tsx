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
import {
  OpsCallout,
  OpsConfirmDialog,
  OpsLoadingState,
  OpsNotice,
  OpsPageShell,
  OpsPanel,
  OpsStatusBadge,
  opsButtonClassName,
} from '@/surfaces/app/pages/dashboard/OpsPageShell';

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
  const [confirmation, setConfirmation] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    confirmTone?: 'primary' | 'danger';
    onConfirm: () => void;
  } | null>(null);
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
    return <OpsLoadingState label="Loading control plane" />;
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
    return <OpsNotice title="Operator Access Required" body="This page is reserved for internal OmniLux operator accounts." />;
  }

  const incidentStateDirty =
    managedMediaOperatingModeDraft !== (platformSettings?.managedMediaOperatingMode ?? 'normal') ||
    managedMediaIncidentMessageDraft !== (platformSettings?.managedMediaIncidentMessage ?? '');

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
            tone:
              platformSettings?.managedMediaOperatingMode === 'normal'
                ? 'success'
                : platformSettings?.managedMediaOperatingMode
                  ? 'warning'
                  : 'neutral',
          },
          {
            label: 'Explicit overrides',
            value: String(opsOverview?.metrics.explicitlyEntitledProfilesTotal ?? 0),
            detail: 'Accounts with direct managed-media overrides.',
          },
        ]}
      >
        {operatorMutationsLocked ? (
          <OpsCallout
            tone="warning"
            title="Sensitive control-plane changes are locked for this session."
            body={`Current assurance: ${accessProfile.sessionAssuranceLevel?.toUpperCase() ?? 'Unknown'}. Verify MFA in your account security settings before changing platform policy or incident state.`}
            action={
              <Link to="/dashboard/account" className={opsButtonClassName({ tone: 'secondary' })}>
                Open account security
              </Link>
            }
          />
        ) : null}

        {message ? <OpsCallout tone="info" title="Control-plane update" body={message} /> : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_380px]">
          <OpsPanel
            title="Policy lanes"
            description="Decide who gets managed media, how relay access is priced, and how the managed runtime should present its live state."
            actions={
              <Link to="/dashboard/media-control" className={opsButtonClassName({ tone: 'secondary' })}>
                Open runtime lane
              </Link>
            }
          >
            {isPlatformSettingsLoading || isOpsOverviewLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-28 animate-pulse rounded-lg bg-white/[0.04]" />
                ))}
              </div>
            ) : platformSettingsError || opsOverviewError ? (
              <OpsNotice
                title="Policy data unavailable"
                body={
                  platformSettingsError instanceof Error
                    ? platformSettingsError.message
                    : opsOverviewError instanceof Error
                      ? opsOverviewError.message
                      : 'Failed to load platform policy.'
                }
                tone="danger"
              />
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Managed media access</p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {(['all-authenticated-users', 'explicit-per-profile'] as const).map((policy) => {
                      const copy = managedMediaPolicyCopy[policy];
                      const selected = platformSettings?.managedMediaPolicy === policy;

                      return (
                        <button
                          key={policy}
                          type="button"
                          disabled={updatePlatformSettings.isPending || operatorMutationsLocked}
                          onClick={() =>
                            !selected &&
                            requestConfirmation({
                              title: 'Update managed media policy',
                              body: `Switch managed media access to "${copy.label}".`,
                              confirmLabel: 'Apply policy',
                              onConfirm: () => {
                                setMessage(null);
                                updatePlatformSettings.mutate({ managedMediaPolicy: policy });
                              },
                            })
                          }
                          className={`rounded-lg border px-4 py-4 text-left transition-colors ${
                            selected
                              ? 'border-primary/30 bg-primary/12'
                              : 'border-border bg-panel-muted hover:bg-card-hover'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{copy.label}</p>
                              <p className="mt-2 text-sm leading-6 text-muted">{copy.description}</p>
                            </div>
                            {selected ? <OpsStatusBadge tone="info">Active</OpsStatusBadge> : null}
                          </div>
                          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted">
                            {policy === 'all-authenticated-users'
                              ? `${opsOverview?.metrics.profilesTotal ?? 0} accounts covered`
                              : `${opsOverview?.metrics.explicitlyEntitledProfilesTotal ?? 0} explicit overrides`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Self-hosted relay access</p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {(['all-authenticated-users', 'paid-subscription'] as const).map((policy) => {
                      const copy = relayAccessPolicyCopy[policy];
                      const selected = platformSettings?.relayAccessPolicy === policy;

                      return (
                        <button
                          key={policy}
                          type="button"
                          disabled={updatePlatformSettings.isPending || operatorMutationsLocked}
                          onClick={() =>
                            !selected &&
                            requestConfirmation({
                              title: 'Update relay access policy',
                              body: `Switch relay access to "${copy.label}".`,
                              confirmLabel: 'Apply policy',
                              onConfirm: () => {
                                setMessage(null);
                                updatePlatformSettings.mutate({ relayAccessPolicy: policy });
                              },
                            })
                          }
                          className={`rounded-lg border px-4 py-4 text-left transition-colors ${
                            selected
                              ? 'border-primary/30 bg-primary/12'
                              : 'border-border bg-panel-muted hover:bg-card-hover'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{copy.label}</p>
                              <p className="mt-2 text-sm leading-6 text-muted">{copy.description}</p>
                            </div>
                            {selected ? <OpsStatusBadge tone="info">Active</OpsStatusBadge> : null}
                          </div>
                          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted">
                            {opsOverview?.metrics.activeSubscriptionsTotal ?? 0} active plans in current coverage
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Managed runtime advisory</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">Publish operating mode and incident brief</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Keep runtime state explicit for operators and support staff. This is internal operational copy, not public status-page language.
                      </p>
                    </div>
                    <OpsStatusBadge tone={managedMediaOperatingModeDraft === 'normal' ? 'success' : 'warning'}>
                      {managedMediaOperatingModeDraft}
                    </OpsStatusBadge>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {([
                      { value: 'normal', label: 'Normal', description: 'Routine operations with no active advisory.' },
                      { value: 'degraded', label: 'Degraded', description: 'Customer impact exists but the runtime still operates.' },
                      { value: 'maintenance', label: 'Maintenance', description: 'Planned or emergency work is affecting service.' },
                    ] as const).map((mode) => {
                      const selected = managedMediaOperatingModeDraft === mode.value;

                      return (
                        <button
                          key={mode.value}
                          type="button"
                          disabled={updatePlatformSettings.isPending || operatorMutationsLocked}
                          onClick={() => setManagedMediaOperatingModeDraft(mode.value)}
                          className={`rounded-lg border px-4 py-4 text-left transition-colors ${
                            selected
                              ? 'border-primary/30 bg-primary/12'
                              : 'border-border bg-black/10 hover:bg-card-hover'
                          }`}
                        >
                          <p className="text-sm font-semibold text-foreground">{mode.label}</p>
                          <p className="mt-2 text-sm leading-6 text-muted">{mode.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <textarea
                      id="control-plane-incident-message"
                      rows={5}
                      value={managedMediaIncidentMessageDraft}
                      onChange={(event) => setManagedMediaIncidentMessageDraft(event.currentTarget.value)}
                      placeholder="Summarize the customer impact, what changed, and when operators should expect the next update."
                      disabled={operatorMutationsLocked}
                      className="w-full rounded-md border border-border bg-input px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-border-hover"
                    />
                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <p className="text-sm text-muted">Keep this written for operators and support staff, not as public marketing copy.</p>
                      <button
                        type="button"
                        disabled={updatePlatformSettings.isPending || operatorMutationsLocked || !incidentStateDirty}
                        onClick={() =>
                          requestConfirmation({
                            title: 'Save advisory state',
                            body:
                              managedMediaOperatingModeDraft === 'normal' &&
                              managedMediaIncidentMessageDraft.trim().length === 0
                                ? 'Clear the managed runtime advisory and return to normal operation.'
                                : `Save the ${managedMediaOperatingModeDraft.replaceAll('-', ' ')} advisory state.`,
                            confirmLabel: 'Save advisory',
                            confirmTone: 'primary',
                            onConfirm: () => {
                              setMessage(null);
                              updatePlatformSettings.mutate({
                                managedMediaOperatingMode: managedMediaOperatingModeDraft,
                                managedMediaIncidentMessage: managedMediaIncidentMessageDraft.trim(),
                              });
                            },
                          })
                        }
                        className={opsButtonClassName({ tone: 'primary' })}
                      >
                        Save advisory
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </OpsPanel>

          <OpsPanel
            title="Policy audit"
            description="Every control-plane change stays attached to an actor and timestamp."
            meta={isPolicyAuditLoading ? 'Refreshing' : `${policyAuditLog?.length ?? 0} events`}
          >
            {isPolicyAuditLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
                ))}
              </div>
            ) : policyAuditError ? (
              <OpsNotice
                title="Policy audit unavailable"
                body={
                  policyAuditError instanceof Error
                    ? policyAuditError.message
                    : 'Failed to load platform policy audit.'
                }
                tone="danger"
              />
            ) : (policyAuditLog?.length ?? 0) === 0 ? (
              <OpsNotice title="No policy changes recorded" body="No control-plane policy changes have been recorded yet." />
            ) : (
              <div className="space-y-3">
                {policyAuditLog?.slice(0, 10).map((row) => (
                  <div key={row.id} className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{renderProfileLabel(row.actor)}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">{formatTimestamp(row.createdAt)}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">{renderPolicySummary(row)}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">{row.source}</p>
                  </div>
                ))}
              </div>
            )}
          </OpsPanel>
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
