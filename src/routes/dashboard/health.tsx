import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { OpsHealth } from '@/surfaces/app/pages/dashboard/OpsHealth';

export const Route = createFileRoute('/dashboard/health')({
  head: () =>
    buildPageHead({
      title: 'Health | OmniLux Ops',
      description: 'Monitor public surface reachability and the current OmniLux reliability posture.',
      pathname: '/dashboard/health',
      surface: 'app',
      noIndex: true,
    }),
  component: OpsHealth,
});
