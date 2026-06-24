import type { ReactNode } from 'react';

type FieldProps = {
  label: string;
  children: ReactNode;
};

export const Field = ({ label, children }: FieldProps) => (
  <label className="block">
    <span className="text-xs font-semibold text-muted">{label}</span>
    {children}
  </label>
);

export const inputClass =
  'mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60';

export const surfaceInputClass =
  'mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60';

export const textareaClass =
  'mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent';

export const primaryButtonClass =
  'inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60';

export const Pill = ({ children }: { children: ReactNode }) => (
  <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">{children}</span>
);

export const Warning = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">{children}</p>
);
