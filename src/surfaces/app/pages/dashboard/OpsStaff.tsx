import { useMemo } from 'react';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { formatTimestamp, toTimestamp } from '@/surfaces/app/lib/ops-formatters';
import { useOperatorAccessProfiles } from '@/surfaces/app/lib/ops';

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

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[2200px] space-y-6">
        <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Staff</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-foreground sm:text-5xl">
            Keep the operator bench visible.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Watch who has operator privileges, who is MFA-ready, and which sessions have been active recently enough to trust for live incident work.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Operators', value: String(staffProfiles.length), detail: 'Internal OmniLux operator accounts' },
              { label: 'MFA ready', value: String(staffAal2Count), detail: 'Sessions currently at AAL2' },
              { label: 'Seen this week', value: String(recentlyActiveStaffCount), detail: 'Recently active operator sessions' },
              {
                label: 'Unverified',
                value: String(staffProfiles.length - staffAal2Count),
                detail: 'Operators that need MFA verification before sensitive changes',
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Operator roster</h2>
              <p className="mt-2 text-sm text-muted">
                Track live operator posture before handing someone the control plane or customer account actions.
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted">
              Last operator cannot be demoted from the accounts page
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="h-36 animate-pulse rounded-[1.25rem] bg-white/[0.04]" />
              ))}
            </div>
          ) : error ? (
            <div className="mt-5 rounded-[1.25rem] border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
              {error instanceof Error ? error.message : 'Failed to load operator roster.'}
            </div>
          ) : staffProfiles.length === 0 ? (
            <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-muted">
              No operator accounts are registered yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {staffProfiles.map((profile) => (
                <div key={profile.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {profile.displayName || profile.email || profile.id}
                      </p>
                      <p className="mt-1 text-sm text-muted">{profile.email || profile.id}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/84">
                      {profile.sessionAssuranceLevel?.toUpperCase() ?? 'No AAL'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Last sign-in</p>
                      <p className="mt-2 text-sm text-foreground">{formatTimestamp(profile.lastSignInAt)}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Session expiry</p>
                      <p className="mt-2 text-sm text-foreground">{formatTimestamp(profile.sessionExpiresAt)}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Created</p>
                      <p className="mt-2 text-sm text-foreground">{formatTimestamp(profile.createdAt)}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Managed media</p>
                      <p className="mt-2 text-sm text-foreground">
                        {profile.managedMediaEntitled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
