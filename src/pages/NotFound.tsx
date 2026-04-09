import { ArrowLeft, Compass } from 'lucide-react';
import { buildMarketingHref } from '@/lib/site-surface';

export const NotFound = () => (
  <div className="flex min-h-[70vh] items-center px-4 py-16 sm:px-6 lg:px-8">
    <div className="mx-auto grid w-full max-w-5xl gap-8 rounded-[2rem] border border-border/50 bg-card/35 p-8 backdrop-blur-sm lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Error 404</p>
        <h1 className="mt-4 font-display text-4xl font-extrabold text-foreground sm:text-5xl">
          The page you requested isn&apos;t part of the current OmniLux surface.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
          The route may have moved, the link may be outdated, or the path may never have existed. Use the main navigation
          to return to a known page.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={buildMarketingHref('/')}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </a>
          <a
            href={buildMarketingHref('/features')}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            <Compass className="h-4 w-4" />
            Browse features
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            title: 'Explore the product',
            body: 'Review the feature direction, SDK positioning, and current product narrative.',
            to: '/features',
          },
          {
            title: 'See access paths',
            body: 'Read the current early-access, investor, and developer entry points.',
            to: '/pricing',
          },
          {
            title: 'Open the SDK page',
            body: 'Inspect the plugin model, developer path, and partner entry points.',
            to: '/marketplace',
          },
          {
            title: 'Review legal policies',
            body: 'Open the current terms and privacy documents for OmniLux.',
            to: '/privacy',
          },
        ].map((item) => (
          <a
            key={item.title}
            href={buildMarketingHref(item.to)}
            className="rounded-2xl border border-border/50 bg-background/35 p-5 transition-colors hover:border-border hover:bg-surface"
          >
            <h2 className="text-sm font-semibold text-foreground">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
          </a>
        ))}
      </div>
    </div>
  </div>
);
