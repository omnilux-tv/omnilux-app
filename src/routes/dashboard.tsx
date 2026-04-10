import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';
import { SurfaceGate } from '@/components/SurfaceGate';
import { buildPageHead } from '@/lib/seo';
import { buildAppHref, getCurrentSiteSurface } from '@/lib/site-surface';
import { useAuth } from '@/providers/AuthProvider';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';
import { DEFAULT_OPS_CONSOLE_PATH, isOpsConsolePath } from '@/surfaces/app/lib/ops-console';
import { OpsAppShell } from '@/surfaces/app/pages/dashboard/OpsPageShell';

export const Route = createFileRoute('/dashboard')({
  head: () =>
    buildPageHead({
      title: 'OmniLux Cloud',
      description: 'Manage your OmniLux Cloud account, servers, billing, and remote services.',
      pathname: '/dashboard',
      surface: 'app',
      noIndex: true,
    }),
  component: () => (
    <SurfaceGate surface={['app', 'ops']}>
      <DashboardLayout />
    </SurfaceGate>
  ),
});

function DashboardLayout() {
  const { user, loading, signOut } = useAuth();
  const { data: accessProfile, isLoading: isAccessProfileLoading } = useAccessProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const currentSurface =
    typeof window === 'undefined' ? 'app' : getCurrentSiteSurface(window.location.hostname);
  const isOpsSurface = currentSurface === 'ops';

  useEffect(() => {
    if (!loading && !user) {
      const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      navigate({
        to: '/login',
        search: { redirect: next } as never,
        replace: true,
      });
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!isOpsSurface || loading || !user || isAccessProfileLoading || !accessProfile?.isOperator) {
      return;
    }

    const isAllowedOpsRoute =
      isOpsConsolePath(pathname === '/dashboard/' ? '/dashboard' : pathname) ||
      pathname.startsWith('/dashboard/operators') ||
      pathname.startsWith('/dashboard/account');

    if (!isAllowedOpsRoute) {
      navigate({
        to: DEFAULT_OPS_CONSOLE_PATH,
        replace: true,
      });
    }
  }, [accessProfile?.isOperator, isAccessProfileLoading, isOpsSurface, loading, navigate, pathname, user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
      </div>
    );
  }

  if (isOpsSurface) {
    if (isAccessProfileLoading) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
        </div>
      );
    }

    if (!accessProfile?.isOperator) {
      return (
        <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-warning/30 bg-warning/10 p-8">
            <h1 className="font-display text-2xl font-bold text-foreground">Operator Access Required</h1>
            <p className="mt-3 text-sm text-foreground">
              `ops.omnilux.tv` is reserved for internal operator accounts. Sign in with an operator profile or return
              to the standard cloud app.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  void signOut().then(() => {
                    window.location.assign('/login');
                  });
                }}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
              >
                Sign out
              </button>
              <a
                href={buildAppHref('/login')}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                Use OmniLux Cloud
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  if (isOpsSurface && accessProfile?.isOperator) {
    return (
      <OpsAppShell>
        <Outlet />
      </OpsAppShell>
    );
  }

  return <Outlet />;
}
