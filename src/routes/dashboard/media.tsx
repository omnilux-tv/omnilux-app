import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { ManagedMedia } from '@/surfaces/app/pages/dashboard/ManagedMedia';

export const Route = createFileRoute('/dashboard/media')({
  head: () =>
    buildPageHead({
      title: 'Managed Media | OmniLux Cloud',
      description: 'Open and review first-party managed OmniLux media from your cloud account.',
      pathname: '/dashboard/media',
      surface: 'app',
      noIndex: true,
    }),
  component: ManagedMedia,
});
