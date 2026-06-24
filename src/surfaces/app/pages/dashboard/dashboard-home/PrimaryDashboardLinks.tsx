import { Link } from '@tanstack/react-router';
import { dashboardLinks } from './dashboardLinks';

export const PrimaryDashboardLinks = () => (
  <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {dashboardLinks.map(({ to, icon: Icon, label, description }) => (
      <Link key={to} to={to} className="group rounded-xl surface-soft p-5 transition-colors hover:bg-surface">
        <Icon className="mb-3 h-6 w-6 text-accent" />
        <h2 className="font-semibold text-foreground">{label}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </Link>
    ))}
  </div>
);
