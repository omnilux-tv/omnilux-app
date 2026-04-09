import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { Account } from '@/surfaces/app/pages/dashboard/Account';

export const Route = createFileRoute('/dashboard/account')({
  head: () =>
    buildPageHead({
      title: 'Account Settings | OmniLux Cloud',
      description: 'Manage your OmniLux Cloud profile, password, and account settings.',
      pathname: '/dashboard/account',
      surface: 'app',
      noIndex: true,
    }),
  component: Account,
});
