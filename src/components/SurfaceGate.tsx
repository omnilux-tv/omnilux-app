import { type ReactNode } from 'react';
import { getCurrentSiteSurface, isLocalSurfaceMode, type SiteSurface } from '@/lib/site-surface';

interface SurfaceGateProps {
  children: ReactNode;
  surface: SiteSurface | SiteSurface[];
}

export const SurfaceGate = ({ children, surface }: SurfaceGateProps) => {
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  const allowedSurfaces = Array.isArray(surface) ? surface : [surface];
  const hostname = window.location.hostname;

  if (isLocalSurfaceMode(hostname)) {
    return allowedSurfaces.includes('marketing')
      ? <>{children}</>
      : allowedSurfaces.some((entry) => entry === 'app' || entry === 'ops')
        ? <>{children}</>
        : null;
  }

  const currentSurface = getCurrentSiteSurface(hostname);
  if (!allowedSurfaces.includes(currentSurface)) {
    return null;
  }

  return <>{children}</>;
};
