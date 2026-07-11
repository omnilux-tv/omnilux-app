import { CreditCard, RadioTower, Server, ShieldCheck, Smartphone, User } from 'lucide-react';

export const dashboardLinks = [
  {
    to: '/dashboard/media',
    icon: RadioTower,
    label: 'Media',
    description: 'Open OmniLux-managed channels, radio, and first-party cloud experiences.',
  },
  {
    to: '/dashboard/servers',
    icon: Server,
    label: 'Servers',
    description: 'Claimed OmniLux installs, relay state, and companion access.',
  },
  {
    to: '/dashboard/devices',
    icon: Smartphone,
    label: 'Devices',
    description: 'Sessions signed into your OmniLux Cloud account.',
  },
  {
    to: '/dashboard/subscription',
    icon: CreditCard,
    label: 'Billing',
    description: 'Plan status for remote access, cloud continuity, and paid cloud features.',
  },
  {
    to: '/dashboard/account',
    icon: User,
    label: 'Account',
    description: 'Identity, security, and profile details for your cloud account.',
  },
] as const;

export type OperatorLink = {
  href: string;
  icon: typeof ShieldCheck;
  label: string;
  description: string;
};

export const createOperatorLink = (href: string): OperatorLink => ({
  href,
  icon: ShieldCheck,
  label: 'Ops Console',
  description: 'Open the separate operator workspace for support, policy, logs, and service health.',
});
