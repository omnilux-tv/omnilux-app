import { useId } from 'react';
import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
};

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  subtitle?: string;
  showSubtitle?: boolean;
};

export const BrandMark = ({ className }: BrandMarkProps) => {
  const id = useId();
  const shellId = `${id}-shell`;
  const beamId = `${id}-beam`;
  const beamSoftId = `${id}-beam-soft`;
  const glowId = `${id}-glow`;

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-[1.4rem] bg-[linear-gradient(155deg,#203883_0%,#142457_58%,#0b1436_100%)] shadow-[0_18px_40px_rgba(7,12,30,0.42)] ring-1 ring-inset ring-white/12',
        className,
      )}
    >
      <svg viewBox="0 0 96 96" aria-hidden="true" className="h-[78%] w-[78%]">
        <defs>
          <linearGradient id={shellId} x1="12" y1="10" x2="80" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2D4EAF" />
            <stop offset="0.58" stopColor="#142457" />
            <stop offset="1" stopColor="#0B1436" />
          </linearGradient>
          <linearGradient id={beamId} x1="18" y1="28" x2="71" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE76C" />
            <stop offset="1" stopColor="#FFCC34" />
          </linearGradient>
          <linearGradient id={beamSoftId} x1="18" y1="48" x2="71" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFF1A7" />
            <stop offset="1" stopColor="#FFE13F" />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M20 14H54L77 37V59L54 82H20C15.6 82 12 78.4 12 74V22C12 17.6 15.6 14 20 14Z"
          fill={`url(#${shellId})`}
        />
        <path d="M54 14L77 37H59C56.2 37 54 34.8 54 32V14Z" fill="#3B61C6" opacity="0.92" />
        <path
          d="M20 14H54L77 37V59L54 82H20C15.6 82 12 78.4 12 74V22C12 17.6 15.6 14 20 14Z"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.6"
        />

        <g filter={`url(#${glowId})`}>
          <path d="M26 48L33 40L40 48L33 56L26 48Z" fill="#FFE13F" />
          <path d="M34 28H57L71 42H48Z" fill={`url(#${beamId})`} />
          <path d="M36 44H61L71 48L61 52H36Z" fill={`url(#${beamSoftId})`} />
          <path d="M34 68H57L71 54H48Z" fill={`url(#${beamId})`} />
        </g>

        <path d="M23 24H47" stroke="rgba(255,255,255,0.24)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="33" cy="48" r="15" fill="rgba(255,225,63,0.08)" />
      </svg>
    </span>
  );
};

export const BrandLogo = ({
  className,
  markClassName,
  wordmarkClassName,
  subtitle = 'Self-hosted media',
  showSubtitle = false,
}: BrandLogoProps) => (
  <span className={cn('inline-flex min-w-0 items-center gap-3', className)}>
    <BrandMark className={cn('h-11 w-11 shrink-0', markClassName)} />
    <span className="flex min-w-0 flex-col">
      <span className={cn('font-display text-lg font-black tracking-[-0.04em] text-foreground', wordmarkClassName)}>
        <span>Omni</span>
        <span className="text-accent">Lux</span>
      </span>
      {showSubtitle ? (
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">{subtitle}</span>
      ) : null}
    </span>
  </span>
);
