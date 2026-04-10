export const operatorConsoleSections = [
  { view: 'accounts', label: 'Accounts', hash: 'accounts' },
  { view: 'logs', label: 'Logs', hash: 'logs' },
  { view: 'financials', label: 'Financials', hash: 'financials' },
  { view: 'staff', label: 'Staff', hash: 'staff' },
  { view: 'health', label: 'Health', hash: 'health' },
] as const;

export type OperatorConsoleView = (typeof operatorConsoleSections)[number]['view'];

export const DEFAULT_OPERATOR_CONSOLE_VIEW: OperatorConsoleView = 'accounts';

export const isOperatorConsoleView = (value: unknown): value is OperatorConsoleView =>
  operatorConsoleSections.some((section) => section.view === value);
