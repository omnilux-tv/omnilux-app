import { Link } from '@tanstack/react-router';
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
  opsButtonClassName,
  opsServiceTone,
} from '@/surfaces/app/pages/dashboard/OpsPageShell';

const runtimeStatusLabel = (value: string | null | undefined) => value?.replaceAll('-', ' ') ?? 'Unknown';
const runtimeTone = (value: string | null | undefined) => {
  const normalized = (value ?? '').toLowerCase();
  if (normalized.includes('online') || normalized.includes('connected')) return 'success' as const;
  if (normalized.includes('degraded') || normalized.includes('attention')) return 'warning' as const;
  if (normalized.includes('offline') || normalized.includes('error')) return 'danger' as const;
  return 'neutral' as const;
};

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
    return <OpsLoadingState label="Loading managed runtime lane" />;
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
    return <OpsNotice title="Operator Access Required" body="This page is reserved for internal OmniLux operator accounts." />;
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
      eyebrow="Managed Runtime"
      title="Operate the managed runtime like a real service."
      description="Keep `media.omnilux.tv`, its supporting relay path, and its current advisory state in one operational lane instead of burying runtime posture inside a generic dashboard."
      metrics={[
        {
          label: 'Operating mode',
          value: opsOverview?.platform.managedMediaOperatingModeLabel ?? 'Loading',
          detail: 'Current managed runtime state.',
          tone:
            opsOverview?.platform.managedMediaOperatingMode === 'normal'
              ? 'success'
              : opsOverview?.platform.managedMediaOperatingMode
                ? 'warning'
                : 'neutral',
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
          tone: runtimeTone(managedRuntime?.relayStatus),
        },
        {
          label: 'Version',
          value: managedRuntime?.version ?? 'Unknown',
          detail: 'Most recent runtime build seen by ops.',
        },
      ]}
    >
      {managedMediaIncidentActive ? (
        <OpsCallout
          tone="warning"
          title={opsOverview?.platform.managedMediaOperatingModeLabel ?? 'Managed media advisory'}
          body={
            opsOverview?.platform.managedMediaIncidentMessage ||
            'An operator advisory is active for the managed runtime.'
          }
          action={
            <Link to="/dashboard/control-plane" className={opsButtonClassName({ tone: 'secondary' })}>
              Update advisory
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <OpsPanel
          title="Runtime snapshot"
          description="The managed media runtime, how recently it reported in, and how it is exposed to the public edge."
          meta={`Managed runtime ${managedRuntime ? 'registered' : 'missing'}`}
        >
          {isOpsOverviewLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-20 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : opsOverviewError ? (
            <OpsNotice
              title="Runtime snapshot unavailable"
              body={opsOverviewError instanceof Error ? opsOverviewError.message : 'Failed to load runtime posture.'}
              tone="danger"
            />
          ) : !managedRuntime ? (
            <OpsEmptyState title="No managed runtime registered" body="No managed media runtime is currently registered in the operator overview." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Runtime identity</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{managedRuntime.name}</p>
                <p className="mt-1 font-mono text-xs text-muted">{managedRuntime.id}</p>
                <div className="mt-4 space-y-2 text-sm text-muted">
                  <p>
                    Public origin <span className="text-foreground">{managedRuntime.publicOrigin ?? 'Unavailable'}</span>
                  </p>
                  <p>
                    Relay status <span className="text-foreground">{runtimeStatusLabel(managedRuntime.relayStatus)}</span>
                  </p>
                  <p>
                    Version <span className="text-foreground">{managedRuntime.version ?? 'Unknown'}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Heartbeat</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-black/10 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Last seen</p>
                    <p className="mt-1 text-sm text-foreground">{formatTimestamp(managedRuntime.lastSeenAt)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-black/10 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Relay connected</p>
                    <p className="mt-1 text-sm text-foreground">{formatTimestamp(managedRuntime.relayLastConnectedAt)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-black/10 px-3 py-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Config updated</p>
                    <p className="mt-1 text-sm text-foreground">{formatTimestamp(managedRuntime.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </OpsPanel>

        <div className="space-y-4">
          <OpsPanel title="Runbooks" description="References that define the hosted product and operator response.">
            <div className="space-y-3">
              {[
                { href: buildDocsHref('/guide/managed-media'), label: 'Managed media guide' },
                { href: buildDocsHref('/guide/operator-runbook'), label: 'Operator runbook' },
                { href: buildDocsHref('/guide/cloud-product-contract'), label: 'Cloud product contract' },
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
            title="Operator posture"
            description="Platform policies and runtime health that shape customer impact."
          >
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Managed media access</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {opsOverview?.platform.managedMediaPolicyLabel ?? 'Unknown'}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {opsOverview?.platform.managedMediaPolicyDescription ?? 'Policy description unavailable.'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Relay access</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {opsOverview?.platform.relayAccessPolicyLabel ?? 'Unknown'}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {opsOverview?.platform.relayAccessPolicyDescription ?? 'Relay policy description unavailable.'}
                </p>
              </div>
            </div>
          </OpsPanel>
        </div>
      </div>

      <OpsPanel
        title="Supporting surfaces"
        description="Public services that the managed runtime depends on to stay healthy."
        meta={`${supportingServices.length} monitored surfaces`}
      >
        {isOpsServiceHealthLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : opsServiceHealthError ? (
          <OpsNotice
            title="Supporting surfaces unavailable"
            body={
              opsServiceHealthError instanceof Error
                ? opsServiceHealthError.message
                : 'Failed to load service health.'
            }
            tone="danger"
          />
        ) : supportingServices.length === 0 ? (
          <OpsEmptyState title="No supporting surface checks" body="No supporting surface checks are available right now." />
        ) : (
          <OpsTable>
            <OpsTableHead>
              <tr>
                <OpsTableHeaderCell>Surface</OpsTableHeaderCell>
                <OpsTableHeaderCell>Status</OpsTableHeaderCell>
                <OpsTableHeaderCell>Detail</OpsTableHeaderCell>
                <OpsTableHeaderCell align="right">Latency</OpsTableHeaderCell>
              </tr>
            </OpsTableHead>
            <OpsTableBody>
              {supportingServices.map((service) => (
                <OpsTableRow key={service.key}>
                  <OpsTableCell>{service.label}</OpsTableCell>
                  <OpsTableCell>
                    <OpsStatusBadge tone={opsServiceTone(service.status)}>{service.status}</OpsStatusBadge>
                  </OpsTableCell>
                  <OpsTableCell className="text-muted">{service.detail}</OpsTableCell>
                  <OpsTableCell align="right" className="font-mono text-muted">
                    {service.responseTimeMs !== null ? `${service.responseTimeMs} ms` : 'n/a'}
                  </OpsTableCell>
                </OpsTableRow>
              ))}
            </OpsTableBody>
          </OpsTable>
        )}
      </OpsPanel>
    </OpsPageShell>
  );
};
