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
import {
  OpsEmptyState,
  OpsLoadingState,
  OpsNotice,
  OpsPageShell,
  OpsPanel,
  OpsTable,
  OpsTableBody,
  OpsTableCell,
  OpsTableHead,
  OpsTableHeaderCell,
  OpsTableRow,
} from '@/surfaces/app/pages/dashboard/OpsPageShell';

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
    return <OpsLoadingState label="Loading audit surfaces" />;
  }

  if (accessProfileError) {
    return (
      <OpsNotice
        title="Audit trail unavailable"
        body={accessProfileError instanceof Error ? accessProfileError.message : 'Failed to load access profile.'}
        tone="danger"
      />
    );
  }

  if (!accessProfile?.isOperator) {
    return <OpsNotice title="Operator Access Required" body="This page is reserved for internal OmniLux operator accounts." />;
  }

  const operatorActionsTotal = operatorActionAuditLog?.length ?? 0;
  const accessChangesTotal = accessAuditLog?.length ?? 0;
  const policyChangesTotal = policyAuditLog?.length ?? 0;

  return (
    <OpsPageShell
      eyebrow="Audit Trail"
      title="Investigate every privileged action in one place."
      description="Operator activity, account access changes, and platform policy edits are grouped into distinct evidence lanes so investigations stay fast and traceable."
      metrics={[
        {
          label: 'Sensitive actions',
          value: String(operatorActionsTotal),
          detail: 'High-impact operator activity.',
        },
        {
          label: 'Access changes',
          value: String(accessChangesTotal),
          detail: 'Managed media and operator permission changes.',
        },
        {
          label: 'Policy changes',
          value: String(policyChangesTotal),
          detail: 'Managed media and relay rule updates.',
        },
        {
          label: 'Latest event',
          value:
            operatorActionAuditLog?.[0]?.createdAt
              ? new Date(operatorActionAuditLog[0].createdAt).toLocaleDateString()
              : '—',
          detail: 'Most recent sensitive action date.',
        },
      ]}
    >
      <OpsPanel
        title="Operator activity"
        description="Sensitive account lookups, relay revocations, note writes, and platform changes."
        meta={isOperatorActionAuditLoading ? 'Refreshing' : `${operatorActionsTotal} events`}
      >
        {isOperatorActionAuditLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : operatorActionAuditError ? (
          <OpsNotice
            title="Operator activity unavailable"
            body={
              operatorActionAuditError instanceof Error
                ? operatorActionAuditError.message
                : 'Failed to load sensitive operator activity.'
            }
            tone="danger"
          />
        ) : operatorActionsTotal === 0 ? (
          <OpsEmptyState
            title="No sensitive operator actions"
            body="High-impact activity will appear here as soon as an operator performs an audited action."
          />
        ) : (
          <OpsTable>
            <OpsTableHead>
              <tr>
                <OpsTableHeaderCell>Action</OpsTableHeaderCell>
                <OpsTableHeaderCell>Actor</OpsTableHeaderCell>
                <OpsTableHeaderCell>Detail</OpsTableHeaderCell>
                <OpsTableHeaderCell align="right">When</OpsTableHeaderCell>
              </tr>
            </OpsTableHead>
            <OpsTableBody>
              {operatorActionAuditLog?.map((row) => (
                <OpsTableRow key={row.id}>
                  <OpsTableCell>
                    <p className="font-medium text-foreground">{renderOperatorActionSummary(row)}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{row.source}</p>
                  </OpsTableCell>
                  <OpsTableCell>{renderProfileLabel(row.actor)}</OpsTableCell>
                  <OpsTableCell className="text-muted">{renderOperatorActionDetail(row)}</OpsTableCell>
                  <OpsTableCell align="right" className="text-muted">
                    {new Date(row.createdAt).toLocaleString()}
                  </OpsTableCell>
                </OpsTableRow>
              ))}
            </OpsTableBody>
          </OpsTable>
        )}
      </OpsPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <OpsPanel
          title="Account access changes"
          description="Managed media entitlements and operator access changes across customer accounts."
          meta={isAccessAuditLoading ? 'Refreshing' : `${accessChangesTotal} events`}
        >
          {isAccessAuditLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : accessAuditError ? (
            <OpsNotice
              title="Access log unavailable"
              body={accessAuditError instanceof Error ? accessAuditError.message : 'Failed to load access audit log.'}
              tone="danger"
            />
          ) : accessChangesTotal === 0 ? (
            <OpsEmptyState title="No access changes" body="Entitlement changes will appear here once they are recorded." />
          ) : (
            <OpsTable>
              <OpsTableHead>
                <tr>
                  <OpsTableHeaderCell>Target</OpsTableHeaderCell>
                  <OpsTableHeaderCell>Actor</OpsTableHeaderCell>
                  <OpsTableHeaderCell>Change</OpsTableHeaderCell>
                  <OpsTableHeaderCell align="right">When</OpsTableHeaderCell>
                </tr>
              </OpsTableHead>
              <OpsTableBody>
                {accessAuditLog?.map((row) => (
                  <OpsTableRow key={row.id}>
                    <OpsTableCell>{renderProfileLabel(row.target)}</OpsTableCell>
                    <OpsTableCell>{renderProfileLabel(row.actor)}</OpsTableCell>
                    <OpsTableCell className="text-muted">{renderAuditSummary(row)}</OpsTableCell>
                    <OpsTableCell align="right" className="text-muted">
                      {new Date(row.createdAt).toLocaleString()}
                    </OpsTableCell>
                  </OpsTableRow>
                ))}
              </OpsTableBody>
            </OpsTable>
          )}
        </OpsPanel>

        <OpsPanel
          title="Control-plane changes"
          description="Managed media and relay policy edits recorded from operator actions and bootstrap tooling."
          meta={isPolicyAuditLoading ? 'Refreshing' : `${policyChangesTotal} events`}
        >
          {isPolicyAuditLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : policyAuditError ? (
            <OpsNotice
              title="Policy log unavailable"
              body={
                policyAuditError instanceof Error
                  ? policyAuditError.message
                  : 'Failed to load policy audit log.'
              }
              tone="danger"
            />
          ) : policyChangesTotal === 0 ? (
            <OpsEmptyState
              title="No control-plane changes"
              body="Policy edits will appear here once managed media or relay rules are updated."
            />
          ) : (
            <OpsTable>
              <OpsTableHead>
                <tr>
                  <OpsTableHeaderCell>Actor</OpsTableHeaderCell>
                  <OpsTableHeaderCell>Change</OpsTableHeaderCell>
                  <OpsTableHeaderCell>Source</OpsTableHeaderCell>
                  <OpsTableHeaderCell align="right">When</OpsTableHeaderCell>
                </tr>
              </OpsTableHead>
              <OpsTableBody>
                {policyAuditLog?.map((row) => (
                  <OpsTableRow key={row.id}>
                    <OpsTableCell>{renderProfileLabel(row.actor)}</OpsTableCell>
                    <OpsTableCell className="text-muted">{renderPolicySummary(row)}</OpsTableCell>
                    <OpsTableCell className="text-muted">{row.source}</OpsTableCell>
                    <OpsTableCell align="right" className="text-muted">
                      {new Date(row.createdAt).toLocaleString()}
                    </OpsTableCell>
                  </OpsTableRow>
                ))}
              </OpsTableBody>
            </OpsTable>
          )}
        </OpsPanel>
      </div>
    </OpsPageShell>
  );
};
