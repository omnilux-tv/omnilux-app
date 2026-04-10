import { createFileRoute } from '@tanstack/react-router';
import { buildPageHead } from '@/lib/seo';
import {
  DEFAULT_OPERATOR_CONSOLE_VIEW,
  isOperatorConsoleView,
} from '@/surfaces/app/lib/ops-console';
import { Operators } from '@/surfaces/app/pages/dashboard/Operators';

export const Route = createFileRoute('/dashboard/operators')({
  validateSearch: (search: Record<string, unknown>) => ({
    lookup: typeof search.lookup === 'string' ? search.lookup : undefined,
    view: isOperatorConsoleView(search.view) ? search.view : DEFAULT_OPERATOR_CONSOLE_VIEW,
  }),
  head: () =>
    buildPageHead({
      title: 'OmniLux Ops Workspace | OmniLux Cloud',
      description: 'Track cloud accounts, logs, financial posture, staff access, and service health for OmniLux operations.',
      pathname: '/dashboard/operators',
      surface: 'app',
      noIndex: true,
    }),
  component: () => {
    const search = Route.useSearch();
    return <Operators initialLookup={search.lookup} initialView={search.view} />;
  },
});
