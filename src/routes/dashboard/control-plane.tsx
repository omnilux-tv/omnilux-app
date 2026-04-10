import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { OpsControlPlane } from '@/surfaces/app/pages/dashboard/OpsControlPlane';

export const Route = createFileRoute('/dashboard/control-plane')({
  head: () =>
    buildPageHead({
      title: 'Control Plane | OmniLux Ops',
      description: 'Manage platform policy, relay rules, and managed runtime advisory state.',
      pathname: '/dashboard/control-plane',
      surface: 'app',
      noIndex: true,
    }),
  component: OpsControlPlane,
});
