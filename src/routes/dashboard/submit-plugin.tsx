import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { SubmitPlugin } from '@/surfaces/app/pages/dashboard/SubmitPlugin';

export const Route = createFileRoute('/dashboard/submit-plugin')({
  head: () =>
    buildPageHead({
      title: 'Submit Plugin | OmniLux Cloud',
      description: 'Submit a plugin listing for the OmniLux marketplace.',
      pathname: '/dashboard/submit-plugin',
      surface: 'app',
      noIndex: true,
    }),
  component: SubmitPlugin,
});
