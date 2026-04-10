import { buildDocsHref } from '@/lib/site-surface';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { formatTimestamp } from '@/surfaces/app/lib/ops-formatters';
import { useOpsOverview, useOpsServiceHealth } from '@/surfaces/app/lib/ops';
import { OpsLoadingState, OpsNotice, OpsPageShell } from '@/surfaces/app/pages/dashboard/OpsPageShell';

export const OpsHealth = () => {
  const {
    data: accessProfile,
    isLoading: isAccessProfileLoading,
    error: accessProfileError,
  } = useAccessProfile();
  const operatorEnabled = Boolean(accessProfile?.isOperator);
  const {
    data: opsServiceHealth,
    error: opsServiceHealthError,
    isLoading: isOpsServiceHealthLoading,
  } = useOpsServiceHealth(operatorEnabled);
  const {
    data: opsOverview,
    error: opsOverviewError,
    isLoading: isOpsOverviewLoading,
  } = useOpsOverview(operatorEnabled);

  if (isAccessProfileLoading) {
    return <OpsLoadingState />;
  }

  if (accessProfileError) {
    return (
      <OpsNotice
        title="Health dashboard unavailable"
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

  const services = opsServiceHealth?.services ?? [];
  const onlineServices = services.filter((service) => service.status === 'online').length;
  const degradedServices = services.filter((service) => service.status === 'degraded').length;
  const errorServices = services.filter((service) => service.status === 'error').length;
  const averageLatencyMs =
    services.length > 0
      ? Math.round(
          services.reduce((total, service) => total + (service.responseTimeMs ?? 0), 0) /
            services.filter((service) => service.responseTimeMs !== null).length,
        ) || 0
      : 0;

  const orderedServices = [...services].sort((left, right) => {
    const rank = (status: string) => (status === 'error' ? 0 : status === 'degraded' ? 1 : 2);
    return rank(left.status) - rank(right.status);
  });

  return (
    <OpsPageShell
      eyebrow="Health"
      title="Watch every public surface from one reliability lane."
      description="Track service reachability, current incident state, and the docs operators should reach for before they start changing production behavior."
      metrics={[
        {
          label: 'Online',
          value: String(onlineServices),
          detail: 'Services responding normally.',
        },
        {
          label: 'Degraded',
          value: String(degradedServices),
          detail: 'Surfaces with elevated pressure.',
        },
        {
          label: 'Errors',
          value: String(errorServices),
          detail: 'Checks currently failing.',
        },
        {
          label: 'Mean latency',
          value: averageLatencyMs > 0 ? `${averageLatencyMs} ms` : '—',
          detail: 'Average across checks that returned latency.',
        },
      ]}
    >
      {opsOverview?.platform.managedMediaOperatingMode !== 'normal' ||
      (opsOverview?.platform.managedMediaIncidentMessage?.length ?? 0) > 0 ? (
        <section className="rounded-[1.75rem] border border-warning/30 bg-warning/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warning">Current advisory</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {opsOverview?.platform.managedMediaOperatingModeLabel ?? 'Managed media advisory'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-foreground/86">
            {opsOverview?.platform.managedMediaIncidentMessage || 'An operator advisory is active for the managed runtime.'}
          </p>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Service matrix</h2>
              <p className="mt-2 text-sm text-muted">
                The full set of public surfaces checked by ops, ordered with failures first.
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted">
              Checked {formatTimestamp(opsServiceHealth?.checkedAt ?? null)}
            </div>
          </div>

          {isOpsServiceHealthLoading ? (
            <div className="mt-5 space-y-3">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
              ))}
            </div>
          ) : opsServiceHealthError ? (
            <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
              {opsServiceHealthError instanceof Error ? opsServiceHealthError.message : 'Failed to load service health.'}
            </div>
          ) : orderedServices.length === 0 ? (
            <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
              No health checks are available right now.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {orderedServices.map((service) => (
                <div key={service.key} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_180px_180px] xl:items-center">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">{service.label}</h3>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
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
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">{service.url}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Latency</p>
                      <p className="mt-2 text-sm text-foreground">
                        {service.responseTimeMs !== null ? `${service.responseTimeMs} ms` : 'No latency'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-black/20 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">HTTP</p>
                      <p className="mt-2 text-sm text-foreground">
                        {service.httpStatus !== null ? `HTTP ${service.httpStatus}` : 'Unavailable'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
            <h2 className="font-display text-2xl font-bold text-foreground">Runbooks</h2>
            <p className="mt-2 text-sm text-muted">
              Operator references that matter when health shifts.
            </p>

            <div className="mt-5 space-y-3">
              {[
                { href: buildDocsHref('/guide/operator-runbook'), label: 'Operator runbook' },
                { href: buildDocsHref('/guide/cloud-product-contract'), label: 'Cloud product contract' },
                { href: buildDocsHref('/guide/client-readiness'), label: 'Client readiness' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-white/[0.035] px-4 py-4 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
                >
                  <span>{item.label}</span>
                  <span className="text-muted">Open</span>
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
            <h2 className="font-display text-2xl font-bold text-foreground">Platform snapshot</h2>
            <p className="mt-2 text-sm text-muted">
              Policy posture and counts that explain what reliability changes mean for the org.
            </p>

            {isOpsOverviewLoading ? (
              <div className="mt-5 space-y-3">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-20 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
                ))}
              </div>
            ) : opsOverviewError ? (
              <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
                {opsOverviewError instanceof Error ? opsOverviewError.message : 'Failed to load operator overview.'}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {[
                  {
                    label: 'Managed media policy',
                    value: opsOverview?.platform.managedMediaPolicyLabel ?? 'Unknown',
                  },
                  {
                    label: 'Relay access policy',
                    value: opsOverview?.platform.relayAccessPolicyLabel ?? 'Unknown',
                  },
                  {
                    label: 'Self-hosted servers',
                    value: String(opsOverview?.metrics.selfHostedServersTotal ?? 0),
                  },
                  {
                    label: 'Active relay sessions',
                    value: String(opsOverview?.metrics.activeRelaySessionsTotal ?? 0),
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </OpsPageShell>
  );
};
