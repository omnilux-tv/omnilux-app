import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { Dashboard } from '@/surfaces/app/pages/Dashboard';

export const Route = createFileRoute('/dashboard/')({
  head: () =>
    buildPageHead({
      title: 'Overview | OmniLux Account',
      description: 'Review your OmniLux account overview, managed media access, server status, and next steps.',
      pathname: '/dashboard',
      surface: 'app',
      noIndex: true,
    }),
  component: Dashboard,
});
