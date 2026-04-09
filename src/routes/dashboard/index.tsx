import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { Dashboard } from '@/surfaces/app/pages/Dashboard';

export const Route = createFileRoute('/dashboard/')({
  head: () =>
    buildPageHead({
      title: 'Overview | OmniLux Cloud',
      description: 'Review your OmniLux Cloud overview, account status, and next actions.',
      pathname: '/dashboard',
      surface: 'app',
      noIndex: true,
    }),
  component: Dashboard,
});
