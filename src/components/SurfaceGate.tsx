import { type ReactNode } from 'react';
import { type SiteSurface } from '@/lib/site-surface';

interface SurfaceGateProps {
  children: ReactNode;
  surface: SiteSurface;
}

export const SurfaceGate = ({ children, surface }: SurfaceGateProps) => {
  if (surface !== 'app') {
    return null;
  }
  return <>{children}</>;
};
