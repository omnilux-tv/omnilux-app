export type ServerDeploymentProfile = 'self-hosted' | 'managed-media' | 'ops';

export function normalizeServerDeploymentProfile(value: string | null | undefined): ServerDeploymentProfile {
  switch (value) {
    case 'managed-media':
    case 'ops':
      return value;
    default:
      return 'self-hosted';
  }
}

export function getServerDeploymentProfileLabel(profile: ServerDeploymentProfile): string {
  switch (profile) {
    case 'managed-media':
      return 'Managed media';
    case 'ops':
      return 'Ops';
    default:
      return 'Self-hosted';
  }
}

export function isSelfHostedDeploymentProfile(profile: string | null | undefined): boolean {
  return normalizeServerDeploymentProfile(profile) === 'self-hosted';
}

export function isManagedDeploymentProfile(profile: string | null | undefined): boolean {
  return !isSelfHostedDeploymentProfile(profile);
}

export function isManagedMediaDeploymentProfile(profile: string | null | undefined): boolean {
  return normalizeServerDeploymentProfile(profile) === 'managed-media';
}

export function isOpsDeploymentProfile(profile: string | null | undefined): boolean {
  return normalizeServerDeploymentProfile(profile) === 'ops';
}
