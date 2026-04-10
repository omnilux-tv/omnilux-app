export const opsConsolePages = [
  {
    to: '/dashboard',
    label: 'Overview',
    description: 'Enterprise flight deck for OmniLux operations.',
  },
  {
    to: '/dashboard/accounts',
    label: 'Accounts',
    description: 'Customer account operations, access controls, and support handoff.',
  },
  {
    to: '/dashboard/logs',
    label: 'Logs',
    description: 'Sensitive activity, access changes, and policy audit history.',
  },
  {
    to: '/dashboard/financials',
    label: 'Financials',
    description: 'Subscription posture, paid plan coverage, and billing follow-up.',
  },
  {
    to: '/dashboard/staff',
    label: 'Staff',
    description: 'Operator roster, MFA posture, and recent session activity.',
  },
  {
    to: '/dashboard/control-plane',
    label: 'Control Plane',
    description: 'Platform policy, relay rules, and live incident controls.',
  },
  {
    to: '/dashboard/media-control',
    label: 'Media',
    description: 'Managed runtime posture, advisory state, and media operations.',
  },
  {
    to: '/dashboard/health',
    label: 'Health',
    description: 'Public surface reachability, runtime health, and runbooks.',
  },
] as const;

export type OpsConsolePath = (typeof opsConsolePages)[number]['to'];

export const DEFAULT_OPS_CONSOLE_PATH: OpsConsolePath = '/dashboard';

const opsConsolePathSet = new Set<string>(opsConsolePages.map((page) => page.to));

export const isOpsConsolePath = (value: string) => opsConsolePathSet.has(value);

export const operatorConsoleSections = [
  {
    label: 'Accounts',
    hash: 'accounts',
    view: 'accounts',
  },
  {
    label: 'Logs',
    hash: 'logs',
    view: 'logs',
  },
  {
    label: 'Financials',
    hash: 'financials',
    view: 'financials',
  },
  {
    label: 'Staff',
    hash: 'staff',
    view: 'staff',
  },
  {
    label: 'Health',
    hash: 'health',
    view: 'health',
  },
] as const;

export type OperatorConsoleView = (typeof operatorConsoleSections)[number]['view'];

export const DEFAULT_OPERATOR_CONSOLE_VIEW: OperatorConsoleView = 'accounts';

const operatorConsoleViewSet = new Set<string>(operatorConsoleSections.map((section) => section.view));

export const isOperatorConsoleView = (value: unknown): value is OperatorConsoleView =>
  typeof value === 'string' && operatorConsoleViewSet.has(value);

const legacyOperatorViewDestinations = {
  accounts: '/dashboard/accounts',
  logs: '/dashboard/logs',
  financials: '/dashboard/financials',
  staff: '/dashboard/staff',
  health: '/dashboard/health',
} as const;

export type LegacyOperatorView = keyof typeof legacyOperatorViewDestinations;

export const isLegacyOperatorView = (value: unknown): value is LegacyOperatorView =>
  typeof value === 'string' && value in legacyOperatorViewDestinations;

export const getLegacyOperatorViewDestination = (value: LegacyOperatorView) =>
  legacyOperatorViewDestinations[value];
