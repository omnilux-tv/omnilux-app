import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { formatTimestamp, toTimestamp } from '@/surfaces/app/lib/ops-formatters';
import { useOperatorAccessProfiles } from '@/surfaces/app/lib/ops';
import { OpsLoadingState, OpsNotice, OpsPageShell } from '@/surfaces/app/pages/dashboard/OpsPageShell';

const normalizeSubscriptionStatus = (value: string | null | undefined) => (value ?? 'unknown').toLowerCase();

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
  const subscriptionStatusSummary = useMemo(() => {
    const counts = new Map<string, number>();

    for (const profile of subscribedProfiles) {
      const status = normalizeSubscriptionStatus(profile.subscription?.status);
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }

    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [subscribedProfiles]);

  if (isAccessProfileLoading) {
    return <OpsLoadingState />;
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
    return (
      <OpsNotice
        title="Operator Access Required"
        body="This page is reserved for internal OmniLux operator accounts."
      />
    );
  }

  return (
    <OpsPageShell
      eyebrow="Financials"
      title="Track billing posture without leaving ops."
      description="Keep paid plan coverage, trial exposure, and billing friction visible in one full-width financial lane so revenue follow-up stays tied to real accounts."
      metrics={[
        {
          label: 'Active plans',
          value: String(activePlans.length),
          detail: 'Accounts currently in good standing.',
        },
        {
          label: 'Trials',
          value: String(trialPlans.length),
          detail: 'Customers still inside onboarding runway.',
        },
        {
          label: 'Needs follow-up',
          value: String(attentionPlans.length),
          detail: 'Subscriptions not active or trialing.',
        },
        {
          label: 'No paid plan',
          value: String((profiles?.length ?? 0) - subscribedProfiles.length),
          detail: 'Accounts with no subscription record.',
        },
      ]}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Billing ledger</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                Recent subscription records, renewal timing, and direct paths back into account operations.
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted">
              Subscription accounts {subscribedProfiles.length}
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 space-y-3">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="h-20 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
              ))}
            </div>
          ) : error ? (
            <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
              {error instanceof Error ? error.message : 'Failed to load subscription posture.'}
            </div>
          ) : subscribedProfiles.length === 0 ? (
            <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
              No subscription records are attached to cloud accounts yet.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {subscribedProfiles.slice(0, 12).map((profile) => (
                <div key={profile.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {profile.displayName || profile.email || profile.id}
                      </p>
                      <p className="mt-1 text-sm text-muted">{profile.email || profile.id}</p>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-3">
                      <div className="rounded-xl bg-black/20 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Plan</p>
                        <p className="mt-2 text-foreground">
                          {profile.subscription?.tier ?? 'Unknown'} · {profile.subscription?.status ?? 'Unknown'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/20 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Renewal</p>
                        <p className="mt-2 text-foreground">
                          {formatTimestamp(profile.subscription?.currentPeriodEnd ?? null)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/20 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Updated</p>
                        <p className="mt-2 text-foreground">
                          {formatTimestamp(profile.subscription?.updatedAt ?? profile.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      to="/dashboard/accounts"
                      search={{ lookup: profile.email ?? profile.id } as never}
                      className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                    >
                      Open account workspace
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
            <h2 className="font-display text-2xl font-bold text-foreground">Status mix</h2>
            <p className="mt-2 text-sm text-muted">
              Distribution across accounts with a billing record.
            </p>

            {subscriptionStatusSummary.length === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
                No billing mix is available yet.
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                {subscriptionStatusSummary.map(([status, count]) => (
                  <span
                    key={status}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-foreground"
                  >
                    {status} · {count}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
            <h2 className="font-display text-2xl font-bold text-foreground">Renewal queue</h2>
            <p className="mt-2 text-sm text-muted">
              Accounts with the nearest upcoming period end.
            </p>

            {renewalQueue.length === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
                No upcoming renewals are scheduled yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {renewalQueue.map((profile) => (
                  <div key={profile.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {profile.displayName || profile.email || profile.id}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {profile.subscription?.tier ?? 'Unknown'} · {profile.subscription?.status ?? 'Unknown'}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
                      {formatTimestamp(profile.subscription?.currentPeriodEnd ?? null)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Attention queue</h2>
              <p className="mt-2 text-sm text-muted">
                Accounts with billing status outside active or trialing.
              </p>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-muted">{attentionPlans.length} accounts</span>
          </div>

          {attentionPlans.length === 0 ? (
            <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
              No billing follow-up is needed right now.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {attentionPlans.slice(0, 10).map((profile) => (
                <div key={profile.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {profile.displayName || profile.email || profile.id}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {profile.subscription?.tier ?? 'Unknown'} · {profile.subscription?.status ?? 'Unknown'}
                  </p>
                  <div className="mt-3">
                    <Link
                      to="/dashboard/accounts"
                      search={{ lookup: profile.email ?? profile.id } as never}
                      className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                    >
                      Review account
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Coverage gap</h2>
              <p className="mt-2 text-sm text-muted">
                Accounts without a billing record attached.
              </p>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-muted">
              {(profiles?.length ?? 0) - subscribedProfiles.length} accounts
            </span>
          </div>

          {coverageGapProfiles.length === 0 ? (
            <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
              Every visible account already has a subscription record.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {coverageGapProfiles.map((profile) => (
                <div key={profile.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {profile.displayName || profile.email || profile.id}
                  </p>
                  <p className="mt-1 text-sm text-muted">{profile.email || profile.id}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
                    Last sign-in {formatTimestamp(profile.lastSignInAt)}
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
