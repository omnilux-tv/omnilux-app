export const opsConsolePages = [
  {
    to: '/dashboard',
    label: 'Overview',
    description: 'System-wide command view for the operator console.',
    group: 'overview',
  },
  {
    to: '/dashboard/accounts',
    label: 'Accounts',
    description: 'Customer account operations, access controls, and support handoff.',
    group: 'operations',
  },
  {
    to: '/dashboard/logs',
    label: 'Audit Trail',
    description: 'Sensitive activity, access changes, and policy audit history.',
    group: 'operations',
  },
  {
    to: '/dashboard/financials',
    label: 'Financials',
    description: 'Subscription posture, paid plan coverage, and billing follow-up.',
    group: 'operations',
  },
  {
    to: '/dashboard/staff',
    label: 'Operators',
    description: 'Operator roster, MFA posture, and recent session activity.',
    group: 'operations',
  },
  {
    to: '/dashboard/control-plane',
    label: 'Control Plane',
    description: 'Platform policy, relay rules, and live incident controls.',
    group: 'systems',
  },
  {
    to: '/dashboard/media-control',
    label: 'Managed Runtime',
    description: 'Managed runtime posture, advisory state, and media operations.',
    group: 'systems',
  },
  {
    to: '/dashboard/health',
    label: 'Service Health',
    description: 'Public surface reachability, runtime health, and runbooks.',
    group: 'systems',
  },
  {
    to: '/dashboard/account',
    label: 'Account Settings',
    description: 'Session assurance, identity settings, and operator profile security.',
    group: 'settings',
  },
] as const;

export type OpsConsolePath = (typeof opsConsolePages)[number]['to'];

export const DEFAULT_OPS_CONSOLE_PATH: OpsConsolePath = '/dashboard';

const opsConsolePathSet = new Set<string>(opsConsolePages.map((page) => page.to));

export const isOpsConsolePath = (value: string) => opsConsolePathSet.has(value);

export const opsConsoleGroups = [
  {
    id: 'overview',
    label: 'Overview',
    items: ['/dashboard'],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: ['/dashboard/accounts', '/dashboard/financials', '/dashboard/staff', '/dashboard/logs'],
  },
  {
    id: 'systems',
    label: 'Systems',
    items: ['/dashboard/control-plane', '/dashboard/media-control', '/dashboard/health'],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: ['/dashboard/account'],
  },
] as const;

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
