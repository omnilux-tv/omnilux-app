import { Link } from '@tanstack/react-router';
import { Server, User, Smartphone, CreditCard, Puzzle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { buildAppHref, getCurrentSiteSurface } from '@/lib/site-surface';
import { useAccessProfile } from '@/surfaces/app/lib/access-profile';

const dashboardLinks = [
  { to: '/dashboard/servers', icon: Server, label: 'Servers', description: 'Claimed OmniLux installs, relay state, and companion access.' },
  { to: '/dashboard/devices', icon: Smartphone, label: 'Devices', description: 'Sessions signed into your OmniLux Cloud account.' },
  { to: '/dashboard/subscription', icon: CreditCard, label: 'Billing', description: 'Plan status for relay, remote access, and paid cloud features.' },
  { to: '/dashboard/account', icon: User, label: 'Account', description: 'Identity, security, and profile details for your cloud account.' },
] as const;

const secondaryLinks = [
  {
    to: '/dashboard/submit-plugin',
    icon: Puzzle,
    label: 'Developer Tools',
    description: 'Submit marketplace plugins and manage account-linked publishing metadata.',
  },
] as const;

export const Dashboard = () => {
  const { user } = useAuth();
  const { data: accessProfile } = useAccessProfile();
  const currentSurface =
    typeof window === 'undefined' ? 'app' : getCurrentSiteSurface(window.location.hostname);
  const isOpsSurface = currentSurface === 'ops';
  const displayName = user?.user_metadata?.display_name ?? user?.email ?? 'User';
  const operatorLinks = accessProfile?.isOperator
    ? [
        {
          to: '/dashboard/operators',
          icon: ShieldCheck,
          label: 'Operator Access',
          description: 'Manage managed-media entitlements and OmniLux Ops console access.',
        },
      ]
    : [];

  if (isOpsSurface) {
    const opsLinks = [
      {
        to: '/dashboard/operators',
        icon: ShieldCheck,
        label: 'Operator Access',
        description: 'Manage internal operator accounts, managed media access, and audit history.',
      },
      {
        to: '/dashboard/account',
        icon: User,
        label: 'Admin Account',
        description: 'Review the credentials, password, and profile settings for your operator identity.',
      },
    ] as const;

    return (
      <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Operator Console</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">OmniLux Ops</h1>
          <p className="mt-2 max-w-2xl text-muted">
            {displayName}, this surface is reserved for OmniLux operators. Use it to administer managed access,
            entitlement policy, and internal cloud controls without mixing those tasks into the customer app.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {opsLinks.map(({ to, icon: Icon, label, description }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-xl surface-soft p-5 transition-colors hover:bg-surface"
              >
                <Icon className="mb-3 h-6 w-6 text-accent" />
                <h2 className="font-semibold text-foreground">{label}</h2>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-border bg-background p-5">
            <h2 className="font-semibold text-foreground">Need the customer-facing cloud app?</h2>
            <p className="mt-2 text-sm text-muted">
              Use the standard hosted app for billing, self-hosted servers, and customer account workflows.
            </p>
            <a
              href={buildAppHref('/dashboard')}
              className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Open OmniLux Cloud
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">Cloud Console</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Overview</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {displayName}, this is the cloud side of OmniLux. Your libraries and playback stay on your self-hosted server; this console manages identity, billing, and remote services around it.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardLinks.map(({ to, icon: Icon, label, description }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-xl surface-soft p-5 transition-colors hover:bg-surface"
            >
              <Icon className="mb-3 h-6 w-6 text-accent" />
              <h2 className="font-semibold text-foreground">{label}</h2>
              <p className="mt-1 text-sm text-muted">{description}</p>
            </Link>
          ))}
        </div>

        <section className="mt-12">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold text-foreground">Developer Area</h2>
            <p className="mt-2 text-sm text-muted">
              Secondary cloud workflows live here so the main navigation stays focused on account management, servers, billing, and remote access.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {secondaryLinks.map(({ to, icon: Icon, label, description }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-xl border border-border bg-background p-5 transition-colors hover:bg-surface"
              >
                <Icon className="mb-3 h-6 w-6 text-accent" />
                <h3 className="font-semibold text-foreground">{label}</h3>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </Link>
            ))}
            {operatorLinks.map(({ to, icon: Icon, label, description }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-xl border border-border bg-background p-5 transition-colors hover:bg-surface"
              >
                <Icon className="mb-3 h-6 w-6 text-accent" />
                <h3 className="font-semibold text-foreground">{label}</h3>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
