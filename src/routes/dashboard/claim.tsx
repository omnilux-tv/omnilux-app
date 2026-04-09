import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { ClaimServer } from '@/surfaces/app/pages/dashboard/ClaimServer';

export const Route = createFileRoute('/dashboard/claim')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  head: () =>
    buildPageHead({
      title: 'Claim a Server | OmniLux Cloud',
      description: 'Claim and connect a self-hosted OmniLux server to your cloud account.',
      pathname: '/dashboard/claim',
      surface: 'app',
      noIndex: true,
    }),
  component: () => {
    const search = Route.useSearch();
    return <ClaimServer initialCode={search.code} />;
  },
});
