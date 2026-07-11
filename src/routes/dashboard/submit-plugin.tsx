import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { SubmitPlugin } from '@/surfaces/app/pages/dashboard/SubmitPlugin';

export const Route = createFileRoute('/dashboard/submit-plugin')({
  head: () =>
    buildPageHead({
      title: 'Plugin Submissions Closed | OmniLux Cloud',
      description: 'Public plugin submissions are closed while OmniLux completes marketplace governance controls.',
      pathname: '/dashboard/submit-plugin',
      surface: 'app',
      noIndex: true,
    }),
  component: SubmitPlugin,
});
