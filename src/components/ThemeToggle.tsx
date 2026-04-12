import { Monitor, MoonStar, SunMedium } from 'lucide-react';
import { type ThemePreference } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { cn } from '@/lib/utils';

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: 'light', label: 'Light theme', icon: SunMedium },
  { value: 'system', label: 'System theme', icon: Monitor },
  { value: 'dark', label: 'Dark theme', icon: MoonStar },
];

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-[0_10px_30px_rgba(20,36,87,0.08)] backdrop-blur-xl',
        className,
      )}
    >
      {themeOptions.map(({ value, label, icon: Icon }) => {
        const active = theme === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(20,36,87,0.18)]'
                : 'hover:bg-card hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
};
