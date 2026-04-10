import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { OpsMedia } from '@/surfaces/app/pages/dashboard/OpsMedia';

export const Route = createFileRoute('/dashboard/media-control')({
  head: () =>
    buildPageHead({
      title: 'Media Operations | OmniLux Ops',
      description: 'Operate the managed media runtime and its supporting public services.',
      pathname: '/dashboard/media-control',
      surface: 'app',
      noIndex: true,
    }),
  component: OpsMedia,
});
