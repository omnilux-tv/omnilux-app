type WebVitalMetric = import('web-vitals').Metric;

let monitoringStarted = false;

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const webVitalsEndpoint = import.meta.env.VITE_WEB_VITALS_ENDPOINT;

const sendWebVital = (metric: WebVitalMetric) => {
  if (!webVitalsEndpoint || typeof window === 'undefined') {
    return;
  }

  const body = JSON.stringify({
    ...metric,
    pathname: window.location.pathname,
    search: window.location.search,
    timestamp: Date.now(),
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(webVitalsEndpoint, new Blob([body], { type: 'application/json' }));
    return;
  }

  void fetch(webVitalsEndpoint, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  });
};

export const setupMonitoring = async () => {
  if (monitoringStarted || typeof window === 'undefined') {
    return;
  }

  monitoringStarted = true;

  if (sentryDsn) {
    const Sentry = await import('@sentry/browser');
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
    });
  }

  if (webVitalsEndpoint) {
    const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');
    onCLS(sendWebVital);
    onFCP(sendWebVital);
    onINP(sendWebVital);
    onLCP(sendWebVital);
    onTTFB(sendWebVital);
  }
};
