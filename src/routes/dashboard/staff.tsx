import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { OpsStaff } from '@/surfaces/app/pages/dashboard/OpsStaff';

export const Route = createFileRoute('/dashboard/staff')({
  head: () =>
    buildPageHead({
      title: 'Staff | OmniLux Ops',
      description: 'Review operator roster, MFA posture, and recent sign-in activity.',
      pathname: '/dashboard/staff',
      surface: 'app',
      noIndex: true,
    }),
  component: OpsStaff,
});
