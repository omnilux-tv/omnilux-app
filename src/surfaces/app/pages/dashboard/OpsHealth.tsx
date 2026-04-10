import { buildDocsHref } from '@/lib/site-surface';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { formatTimestamp } from '@/surfaces/app/lib/ops-formatters';
import { useOpsOverview, useOpsServiceHealth } from '@/surfaces/app/lib/ops';
import {
  OpsCallout,
  OpsEmptyState,
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
  opsServiceTone,
} from '@/surfaces/app/pages/dashboard/OpsPageShell';

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
    return <OpsLoadingState label="Loading service health" />;
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
    return <OpsNotice title="Operator Access Required" body="This page is reserved for internal OmniLux operator accounts." />;
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
      eyebrow="Service Health"
      title="Track every public OmniLux surface from one reliability lane."
      description="Health checks, incident context, and the runbooks operators should reach for are laid out as a single operational view instead of scattered status cards."
      metrics={[
        {
          label: 'Online',
          value: String(onlineServices),
          detail: 'Services responding normally.',
          tone: 'success',
        },
        {
          label: 'Degraded',
          value: String(degradedServices),
          detail: 'Surfaces with elevated pressure.',
          tone: degradedServices > 0 ? 'warning' : 'neutral',
        },
        {
          label: 'Errors',
          value: String(errorServices),
          detail: 'Checks currently failing.',
          tone: errorServices > 0 ? 'danger' : 'neutral',
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
        <OpsCallout
          tone="warning"
          title={opsOverview?.platform.managedMediaOperatingModeLabel ?? 'Managed media advisory'}
          body={
            opsOverview?.platform.managedMediaIncidentMessage ||
            'An operator advisory is active for the managed runtime.'
          }
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <OpsPanel
          title="Service matrix"
          description="Public surfaces ordered with failures first, including latency and HTTP status for each probe."
          meta={opsServiceHealth?.checkedAt ? `Checked ${formatTimestamp(opsServiceHealth.checkedAt)}` : 'Waiting for probe data'}
        >
          {isOpsServiceHealthLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : opsServiceHealthError ? (
            <OpsNotice
              title="Service matrix unavailable"
              body={
                opsServiceHealthError instanceof Error
                  ? opsServiceHealthError.message
                  : 'Failed to load service health.'
              }
              tone="danger"
            />
          ) : orderedServices.length === 0 ? (
            <OpsEmptyState title="No health checks available" body="No service probes are reporting yet." />
          ) : (
            <OpsTable>
              <OpsTableHead>
                <tr>
                  <OpsTableHeaderCell>Service</OpsTableHeaderCell>
                  <OpsTableHeaderCell>Status</OpsTableHeaderCell>
                  <OpsTableHeaderCell>Endpoint</OpsTableHeaderCell>
                  <OpsTableHeaderCell align="right">Latency</OpsTableHeaderCell>
                  <OpsTableHeaderCell align="right">HTTP</OpsTableHeaderCell>
                </tr>
              </OpsTableHead>
              <OpsTableBody>
                {orderedServices.map((service) => (
                  <OpsTableRow key={service.key}>
                    <OpsTableCell>
                      <p className="font-medium text-foreground">{service.label}</p>
                      <p className="mt-1 text-sm text-muted">{service.detail}</p>
                    </OpsTableCell>
                    <OpsTableCell>
                      <OpsStatusBadge tone={opsServiceTone(service.status)}>{service.status}</OpsStatusBadge>
                    </OpsTableCell>
                    <OpsTableCell className="font-mono text-xs text-muted">{service.url}</OpsTableCell>
                    <OpsTableCell align="right" className="font-mono text-muted">
                      {service.responseTimeMs !== null ? `${service.responseTimeMs} ms` : 'n/a'}
                    </OpsTableCell>
                    <OpsTableCell align="right" className="font-mono text-muted">
                      {service.httpStatus !== null ? `HTTP ${service.httpStatus}` : 'n/a'}
                    </OpsTableCell>
                  </OpsTableRow>
                ))}
              </OpsTableBody>
            </OpsTable>
          )}
        </OpsPanel>

        <div className="space-y-4">
          <OpsPanel title="Runbooks" description="Operator references that matter when service posture shifts.">
            <div className="space-y-3">
              {[
                { href: buildDocsHref('/guide/operator-runbook'), label: 'Operator runbook' },
                { href: buildDocsHref('/guide/cloud-product-contract'), label: 'Cloud product contract' },
                { href: buildDocsHref('/guide/client-readiness'), label: 'Client readiness' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-lg border border-border bg-panel-muted px-4 py-3 text-sm transition-colors hover:bg-card-hover"
                >
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted">Open</span>
                </a>
              ))}
            </div>
          </OpsPanel>

          <OpsPanel
            title="Platform snapshot"
            description="Policy posture and counts that explain the operator impact of reliability changes."
          >
            {isOpsOverviewLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-18 animate-pulse rounded-lg bg-white/[0.04]" />
                ))}
              </div>
            ) : opsOverviewError ? (
              <OpsNotice
                title="Platform snapshot unavailable"
                body={
                  opsOverviewError instanceof Error
                    ? opsOverviewError.message
                    : 'Failed to load operator overview.'
                }
                tone="danger"
              />
            ) : (
              <div className="space-y-3">
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
                  <div key={item.label} className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </OpsPanel>
        </div>
      </div>
    </OpsPageShell>
  );
};
