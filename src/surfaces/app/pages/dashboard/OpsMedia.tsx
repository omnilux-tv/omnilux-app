import { Link } from '@tanstack/react-router';
import { buildDocsHref } from '@/lib/site-surface';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { formatTimestamp } from '@/surfaces/app/lib/ops-formatters';
import { useOpsOverview, useOpsServiceHealth } from '@/surfaces/app/lib/ops';
import { OpsLoadingState, OpsNotice, OpsPageShell } from '@/surfaces/app/pages/dashboard/OpsPageShell';

const runtimeStatusLabel = (value: string | null | undefined) => value?.replaceAll('-', ' ') ?? 'Unknown';

export const OpsMedia = () => {
  const {
    data: accessProfile,
    isLoading: isAccessProfileLoading,
    error: accessProfileError,
  } = useAccessProfile();
  const operatorEnabled = Boolean(accessProfile?.isOperator);
  const {
    data: opsOverview,
    error: opsOverviewError,
    isLoading: isOpsOverviewLoading,
  } = useOpsOverview(operatorEnabled);
  const {
    data: opsServiceHealth,
    error: opsServiceHealthError,
    isLoading: isOpsServiceHealthLoading,
  } = useOpsServiceHealth(operatorEnabled);

  if (isAccessProfileLoading) {
    return <OpsLoadingState />;
  }

  if (accessProfileError) {
    return (
      <OpsNotice
        title="Media operations unavailable"
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

  const managedRuntime = opsOverview?.managedMediaRuntime ?? null;
  const managedMediaIncidentActive =
    opsOverview?.platform.managedMediaOperatingMode !== 'normal' ||
    (opsOverview?.platform.managedMediaIncidentMessage?.length ?? 0) > 0;
  const supportingServices =
    opsServiceHealth?.services.filter((service) =>
      ['media', 'relay', 'api', 'app', 'ops'].some((token) => service.key.includes(token)),
    ) ?? [];

  return (
    <OpsPageShell
      eyebrow="Media"
      title="Operate the managed runtime like a real service."
      description="Keep `media.omnilux.tv`, its supporting relay path, and its current advisory state in one operational lane instead of burying runtime posture inside a generic dashboard."
      metrics={[
        {
          label: 'Operating mode',
          value: opsOverview?.platform.managedMediaOperatingModeLabel ?? 'Loading',
          detail: 'Current managed runtime state.',
        },
        {
          label: 'Runtime origin',
          value: managedRuntime?.publicOrigin ?? 'Unavailable',
          detail: 'Public endpoint for the managed media runtime.',
        },
        {
          label: 'Relay status',
          value: runtimeStatusLabel(managedRuntime?.relayStatus),
          detail: 'Last known relay posture for the runtime.',
        },
        {
          label: 'Version',
          value: managedRuntime?.version ?? 'Unknown',
          detail: 'Most recent runtime build seen by ops.',
        },
      ]}
    >
      {managedMediaIncidentActive ? (
        <section className="rounded-[1.75rem] border border-warning/30 bg-warning/10 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warning">Advisory live</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                {opsOverview?.platform.managedMediaOperatingModeLabel ?? 'Managed media advisory'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-foreground/86">
                {opsOverview?.platform.managedMediaIncidentMessage || 'An operator advisory is active for the managed runtime.'}
              </p>
            </div>
            <Link
              to="/dashboard/control-plane"
              className="inline-flex rounded-full border border-warning/40 bg-warning/12 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-warning/18"
            >
              Update advisory
            </Link>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Runtime snapshot</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                The managed media runtime, how recently it reported in, and how it is exposed to the public edge.
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted">
              Managed runtime {managedRuntime ? 'Registered' : 'Missing'}
            </div>
          </div>

          {isOpsOverviewLoading ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="h-32 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
              ))}
            </div>
          ) : opsOverviewError ? (
            <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
              {opsOverviewError instanceof Error ? opsOverviewError.message : 'Failed to load media runtime posture.'}
            </div>
          ) : !managedRuntime ? (
            <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
              No managed media runtime is currently registered in the operator overview.
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Runtime identity</p>
                  <h3 className="mt-3 text-xl font-semibold text-foreground">{managedRuntime.name}</h3>
                  <p className="mt-2 text-sm text-muted">{managedRuntime.id}</p>
                  <div className="mt-5 space-y-3 text-sm text-muted">
                    <p>Public origin: <span className="text-foreground">{managedRuntime.publicOrigin ?? 'Unavailable'}</span></p>
                    <p>Relay status: <span className="text-foreground">{runtimeStatusLabel(managedRuntime.relayStatus)}</span></p>
                    <p>Version: <span className="text-foreground">{managedRuntime.version ?? 'Unknown'}</span></p>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Heartbeat</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Last seen</p>
                      <p className="mt-2 text-sm text-foreground">{formatTimestamp(managedRuntime.lastSeenAt)}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Relay connected</p>
                      <p className="mt-2 text-sm text-foreground">
                        {formatTimestamp(managedRuntime.relayLastConnectedAt)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-black/20 p-4 sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Config updated</p>
                      <p className="mt-2 text-sm text-foreground">{formatTimestamp(managedRuntime.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Operator posture</h3>
                    <p className="mt-2 text-sm text-muted">
                      Managed media follows the platform rule below. Change the advisory or entitlement model from the
                      control plane when customer impact changes.
                    </p>
                  </div>
                  <Link
                    to="/dashboard/control-plane"
                    className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                  >
                    Open control plane
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[1.25rem] bg-black/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Managed media access</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {opsOverview?.platform.managedMediaPolicyLabel ?? 'Unknown'}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {opsOverview?.platform.managedMediaPolicyDescription ?? 'Policy description unavailable.'}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-black/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Relay access</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {opsOverview?.platform.relayAccessPolicyLabel ?? 'Unknown'}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {opsOverview?.platform.relayAccessPolicyDescription ?? 'Relay policy description unavailable.'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <h2 className="font-display text-2xl font-bold text-foreground">Runbooks</h2>
          <p className="mt-2 text-sm text-muted">
            Keep operator behavior anchored to the docs that define the hosted product.
          </p>
          <div className="mt-5 space-y-3">
            {[
              { href: buildDocsHref('/guide/managed-media'), label: 'Managed media guide' },
              { href: buildDocsHref('/guide/operator-runbook'), label: 'Operator runbook' },
              { href: buildDocsHref('/guide/cloud-product-contract'), label: 'Cloud product contract' },
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
      </div>

      <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Supporting surfaces</h2>
            <p className="mt-2 text-sm text-muted">
              The public services that the managed runtime depends on to stay healthy.
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.18em] text-muted">
            {supportingServices.length} monitored surfaces
          </span>
        </div>

        {isOpsServiceHealthLoading ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="h-28 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
            ))}
          </div>
        ) : opsServiceHealthError ? (
          <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
            {opsServiceHealthError instanceof Error ? opsServiceHealthError.message : 'Failed to load service health.'}
          </div>
        ) : supportingServices.length === 0 ? (
          <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
            No supporting surface checks are available right now.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {supportingServices.map((service) => (
              <div key={service.key} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{service.label}</p>
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
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
                  {service.responseTimeMs !== null ? `${service.responseTimeMs} ms` : 'Internal check'} ·{' '}
                  {service.httpStatus !== null ? `HTTP ${service.httpStatus}` : 'No status'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </OpsPageShell>
  );
};
