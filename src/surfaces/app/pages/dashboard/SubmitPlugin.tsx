import { ShieldAlert } from 'lucide-react';
import { buildMarketingHref } from '@/lib/site-surface';

const reopeningRequirements = [
  'A registered DMCA agent and public agent notice',
  'Notice, counter-notice, restoration, and appeal procedures',
  'A reasonably implemented repeat-infringer policy',
  'Package, dependency-license, trademark, security, and source review',
];

export const SubmitPlugin = () => (
  <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-2xl rounded-2xl border border-warning/30 bg-warning/5 p-6 sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning">
        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
      </div>

      <p className="mt-6 text-sm font-medium text-muted">Ecosystem governance</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
        Public plugin submissions are closed
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        OmniLux is not accepting marketplace submissions while copyright,
        takedown, repeat-infringer, licensing, and package-review controls are
        completed. There is no submission form or alternate account bypass.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-background/45 p-5">
        <h2 className="text-sm font-semibold text-foreground">Required before reopening</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
          {reopeningRequirements.map((requirement) => (
            <li key={requirement} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
              <span>{requirement}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-sm leading-6 text-muted">
        The SDK may still be used for local development of lawful integrations.
        Marketplace eligibility and public distribution are separate decisions.
      </p>
      <a
        href={buildMarketingHref('/copyright')}
        className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
      >
        Read the copyright and takedown posture
      </a>
    </div>
  </div>
);
