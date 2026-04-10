import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { Operators } from '@/surfaces/app/pages/dashboard/Operators';

export const Route = createFileRoute('/dashboard/operators')({
  validateSearch: (search: Record<string, unknown>) => ({
    lookup: typeof search.lookup === 'string' ? search.lookup : undefined,
  }),
  head: () =>
    buildPageHead({
      title: 'Operator Access | OmniLux Cloud',
      description: 'Manage managed-media entitlement and OmniLux Ops console access for cloud accounts.',
      pathname: '/dashboard/operators',
      surface: 'app',
      noIndex: true,
    }),
  component: () => {
    const search = Route.useSearch();
    return <Operators initialLookup={search.lookup} />;
  },
});
