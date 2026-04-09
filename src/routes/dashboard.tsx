import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { SurfaceGate } from '@/components/SurfaceGate';
import { buildPageHead } from '@/lib/seo';
import { useAuth } from '@/providers/AuthProvider';

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
    <SurfaceGate surface="app">
      <DashboardLayout />
    </SurfaceGate>
  ),
});

function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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

  return <Outlet />;
}
