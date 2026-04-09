import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { Subscription } from '@/surfaces/app/pages/dashboard/Subscription';

export const Route = createFileRoute('/dashboard/subscription')({
  head: () =>
    buildPageHead({
      title: 'Billing | OmniLux Cloud',
      description: 'Manage OmniLux Cloud plans, billing, and subscription settings.',
      pathname: '/dashboard/subscription',
      surface: 'app',
      noIndex: true,
    }),
  component: Subscription,
});
