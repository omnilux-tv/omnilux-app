import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { Servers } from '@/surfaces/app/pages/dashboard/Servers';

export const Route = createFileRoute('/dashboard/servers')({
  head: () =>
    buildPageHead({
      title: 'Servers | OmniLux Cloud',
      description: 'Claim, manage, and review self-hosted servers and first-party managed media runtimes.',
      pathname: '/dashboard/servers',
      surface: 'app',
      noIndex: true,
    }),
  component: Servers,
});
