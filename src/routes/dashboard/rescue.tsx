import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { OpsRescue } from '@/surfaces/app/pages/dashboard/OpsRescue';

export const Route = createFileRoute('/dashboard/rescue')({
  validateSearch: (search: Record<string, unknown>) => ({
    lookup: typeof search.lookup === 'string' ? search.lookup : undefined,
  }),
  head: () =>
    buildPageHead({
      title: 'Customer Rescue | OmniLux Ops',
      description: 'Unified rescue workflow for customer access failures, with inspect and safe mutate controls.',
      pathname: '/dashboard/rescue',
      surface: 'app',
      noIndex: true,
    }),
  component: () => {
    const search = Route.useSearch();
    return <OpsRescue initialLookup={search.lookup} />;
  },
});
