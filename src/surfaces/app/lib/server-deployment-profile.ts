export type ServerDeploymentProfile = 'self-hosted' | 'managed-media';

export function normalizeServerDeploymentProfile(value: string | null | undefined): ServerDeploymentProfile {
  switch (value) {
    case 'managed-media':
      return value;
    default:
      return 'self-hosted';
  }
}

export function getServerDeploymentProfileLabel(profile: ServerDeploymentProfile): string {
  switch (profile) {
    case 'managed-media':
      return 'Managed media';
    default:
      return 'Self-hosted';
  }
}

export function isSelfHostedDeploymentProfile(profile: string | null | undefined): boolean {
  return normalizeServerDeploymentProfile(profile) === 'self-hosted';
}

export function isManagedMediaDeploymentProfile(profile: string | null | undefined): boolean {
  return normalizeServerDeploymentProfile(profile) === 'managed-media';
}
