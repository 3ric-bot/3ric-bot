const startTime = Date.now();

const requestCounters = new Map();
const latencyStats = new Map();
const errorEvents = [];

function keyFor(name, labels = {}) {
  const sorted = Object.keys(labels)
    .sort()
    .map((label) => `${label}:${labels[label]}`)
    .join('|');
  return `${name}|${sorted}`;
}

function incrementCounter(name, labels = {}, value = 1) {
  const key = keyFor(name, labels);
  const current = requestCounters.get(key) || 0;
  requestCounters.set(key, current + value);
}

function observeLatency(name, value, labels = {}) {
  const key = keyFor(name, labels);
  const current = latencyStats.get(key) || {
    count: 0,
    sum: 0,
    max: 0,
    min: Number.POSITIVE_INFINITY
  };
  current.count += 1;
  current.sum += value;
  current.max = Math.max(current.max, value);
  current.min = Math.min(current.min, value);
  latencyStats.set(key, current);
}

function trackHttpRequest({ method, route, status, durationMs, role = 'anonymous' }) {
  const statusFamily = `${Math.floor(status / 100)}xx`;
  incrementCounter('http_requests_total', { method, route, status: statusFamily, role });
  observeLatency('http_request_duration_ms', durationMs, { method, route, status: statusFamily });
}

function recordError(error, context = {}) {
  errorEvents.unshift({
    at: new Date().toISOString(),
    message: error?.message || String(error),
    stack: error?.stack || null,
    context
  });
  if (errorEvents.length > 200) {
    errorEvents.pop();
  }
}

function renderPrometheusMetrics() {
  const lines = [
    '# HELP http_requests_total Total number of HTTP requests processed',
    '# TYPE http_requests_total counter'
  ];
  for (const [key, value] of requestCounters.entries()) {
    const [, labels] = key.split('|');
    const labelString = labels
      .split('|')
      .filter(Boolean)
      .map((entry) => {
        const [labelKey, labelValue] = entry.split(':');
        return `${labelKey}="${labelValue}"`;
      })
      .join(',');
    lines.push(`http_requests_total{${labelString}} ${value}`);
  }
  lines.push('# HELP http_request_duration_ms Average request duration in milliseconds');
  lines.push('# TYPE http_request_duration_ms summary');
  for (const [key, stat] of latencyStats.entries()) {
    const [, labels] = key.split('|');
    const labelString = labels
      .split('|')
      .filter(Boolean)
      .map((entry) => {
        const [labelKey, labelValue] = entry.split(':');
        return `${labelKey}="${labelValue}"`;
      })
      .join(',');
    if (!stat.count) continue;
    const avg = stat.sum / stat.count;
    lines.push(`http_request_duration_ms_count{${labelString}} ${stat.count}`);
    lines.push(`http_request_duration_ms_sum{${labelString}} ${stat.sum.toFixed(4)}`);
    lines.push(`http_request_duration_ms_avg{${labelString}} ${avg.toFixed(4)}`);
    lines.push(`http_request_duration_ms_max{${labelString}} ${stat.max.toFixed(4)}`);
    lines.push(`http_request_duration_ms_min{${labelString}} ${stat.min.toFixed(4)}`);
  }
  lines.push(`# HELP learnzo_uptime_seconds Seconds since the service booted`);
  lines.push('# TYPE learnzo_uptime_seconds gauge');
  lines.push(`learnzo_uptime_seconds ${Math.floor((Date.now() - startTime) / 1000)}`);
  return `${lines.join('\n')}\n`;
}

function getHealthSnapshot() {
  return {
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    recentErrors: errorEvents.slice(0, 5)
  };
}

function resetObservability() {
  requestCounters.clear();
  latencyStats.clear();
  errorEvents.length = 0;
}

module.exports = {
  trackHttpRequest,
  recordError,
  renderPrometheusMetrics,
  getHealthSnapshot,
  resetObservability
};
