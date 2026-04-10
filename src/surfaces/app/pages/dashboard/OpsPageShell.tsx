import type { ReactNode } from 'react';

export const OPS_PAGE_CONTAINER_CLASS_NAME = 'mx-auto w-full max-w-[2200px] space-y-6';

interface OpsPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  metrics?: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  children: ReactNode;
}

export const OpsPageShell = ({
  eyebrow,
  title,
  description,
  metrics = [],
  children,
}: OpsPageShellProps) => (
  <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
    <div className={OPS_PAGE_CONTAINER_CLASS_NAME}>
      <section className="rounded-[1.75rem] border border-white/10 bg-black/18 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-foreground sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-muted">{description}</p>

        {metrics.length > 0 ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {metric.label}
                </p>
                <p className="mt-3 font-display text-3xl font-bold text-foreground">{metric.value}</p>
                <p className="mt-2 text-sm text-muted">{metric.detail}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {children}
    </div>
  </div>
);

export const OpsLoadingState = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
  </div>
);

export const OpsNotice = ({
  title,
  body,
  tone = 'warning',
}: {
  title: string;
  body: string;
  tone?: 'warning' | 'danger';
}) => (
  <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
    <div
      className={`mx-auto w-full max-w-[2200px] rounded-xl border p-6 ${
        tone === 'danger' ? 'border-danger/30 bg-danger/10' : 'border-warning/30 bg-warning/10'
      }`}
    >
      <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-foreground">{body}</p>
    </div>
  </div>
);
