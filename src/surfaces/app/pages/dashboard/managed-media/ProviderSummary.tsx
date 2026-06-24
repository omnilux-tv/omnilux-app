import { Download } from 'lucide-react';
import { managedMediaTypeLabels, type ManagedMediaType } from '@omnilux/types';
import type { ProviderWorkspaceViewModel } from './useProviderWorkspace';
import { numberFormatter, reportingDateFormatter, requestStatusLabel } from './model';

type ProviderSummaryProps = {
  vm: ProviderWorkspaceViewModel;
};

export const ProviderSummary = ({ vm }: ProviderSummaryProps) => {
  const workspace = vm.workspace;
  if (!workspace) return null;

  const summary = workspace.reportingSummary;
  const contractTerms = workspace.contractTerms ?? [];
  const activeTerms = contractTerms.filter((term) => term.status === 'active').length;
  const settlements = workspace.settlementStatements ?? [];
  const topMediaType = summary
    ? Object.entries(summary.byMediaType).sort(([, left], [, right]) => right - left)[0]
    : undefined;
  const topStatus = summary
    ? Object.entries(summary.byStatus).sort(([, left], [, right]) => right - left)[0]
    : undefined;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold text-muted">Contract terms</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{numberFormatter.format(contractTerms.length)}</p>
        <p className="mt-1 text-xs text-muted">
          {numberFormatter.format(activeTerms)} active operational term{activeTerms === 1 ? '' : 's'}
        </p>
      </div>

      {summary ? (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Provider reporting</p>
              <h3 className="mt-1 font-semibold text-foreground">30-day playback grants</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">
                {reportingDateFormatter.format(new Date(summary.windowStart))} -{' '}
                {reportingDateFormatter.format(new Date(summary.windowEnd))}
              </span>
              {(['item-aggregate', 'settlement-basis'] as const).map((reportType) => (
                <button
                  key={reportType}
                  type="button"
                  disabled={vm.mutations.exportProviderReport.isPending}
                  onClick={() => {
                    vm.mutations.exportProviderReport.mutate({
                      providerId: workspace.provider.id,
                      windowStart: summary.windowStart,
                      windowEnd: summary.windowEnd,
                      reportType,
                    });
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  {reportType === 'settlement-basis' ? 'Settlement CSV' : 'CSV'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {[
              ['Issued', numberFormatter.format(summary.grantsIssued)],
              ['Consumed', numberFormatter.format(summary.grantsConsumed)],
              ['Accounts', numberFormatter.format(summary.uniqueAccounts)],
              [
                'Top media',
                topMediaType ? `${managedMediaTypeLabels[topMediaType[0] as ManagedMediaType]} (${numberFormatter.format(topMediaType[1])})` : 'No activity',
              ],
              ['Top status', topStatus ? `${requestStatusLabel(topStatus[0])} (${numberFormatter.format(topStatus[1])})` : 'No activity'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-background/70 p-3">
                <p className="text-xs font-semibold text-muted">{label}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {settlements.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted">Settlement statements</p>
              <h3 className="mt-1 font-semibold text-foreground">Operator-approved aggregate statements</h3>
            </div>
            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">
              {numberFormatter.format(settlements.length)}
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {settlements.slice(0, 4).map((statement) => (
              <article key={statement.id} className="rounded-lg border border-border bg-background/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-foreground">{statement.statementKey}</p>
                    <p className="mt-1 text-xs text-muted">
                      {statement.statementPeriod} · {requestStatusLabel(statement.status)}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                    {numberFormatter.format(Number(statement.summary.grantsConsumed ?? 0))} consumed
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">
                  {numberFormatter.format(statement.rows.length)} aggregate rows. No account-level rows, financial
                  amounts, or payout instructions are included.
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
