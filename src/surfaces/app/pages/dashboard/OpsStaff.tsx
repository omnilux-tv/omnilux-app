import { useMemo } from 'react';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { formatTimestamp, toTimestamp } from '@/surfaces/app/lib/ops-formatters';
import { useOperatorAccessProfiles } from '@/surfaces/app/lib/ops';
import {
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
} from '@/surfaces/app/pages/dashboard/OpsPageShell';

const assuranceTone = (value: string | null | undefined) => {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'aal2') return 'success' as const;
  if (normalized.length === 0) return 'neutral' as const;
  return 'warning' as const;
};

export const OpsStaff = () => {
  const {
    data: accessProfile,
    isLoading: isAccessProfileLoading,
    error: accessProfileError,
  } = useAccessProfile();
  const operatorEnabled = Boolean(accessProfile?.isOperator);
  const { data: profiles, error, isLoading } = useOperatorAccessProfiles(operatorEnabled);

  const staffProfiles = useMemo(
    () =>
      [...(profiles ?? [])]
        .filter((profile) => profile.isOperator)
        .sort((a, b) => toTimestamp(b.lastSignInAt) - toTimestamp(a.lastSignInAt)),
    [profiles],
  );
  const staffAal2Count = useMemo(
    () => staffProfiles.filter((profile) => profile.sessionAssuranceLevel === 'aal2').length,
    [staffProfiles],
  );
  const recentlyActiveStaffCount = useMemo(
    () =>
      staffProfiles.filter((profile) => {
        const lastSignIn = toTimestamp(profile.lastSignInAt);
        return lastSignIn > Date.now() - 1000 * 60 * 60 * 24 * 7;
      }).length,
    [staffProfiles],
  );

  if (isAccessProfileLoading) {
    return <OpsLoadingState label="Loading operator roster" />;
  }

  if (accessProfileError) {
    return (
      <OpsNotice
        title="Operator roster unavailable"
        body={accessProfileError instanceof Error ? accessProfileError.message : 'Failed to load access profile.'}
        tone="danger"
      />
    );
  }

  if (!accessProfile?.isOperator) {
    return <OpsNotice title="Operator Access Required" body="This page is reserved for internal OmniLux operator accounts." />;
  }

  return (
    <OpsPageShell
      eyebrow="Operators"
      title="Keep the operator bench visible."
      description="Watch who has operator privileges, who is MFA-ready, and which sessions are current enough to trust for live incident work."
      metrics={[
        {
          label: 'Operators',
          value: String(staffProfiles.length),
          detail: 'Internal OmniLux operator accounts.',
        },
        {
          label: 'MFA ready',
          value: String(staffAal2Count),
          detail: 'Sessions currently at AAL2.',
          tone: staffAal2Count === staffProfiles.length ? 'success' : 'warning',
        },
        {
          label: 'Seen this week',
          value: String(recentlyActiveStaffCount),
          detail: 'Recently active operator sessions.',
        },
        {
          label: 'Needs step-up',
          value: String(staffProfiles.length - staffAal2Count),
          detail: 'Operators that need MFA before sensitive changes.',
          tone: staffProfiles.length - staffAal2Count > 0 ? 'warning' : 'neutral',
        },
      ]}
    >
      <OpsPanel
        title="Operator roster"
        description="Track live operator posture before handing someone the control plane or customer account actions."
        meta="The last operator cannot be demoted from the accounts page."
      >
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : error ? (
          <OpsNotice
            title="Operator roster unavailable"
            body={error instanceof Error ? error.message : 'Failed to load operator roster.'}
            tone="danger"
          />
        ) : staffProfiles.length === 0 ? (
          <OpsEmptyState title="No operator accounts" body="No operator accounts are registered yet." />
        ) : (
          <OpsTable>
            <OpsTableHead>
              <tr>
                <OpsTableHeaderCell>Operator</OpsTableHeaderCell>
                <OpsTableHeaderCell>Session assurance</OpsTableHeaderCell>
                <OpsTableHeaderCell>Managed media</OpsTableHeaderCell>
                <OpsTableHeaderCell>Session expiry</OpsTableHeaderCell>
                <OpsTableHeaderCell align="right">Last sign-in</OpsTableHeaderCell>
              </tr>
            </OpsTableHead>
            <OpsTableBody>
              {staffProfiles.map((profile) => (
                <OpsTableRow key={profile.id}>
                  <OpsTableCell>
                    <p className="font-medium text-foreground">{profile.displayName || profile.email || profile.id}</p>
                    <p className="mt-1 text-sm text-muted">{profile.email || profile.id}</p>
                  </OpsTableCell>
                  <OpsTableCell>
                    <OpsStatusBadge tone={assuranceTone(profile.sessionAssuranceLevel)}>
                      {profile.sessionAssuranceLevel?.toUpperCase() ?? 'No AAL'}
                    </OpsStatusBadge>
                  </OpsTableCell>
                  <OpsTableCell>
                    <OpsStatusBadge tone={profile.managedMediaEntitled ? 'info' : 'neutral'}>
                      {profile.managedMediaEntitled ? 'Enabled' : 'Disabled'}
                    </OpsStatusBadge>
                  </OpsTableCell>
                  <OpsTableCell className="text-muted">{formatTimestamp(profile.sessionExpiresAt)}</OpsTableCell>
                  <OpsTableCell align="right" className="text-muted">
                    {formatTimestamp(profile.lastSignInAt)}
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
