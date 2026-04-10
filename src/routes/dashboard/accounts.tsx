import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { OpsAccounts } from '@/surfaces/app/pages/dashboard/OpsAccounts';

export const Route = createFileRoute('/dashboard/accounts')({
  validateSearch: (search: Record<string, unknown>) => ({
    lookup: typeof search.lookup === 'string' ? search.lookup : undefined,
  }),
  head: () =>
    buildPageHead({
      title: 'Accounts | OmniLux Ops',
      description: 'Search cloud accounts, inspect support context, and manage operator account actions.',
      pathname: '/dashboard/accounts',
      surface: 'app',
      noIndex: true,
    }),
  component: () => {
    const search = Route.useSearch();
    return <OpsAccounts initialLookup={search.lookup} />;
  },
});
