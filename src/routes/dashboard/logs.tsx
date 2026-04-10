import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { OpsLogs } from '@/surfaces/app/pages/dashboard/OpsLogs';

export const Route = createFileRoute('/dashboard/logs')({
  head: () =>
    buildPageHead({
      title: 'Logs | OmniLux Ops',
      description: 'Review operator activity, access changes, and control-plane audit history.',
      pathname: '/dashboard/logs',
      surface: 'app',
      noIndex: true,
    }),
  component: OpsLogs,
});
