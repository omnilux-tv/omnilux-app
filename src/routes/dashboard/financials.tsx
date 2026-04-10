import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import { OpsFinancials } from '@/surfaces/app/pages/dashboard/OpsFinancials';

export const Route = createFileRoute('/dashboard/financials')({
  head: () =>
    buildPageHead({
      title: 'Financials | OmniLux Ops',
      description: 'Track billing posture, trials, and subscription follow-up across OmniLux accounts.',
      pathname: '/dashboard/financials',
      surface: 'app',
      noIndex: true,
    }),
  component: OpsFinancials,
});
