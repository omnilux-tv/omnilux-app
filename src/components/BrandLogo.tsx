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
  const prismId = `${id}-runtime-prism`;
  const ringId = `${id}-runtime-ring`;

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden rounded-[1.35rem] bg-[#0d0e12] shadow-[0_18px_42px_rgba(0,0,0,0.34)] ring-1 ring-inset ring-white/10',
        className,
      )}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true" className="h-full w-full">
        <defs>
          <linearGradient id={prismId} x1="30" y1="20" x2="90" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1d332f" />
            <stop offset="0.58" stopColor="#13202b" />
            <stop offset="1" stopColor="#10181f" />
          </linearGradient>
          <linearGradient id={ringId} x1="8" y1="8" x2="112" y2="112" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2f6b5e" stopOpacity="0.48" />
            <stop offset="1" stopColor="#b88a3b" stopOpacity="0.36" />
          </linearGradient>
        </defs>
        <rect x="5" y="5" width="110" height="110" rx="21" fill="none" stroke={`url(#${ringId})`} strokeWidth="1.5" />
        <polygon points="30,22 30,98 90,60" fill={`url(#${prismId})`} stroke="#3f7a6c" strokeOpacity="0.48" strokeWidth="1.2" />
        <polygon points="11,48 11,52 43,58 43,55" fill="#f6f1e8" opacity="0.82" />
        <polygon points="87,58 113,31 111,27" fill="#b88a3b" opacity="0.95" />
        <polygon points="87,59 113,45 111,41" fill="#b45d3d" opacity="0.86" />
        <polygon points="87,60 113,60 111,56" fill="#8f877b" opacity="0.72" />
        <polygon points="87,61 113,75 111,71" fill="#3f7a6c" opacity="0.86" />
        <polygon points="87,62 113,91 111,87" fill="#c9c1b3" opacity="0.7" />
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
