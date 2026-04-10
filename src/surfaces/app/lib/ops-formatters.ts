import type {
  AccessAuditRow,
  ManagedMediaPolicy,
  OperatorActionAuditRow,
  PlatformSettingsAuditRow,
  RelayAccessPolicy,
} from '@/surfaces/app/lib/ops';

export const managedMediaPolicyCopy: Record<ManagedMediaPolicy, { label: string; description: string }> = {
  'all-authenticated-users': {
    label: 'All OmniLux Cloud accounts',
    description: 'Every signed-in OmniLux Cloud account, including free accounts, can access first-party managed media.',
  },
  'explicit-per-profile': {
    label: 'Explicit per-profile access',
    description: 'Managed media access is controlled account by account through the operator console.',
  },
};

export const relayAccessPolicyCopy: Record<RelayAccessPolicy, { label: string; description: string }> = {
  'all-authenticated-users': {
    label: 'All OmniLux Cloud accounts',
    description: 'Remote relay access to self-hosted servers is available to any authenticated cloud account with server access.',
  },
  'paid-subscription': {
    label: 'Paid subscription required',
    description: 'Remote relay access to self-hosted servers requires the server owner to have an active or trialing paid cloud plan.',
  },
};

export const renderProfileLabel = (profile: {
  displayName: string | null;
  email: string | null;
  userId: string | null;
}) => profile.displayName || profile.email || profile.userId || 'Unknown account';

export const formatTimestamp = (value: string | null) =>
  value ? new Date(value).toLocaleString() : 'Not available';

export const toTimestamp = (value: string | null | undefined) =>
  value ? new Date(value).getTime() : 0;

export const renderAuditSummary = (row: AccessAuditRow) => {
  const changes: string[] = [];

  if (row.managedMediaEntitledBefore !== row.managedMediaEntitledAfter) {
    changes.push(row.managedMediaEntitledAfter ? 'managed media enabled' : 'managed media disabled');
  }

  if (row.isOperatorBefore !== row.isOperatorAfter) {
    changes.push(row.isOperatorAfter ? 'operator enabled' : 'operator disabled');
  }

  return changes.length > 0 ? changes.join(' · ') : 'No access change details recorded';
};

export const renderPolicySummary = (row: PlatformSettingsAuditRow) =>
  [
    row.managedMediaPolicyBefore !== row.managedMediaPolicyAfter
      ? `Managed media: ${managedMediaPolicyCopy[row.managedMediaPolicyAfter ?? 'all-authenticated-users'].label}`
      : null,
    row.relayAccessPolicyBefore !== row.relayAccessPolicyAfter
      ? `Relay: ${relayAccessPolicyCopy[row.relayAccessPolicyAfter ?? 'paid-subscription'].label}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'No policy change details recorded';

export const renderOperatorActionSummary = (row: OperatorActionAuditRow) => {
  switch (row.actionType) {
    case 'profile_lookup':
      return `Opened account workspace for ${renderProfileLabel(row.target ?? { userId: null, email: null, displayName: null })}`;
    case 'update_profile_access':
      return `Updated access controls for ${renderProfileLabel(row.target ?? { userId: null, email: null, displayName: null })}`;
    case 'update_managed_media_policy':
      return 'Updated the managed media platform policy';
    case 'update_managed_media_operations':
      return 'Updated managed media operating state';
    case 'update_relay_access_policy':
      return 'Updated the self-hosted relay access policy';
    case 'send_password_reset_email':
      return `Sent a password reset email to ${renderProfileLabel(row.target ?? { userId: null, email: null, displayName: null })}`;
    case 'create_support_note':
      return `Saved a support note for ${renderProfileLabel(row.target ?? { userId: null, email: null, displayName: null })}`;
    case 'revoke_relay_session':
      return `Revoked a relay session for ${renderProfileLabel(row.target ?? { userId: null, email: null, displayName: null })}`;
    case 'revoke_server_relay_token':
      return `Revoked a relay token for ${row.server?.name ?? 'a self-hosted server'}`;
    default:
      return row.actionType.replaceAll('_', ' ');
  }
};

export const renderOperatorActionDetail = (row: OperatorActionAuditRow) => {
  if (row.actionType === 'profile_lookup') {
    const selfHostedServers =
      typeof row.metadata.selfHostedServers === 'number' ? row.metadata.selfHostedServers : null;
    const relaySessions =
      typeof row.metadata.relaySessions === 'number' ? row.metadata.relaySessions : null;
    return [
      selfHostedServers !== null ? `${selfHostedServers} self-hosted servers` : null,
      relaySessions !== null ? `${relaySessions} recent relay sessions` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  if (row.actionType === 'update_profile_access') {
    const changedFields = Array.isArray(row.metadata.changedFields)
      ? row.metadata.changedFields.map((value) => String(value).replaceAll('_', ' '))
      : [];
    return changedFields.length > 0 ? changedFields.join(' · ') : 'Access controls changed';
  }

  if (row.actionType === 'update_managed_media_policy') {
    const nextPolicy =
      typeof row.metadata.managedMediaPolicyAfter === 'string'
        ? row.metadata.managedMediaPolicyAfter
        : null;
    return nextPolicy
      ? managedMediaPolicyCopy[nextPolicy as ManagedMediaPolicy]?.description ?? nextPolicy
      : 'Platform policy changed';
  }

  if (row.actionType === 'update_relay_access_policy') {
    const nextPolicy =
      typeof row.metadata.relayAccessPolicyAfter === 'string'
        ? row.metadata.relayAccessPolicyAfter
        : null;
    return nextPolicy
      ? relayAccessPolicyCopy[nextPolicy as RelayAccessPolicy]?.description ?? nextPolicy
      : 'Relay access policy changed';
  }

  if (row.actionType === 'update_managed_media_operations') {
    const nextMode =
      typeof row.metadata.managedMediaOperatingModeAfter === 'string'
        ? row.metadata.managedMediaOperatingModeAfter
        : null;
    const nextMessage =
      typeof row.metadata.managedMediaIncidentMessageAfter === 'string'
        ? row.metadata.managedMediaIncidentMessageAfter
        : '';
    return [nextMode ? `Mode: ${nextMode.replaceAll('-', ' ')}` : null, nextMessage || null]
      .filter(Boolean)
      .join(' · ');
  }

  if (row.actionType === 'send_password_reset_email') {
    return typeof row.metadata.email === 'string'
      ? `Reset email sent to ${row.metadata.email}`
      : 'Password reset email sent';
  }

  if (row.actionType === 'create_support_note') {
    const preview = typeof row.metadata.notePreview === 'string' ? row.metadata.notePreview : null;
    return preview ? preview : 'Support note created';
  }

  if (row.actionType === 'revoke_relay_session') {
    return typeof row.metadata.sessionId === 'string'
      ? `Session ${row.metadata.sessionId} revoked`
      : 'Relay session revoked';
  }

  if (row.actionType === 'revoke_server_relay_token') {
    return typeof row.metadata.tokenId === 'string'
      ? `Token ${row.metadata.tokenId} revoked`
      : 'Relay token revoked';
  }

  return row.server?.name ? `Target server: ${row.server.name}` : 'Sensitive operator action';
};
