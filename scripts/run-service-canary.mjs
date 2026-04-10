import { appendFile } from 'node:fs/promises';

const defaultChecks = [
  {
    name: 'Cloud App',
    url: process.env.APP_SITE_URL?.trim() || 'https://app.omnilux.tv/login',
    expectStatus: (status) => status === 200,
    verifyBody: (body) => body.includes('<div id="root"></div>'),
  },
  {
    name: 'Ops Console',
    url: process.env.OPS_SITE_URL?.trim() || 'https://ops.omnilux.tv/login',
    expectStatus: (status) => status === 200,
    verifyBody: (body) => body.includes('<div id="root"></div>'),
  },
  {
    name: 'Relay',
    url: process.env.RELAY_SITE_URL?.trim() || 'https://relay.omnilux.tv/healthz',
    expectStatus: (status) => status === 200,
    verifyJson: (payload) => payload && payload.ok === true,
  },
  {
    name: 'Managed Media',
    url: process.env.MEDIA_SITE_URL?.trim() || 'https://media.omnilux.tv/api/health',
    expectStatus: (status) => status === 200,
    verifyJson: (payload) => payload && payload.status === 'ok',
  },
  {
    name: 'Docs',
    url: process.env.DOCS_SITE_URL?.trim() || 'https://docs.omnilux.tv/guide/overview',
    expectStatus: (status) => status === 200,
    verifyBody: (body) => body.includes('OmniLux Overview'),
  },
  {
    name: 'Cloud Auth Reachability',
    url: process.env.CLOUD_AUTH_HEALTH_URL?.trim() || 'https://api.omnilux.tv/auth/v1/health',
    expectStatus: (status) => status === 200 || status === 401,
  },
];

const probe = async (check) => {
  const startedAt = Date.now();
  const response = await fetch(check.url, {
    headers: {
      'User-Agent': 'omnilux-service-canary',
    },
    signal: AbortSignal.timeout(10_000),
  });
  const responseTimeMs = Date.now() - startedAt;
  const contentType = response.headers.get('content-type') ?? '';
  const body = await response.text();

  if (!check.expectStatus(response.status)) {
    throw new Error(`${check.name} returned HTTP ${response.status}`);
  }

  if (check.verifyJson) {
    let payload = null;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error(`${check.name} returned invalid JSON`);
    }

    if (!check.verifyJson(payload)) {
      throw new Error(`${check.name} returned an unexpected JSON payload`);
    }
  }

  if (check.verifyBody && !check.verifyBody(body, contentType)) {
    throw new Error(`${check.name} returned an unexpected HTML body`);
  }

  return {
    name: check.name,
    status: response.status,
    responseTimeMs,
  };
};

const main = async () => {
  const failures = [];
  const results = [];
  const summaryLines = ['# OmniLux Service Canary', ''];

  for (const check of defaultChecks) {
    try {
      const result = await probe(check);
      results.push(result);
      console.log(`${result.name}: HTTP ${result.status} in ${result.responseTimeMs}ms`);
      summaryLines.push(`- PASS ${result.name}: HTTP ${result.status} in ${result.responseTimeMs}ms`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown failure';
      failures.push(`${check.name}: ${message}`);
      console.error(`${check.name}: ${message}`);
      summaryLines.push(`- FAIL ${check.name}: ${message}`);
    }
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summaryLines.join('\n')}\n`).catch(() => undefined);
  }

  if (failures.length > 0) {
    console.error('\nService canary failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`\nService canary passed for ${results.length} checks.`);
};

await main();
