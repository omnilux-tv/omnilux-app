interface WorkosAuthorizationRequest {
  state: { returnTo: string };
  loginHint?: string;
}

interface WorkosAuthorizationConfig {
  apiHostname: string;
  clientId: string;
  redirectUri: string;
  screenHint?: 'sign-up';
}

interface NavigateToWorkosAuthorizationOptions {
  ready: boolean;
  getAuthorizationUrl: (request: WorkosAuthorizationRequest) => Promise<string>;
  request: WorkosAuthorizationRequest;
  config: WorkosAuthorizationConfig;
  replaceLocation: (url: string) => void;
}

const PKCE_CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

const getExpectedAuthorizationOrigin = (apiHostname: string) => {
  const hostname = apiHostname.trim() || 'api.workos.com';
  const expected = new URL(`https://${hostname}`);

  if (
    expected.username ||
    expected.password ||
    expected.pathname !== '/' ||
    expected.search ||
    expected.hash
  ) {
    throw new Error('The WorkOS API hostname is invalid.');
  }

  return expected.origin;
};

export const validateWorkosAuthorizationUrl = (
  generatedUrl: string,
  request: WorkosAuthorizationRequest,
  config: WorkosAuthorizationConfig,
) => {
  if (!generatedUrl) {
    throw new Error('WorkOS AuthKit did not return an authorization URL.');
  }

  const destination = new URL(generatedUrl);
  const expectedOrigin = getExpectedAuthorizationOrigin(config.apiHostname);
  const state = destination.searchParams.get('state');
  let parsedState: unknown;

  try {
    parsedState = state ? JSON.parse(state) : null;
  } catch {
    throw new Error('WorkOS AuthKit returned an invalid authorization state.');
  }

  if (
    destination.protocol !== 'https:' ||
    destination.origin !== expectedOrigin ||
    destination.pathname !== '/user_management/authorize' ||
    destination.username ||
    destination.password ||
    destination.hash ||
    destination.searchParams.get('client_id') !== config.clientId ||
    destination.searchParams.get('redirect_uri') !== config.redirectUri ||
    destination.searchParams.get('response_type') !== 'code' ||
    destination.searchParams.get('provider') !== 'authkit' ||
    destination.searchParams.get('code_challenge_method') !== 'S256' ||
    !PKCE_CODE_CHALLENGE_PATTERN.test(destination.searchParams.get('code_challenge') ?? '') ||
    destination.searchParams.get('screen_hint') !== (config.screenHint ?? null) ||
    (request.loginHint || null) !== destination.searchParams.get('login_hint') ||
    !parsedState ||
    typeof parsedState !== 'object' ||
    (parsedState as { returnTo?: unknown }).returnTo !== request.state.returnTo
  ) {
    throw new Error('WorkOS AuthKit returned an unsafe authorization URL.');
  }

  return destination.toString();
};

export const navigateToWorkosAuthorization = async ({
  ready,
  getAuthorizationUrl,
  request,
  config,
  replaceLocation,
}: NavigateToWorkosAuthorizationOptions) => {
  if (!ready) {
    return false;
  }

  const generatedUrl = await getAuthorizationUrl(request);
  replaceLocation(validateWorkosAuthorizationUrl(generatedUrl, request, config));
  return true;
};
