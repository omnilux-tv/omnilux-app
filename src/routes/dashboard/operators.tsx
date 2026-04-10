import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { buildPageHead } from '@/lib/seo';
import {
  DEFAULT_OPS_CONSOLE_PATH,
  getLegacyOperatorViewDestination,
  isOperatorConsoleView,
} from '@/surfaces/app/lib/ops-console';

export const Route = createFileRoute('/dashboard/operators')({
  validateSearch: (search: Record<string, unknown>) => ({
    lookup: typeof search.lookup === 'string' ? search.lookup : undefined,
    view: isOperatorConsoleView(search.view) ? search.view : undefined,
  }),
  head: () =>
    buildPageHead({
      title: 'OmniLux Ops Workspace | OmniLux Ops',
      description: 'Legacy operator workspace route retained for compatibility with the new dedicated ops pages.',
      pathname: '/dashboard/operators',
      surface: 'app',
      noIndex: true,
    }),
  component: LegacyOperatorsRedirect,
});

function LegacyOperatorsRedirect() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  useEffect(() => {
    const nextPath = search.view ? getLegacyOperatorViewDestination(search.view) : DEFAULT_OPS_CONSOLE_PATH;
    void navigate({
      to: nextPath,
      search: nextPath === '/dashboard/accounts' ? ({ lookup: search.lookup } as never) : undefined,
      replace: true,
    });
  }, [navigate, search.lookup, search.view]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
    </div>
  );
}
