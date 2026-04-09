import {
  HeadContent,
  Outlet,
  ScrollRestoration,
  createRootRoute,
} from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { AuthProvider } from '@/providers/AuthProvider';
import { NotFound } from '@/pages/NotFound';
import { AppHeader } from '@/surfaces/app/components/AppHeader';
import { buildRootHead } from '@/lib/seo';

export const Route = createRootRoute({
  head: () => buildRootHead(),
  notFoundComponent: NotFound,
  component: RootLayout,
});

function RootLayout() {
  const hasNavigated = useRef(false);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!hasNavigated.current) {
      hasNavigated.current = true;
      return;
    }

    mainRef.current?.focus();
  });

  return (
    <AuthProvider enabled>
      <HeadContent />
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[60] rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground focus:not-sr-only"
      >
        Skip to content
      </a>
      <AppHeader />
      <main id="main-content" ref={mainRef} className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <ScrollRestoration />
    </AuthProvider>
  );
}
