export type RelayConditionState =
  | 'disabled'
  | 'unlinked'
  | 'not_entitled'
  | 'connecting'
  | 'ready'
  | 'degraded'
  | 'offline'
  | 'revoked';

export interface RelayConditionDetail {
  state: RelayConditionState;
  rawStatus: string | null;
  summary: string;
  recommendedAction: string;
  observedAt: string;
}

const knownStates = new Set<RelayConditionState>([
  'disabled',
  'unlinked',
  'not_entitled',
  'connecting',
  'ready',
  'degraded',
  'offline',
  'revoked',
]);

export function isRelayConditionState(value: unknown): value is RelayConditionState {
  return typeof value === 'string' && knownStates.has(value as RelayConditionState);
}

export function deriveRelayCondition(input: {
  relayEnabled?: boolean | null;
  relayStatus?: string | null;
  entitled?: boolean | null;
  linked?: boolean;
}): RelayConditionState {
  if (input.linked === false) return 'unlinked';
  if (!input.relayEnabled) return 'disabled';
  if (input.entitled === false) return 'not_entitled';
  if (input.relayStatus === 'online') return 'ready';
  if (input.relayStatus === 'connecting') return 'connecting';
  if (input.relayStatus === 'degraded') return 'degraded';
  return 'offline';
}

export function getRelayConditionLabel(condition: RelayConditionState): string {
  switch (condition) {
    case 'disabled':
      return 'Disabled';
    case 'unlinked':
      return 'Unlinked';
    case 'not_entitled':
      return 'Plan required';
    case 'connecting':
      return 'Connecting';
    case 'ready':
      return 'Ready';
    case 'degraded':
      return 'Degraded';
    case 'revoked':
      return 'Revoked';
    case 'offline':
    default:
      return 'Offline';
  }
}

export function getRelayConditionTone(condition: RelayConditionState): 'success' | 'warning' | 'danger' | 'muted' {
  switch (condition) {
    case 'ready':
      return 'success';
    case 'connecting':
    case 'degraded':
      return 'warning';
    case 'disabled':
    case 'unlinked':
      return 'muted';
    case 'not_entitled':
    case 'offline':
    case 'revoked':
    default:
      return 'danger';
  }
}

export function getRelayConditionSummary(condition: RelayConditionState): string {
  switch (condition) {
    case 'disabled':
      return 'Relay is disabled for this server.';
    case 'unlinked':
      return 'This server is not linked to OmniLux Cloud.';
    case 'not_entitled':
      return 'The current account needs an eligible cloud plan before relay service can be used.';
    case 'connecting':
      return 'Relay tunnel is being established.';
    case 'ready':
      return 'Relay tunnel is connected for cloud diagnostics. Direct local access remains the supported playback path in this release.';
    case 'degraded':
      return 'Relay tunnel diagnostics are partially available or unhealthy.';
    case 'revoked':
      return 'Cloud access for this server has been revoked.';
    case 'offline':
    default:
      return 'No usable relay tunnel is currently available.';
  }
}
