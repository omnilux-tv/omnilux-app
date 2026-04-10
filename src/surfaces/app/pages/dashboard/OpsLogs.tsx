import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import {
  renderAuditSummary,
  renderOperatorActionDetail,
  renderOperatorActionSummary,
  renderPolicySummary,
  renderProfileLabel,
} from '@/surfaces/app/lib/ops-formatters';
import {
  useAccessAuditLog,
  useOperatorActionAuditLog,
  usePlatformSettingsAuditLog,
} from '@/surfaces/app/lib/ops';

export const OpsLogs = () => {
  const {
    data: accessProfile,
    isLoading: isAccessProfileLoading,
    error: accessProfileError,
  } = useAccessProfile();
  const operatorEnabled = Boolean(accessProfile?.isOperator);
  const {
    data: operatorActionAuditLog,
    error: operatorActionAuditError,
    isLoading: isOperatorActionAuditLoading,
  } = useOperatorActionAuditLog(operatorEnabled);
  const {
    data: accessAuditLog,
    error: accessAuditError,
    isLoading: isAccessAuditLoading,
  } = useAccessAuditLog(operatorEnabled);
  const {
    data: policyAuditLog,
    error: policyAuditError,
    isLoading: isPolicyAuditLoading,
  } = usePlatformSettingsAuditLog(operatorEnabled);

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
        <div className="mx-auto w-full max-w-[2200px] rounded-xl border border-danger/30 bg-danger/10 p-6 text-sm text-foreground">
          {accessProfileError instanceof Error ? accessProfileError.message : 'Failed to load access profile.'}
        </div>
      </div>
    );
  }

  if (!accessProfile?.isOperator) {
    return (
      <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[2200px] rounded-xl border border-warning/30 bg-warning/10 p-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Operator Access Required</h1>
          <p className="mt-2 text-sm text-foreground">
            This page is reserved for internal OmniLux operator accounts.
          </p>
        </div>
      </div>
    );
  }

  const operatorActionsTotal = operatorActionAuditLog?.length ?? 0;
  const accessChangesTotal = accessAuditLog?.length ?? 0;
  const policyChangesTotal = policyAuditLog?.length ?? 0;

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[2200px] space-y-6">
        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Logs</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-foreground sm:text-5xl">
            Audit the org in one timeline.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Track sensitive operator actions, account access changes, and control-plane edits without digging through mixed cards or side panels.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Sensitive actions', value: String(operatorActionsTotal), detail: 'High-impact operator activity' },
              { label: 'Access changes', value: String(accessChangesTotal), detail: 'Managed media and operator permission changes' },
              { label: 'Policy changes', value: String(policyChangesTotal), detail: 'Managed media and relay rule updates' },
              {
                label: 'Latest event',
                value:
                  operatorActionAuditLog?.[0]?.createdAt
                    ? new Date(operatorActionAuditLog[0].createdAt).toLocaleDateString()
                    : '—',
                detail: 'Most recent sensitive action date',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                <p className="mt-3 font-display text-3xl font-bold text-foreground">{item.value}</p>
                <p className="mt-2 text-sm text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Operator activity</h2>
              <p className="mt-2 text-sm text-muted">
                Sensitive account lookups, relay revocations, note writes, and platform changes.
              </p>
            </div>
          </div>

          {isOperatorActionAuditLoading ? (
            <div className="mt-5 space-y-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-16 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
              ))}
            </div>
          ) : operatorActionAuditError ? (
            <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
              {operatorActionAuditError instanceof Error
                ? operatorActionAuditError.message
                : 'Failed to load sensitive operator activity.'}
            </div>
          ) : operatorActionsTotal === 0 ? (
            <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
              No sensitive operator actions have been recorded yet.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {operatorActionAuditLog?.map((row) => (
                <div key={row.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {renderProfileLabel(row.actor)} · {renderOperatorActionSummary(row)}
                      </p>
                      <p className="mt-1 text-sm text-muted">{renderOperatorActionDetail(row)}</p>
                    </div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted">
                      {new Date(row.createdAt).toLocaleString()} · {row.source}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
            <h2 className="font-display text-2xl font-bold text-foreground">Account access log</h2>
            <p className="mt-2 text-sm text-muted">
              Managed media and operator access changes across cloud accounts.
            </p>

            {isAccessAuditLoading ? (
              <div className="mt-5 space-y-3">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-16 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
                ))}
              </div>
            ) : accessAuditError ? (
              <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
                {accessAuditError instanceof Error ? accessAuditError.message : 'Failed to load access audit log.'}
              </div>
            ) : accessChangesTotal === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
                No access changes have been recorded yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {accessAuditLog?.map((row) => (
                  <div key={row.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {renderProfileLabel(row.actor)} changed {renderProfileLabel(row.target)}
                        </p>
                        <p className="mt-1 text-sm text-muted">{renderAuditSummary(row)}</p>
                      </div>
                      <div className="text-xs uppercase tracking-[0.18em] text-muted">
                        {new Date(row.createdAt).toLocaleString()} · {row.source}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
            <h2 className="font-display text-2xl font-bold text-foreground">Control-plane log</h2>
            <p className="mt-2 text-sm text-muted">
              Managed media and relay policy edits recorded from operator actions and bootstrap tooling.
            </p>

            {isPolicyAuditLoading ? (
              <div className="mt-5 space-y-3">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-16 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
                ))}
              </div>
            ) : policyAuditError ? (
              <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
                {policyAuditError instanceof Error ? policyAuditError.message : 'Failed to load policy audit log.'}
              </div>
            ) : policyChangesTotal === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
                No policy changes have been recorded yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {policyAuditLog?.map((row) => (
                  <div key={row.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {renderProfileLabel(row.actor)} updated platform policy
                        </p>
                        <p className="mt-1 text-sm text-muted">{renderPolicySummary(row)}</p>
                      </div>
                      <div className="text-xs uppercase tracking-[0.18em] text-muted">
                        {new Date(row.createdAt).toLocaleString()} · {row.source}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
