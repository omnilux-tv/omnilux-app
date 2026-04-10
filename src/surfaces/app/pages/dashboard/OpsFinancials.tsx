import { Link } from '@tanstack/react-router';
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

const normalizeSubscriptionStatus = (value: string | null | undefined) => (value ?? 'unknown').toLowerCase();

const billingTone = (value: string | null | undefined) => {
  const normalized = normalizeSubscriptionStatus(value);
  if (normalized === 'active') return 'success' as const;
  if (normalized === 'trialing') return 'info' as const;
  if (normalized === 'unknown') return 'neutral' as const;
  return 'warning' as const;
};

export const OpsFinancials = () => {
  const {
    data: accessProfile,
    isLoading: isAccessProfileLoading,
    error: accessProfileError,
  } = useAccessProfile();
  const operatorEnabled = Boolean(accessProfile?.isOperator);
  const { data: profiles, error, isLoading } = useOperatorAccessProfiles(operatorEnabled);

  const subscribedProfiles = useMemo(
    () =>
      [...(profiles ?? [])]
        .filter((profile) => profile.subscription)
        .sort(
          (left, right) =>
            toTimestamp(right.subscription?.updatedAt ?? right.updatedAt) -
            toTimestamp(left.subscription?.updatedAt ?? left.updatedAt),
        ),
    [profiles],
  );

  const activePlans = useMemo(
    () => subscribedProfiles.filter((profile) => normalizeSubscriptionStatus(profile.subscription?.status) === 'active'),
    [subscribedProfiles],
  );
  const trialPlans = useMemo(
    () =>
      subscribedProfiles.filter((profile) => normalizeSubscriptionStatus(profile.subscription?.status) === 'trialing'),
    [subscribedProfiles],
  );
  const attentionPlans = useMemo(
    () =>
      subscribedProfiles.filter((profile) => {
        const status = normalizeSubscriptionStatus(profile.subscription?.status);
        return status !== 'active' && status !== 'trialing';
      }),
    [subscribedProfiles],
  );
  const renewalQueue = useMemo(
    () =>
      [...subscribedProfiles]
        .filter((profile) => Boolean(profile.subscription?.currentPeriodEnd))
        .sort(
          (left, right) =>
            toTimestamp(left.subscription?.currentPeriodEnd) - toTimestamp(right.subscription?.currentPeriodEnd),
        )
        .slice(0, 8),
    [subscribedProfiles],
  );
  const coverageGapProfiles = useMemo(
    () => [...(profiles ?? [])].filter((profile) => !profile.subscription).slice(0, 8),
    [profiles],
  );

  if (isAccessProfileLoading) {
    return <OpsLoadingState label="Loading financial lane" />;
  }

  if (accessProfileError) {
    return (
      <OpsNotice
        title="Financial data unavailable"
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
      eyebrow="Financials"
      title="Track billing posture without leaving ops."
      description="Revenue posture, renewal timing, and billing follow-up live in one analytical lane so support and finance context stay tied to the same customer record."
      metrics={[
        {
          label: 'Active plans',
          value: String(activePlans.length),
          detail: 'Accounts currently in good standing.',
          tone: 'success',
        },
        {
          label: 'Trials',
          value: String(trialPlans.length),
          detail: 'Customers still inside onboarding runway.',
          tone: trialPlans.length > 0 ? 'info' : 'neutral',
        },
        {
          label: 'Needs follow-up',
          value: String(attentionPlans.length),
          detail: 'Subscriptions not active or trialing.',
          tone: attentionPlans.length > 0 ? 'warning' : 'neutral',
        },
        {
          label: 'No paid plan',
          value: String((profiles?.length ?? 0) - subscribedProfiles.length),
          detail: 'Accounts with no subscription record.',
        },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <OpsPanel
          title="Billing ledger"
          description="Recent subscription records, renewal timing, and direct paths back into account operations."
          meta={isLoading ? 'Refreshing' : `${subscribedProfiles.length} subscription accounts`}
        >
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : error ? (
            <OpsNotice
              title="Billing ledger unavailable"
              body={error instanceof Error ? error.message : 'Failed to load subscription posture.'}
              tone="danger"
            />
          ) : subscribedProfiles.length === 0 ? (
            <OpsEmptyState title="No subscription records" body="No subscription records are attached to cloud accounts yet." />
          ) : (
            <OpsTable>
              <OpsTableHead>
                <tr>
                  <OpsTableHeaderCell>Account</OpsTableHeaderCell>
                  <OpsTableHeaderCell>Plan</OpsTableHeaderCell>
                  <OpsTableHeaderCell>Renewal</OpsTableHeaderCell>
                  <OpsTableHeaderCell align="right">Updated</OpsTableHeaderCell>
                </tr>
              </OpsTableHead>
              <OpsTableBody>
                {subscribedProfiles.slice(0, 14).map((profile) => (
                  <OpsTableRow key={profile.id}>
                    <OpsTableCell>
                      <p className="font-medium text-foreground">{profile.displayName || profile.email || profile.id}</p>
                      <p className="mt-1 text-sm text-muted">{profile.email || profile.id}</p>
                    </OpsTableCell>
                    <OpsTableCell>
                      <OpsStatusBadge tone={billingTone(profile.subscription?.status)}>
                        {profile.subscription?.tier ?? 'Unknown'} · {profile.subscription?.status ?? 'Unknown'}
                      </OpsStatusBadge>
                    </OpsTableCell>
                    <OpsTableCell className="text-muted">
                      {formatTimestamp(profile.subscription?.currentPeriodEnd ?? null)}
                    </OpsTableCell>
                    <OpsTableCell align="right">
                      <div className="space-y-2 text-right">
                        <p className="text-muted">
                          {formatTimestamp(profile.subscription?.updatedAt ?? profile.updatedAt)}
                        </p>
                        <Link
                          to="/dashboard/accounts"
                          search={{ lookup: profile.email ?? profile.id } as never}
                          className="text-xs font-medium uppercase tracking-[0.16em] text-info hover:text-foreground"
                        >
                          Review account
                        </Link>
                      </div>
                    </OpsTableCell>
                  </OpsTableRow>
                ))}
              </OpsTableBody>
            </OpsTable>
          )}
        </OpsPanel>

        <div className="space-y-4">
          <OpsPanel title="Renewal queue" description="Accounts with the nearest upcoming period end.">
            {renewalQueue.length === 0 ? (
              <OpsEmptyState title="No upcoming renewals" body="No upcoming renewals are scheduled yet." />
            ) : (
              <div className="space-y-3">
                {renewalQueue.map((profile) => (
                  <div key={profile.id} className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                    <p className="text-sm font-medium text-foreground">
                      {profile.displayName || profile.email || profile.id}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {profile.subscription?.tier ?? 'Unknown'} · {profile.subscription?.status ?? 'Unknown'}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">
                      {formatTimestamp(profile.subscription?.currentPeriodEnd ?? null)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </OpsPanel>

          <OpsPanel title="Attention queue" description="Accounts with billing status outside active or trialing.">
            {attentionPlans.length === 0 ? (
              <OpsEmptyState title="No billing follow-up needed" body="No billing follow-up is needed right now." />
            ) : (
              <div className="space-y-3">
                {attentionPlans.slice(0, 8).map((profile) => (
                  <div key={profile.id} className="rounded-lg border border-border bg-panel-muted px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {profile.displayName || profile.email || profile.id}
                        </p>
                        <p className="mt-1 text-sm text-muted">{profile.email || profile.id}</p>
                      </div>
                      <OpsStatusBadge tone={billingTone(profile.subscription?.status)}>
                        {profile.subscription?.status ?? 'Unknown'}
                      </OpsStatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </OpsPanel>
        </div>
      </div>

      <OpsPanel title="Coverage gap" description="Accounts without a billing record attached.">
        {coverageGapProfiles.length === 0 ? (
          <OpsEmptyState title="No coverage gap" body="Every visible account already has a subscription record." />
        ) : (
          <OpsTable>
            <OpsTableHead>
              <tr>
                <OpsTableHeaderCell>Account</OpsTableHeaderCell>
                <OpsTableHeaderCell>Email</OpsTableHeaderCell>
                <OpsTableHeaderCell align="right">Last sign-in</OpsTableHeaderCell>
              </tr>
            </OpsTableHead>
            <OpsTableBody>
              {coverageGapProfiles.map((profile) => (
                <OpsTableRow key={profile.id}>
                  <OpsTableCell>{profile.displayName || profile.email || profile.id}</OpsTableCell>
                  <OpsTableCell className="text-muted">{profile.email || profile.id}</OpsTableCell>
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
