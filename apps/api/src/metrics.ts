import client, { Counter, Gauge, Histogram, Registry } from 'prom-client';
import type { FastifyReply, FastifyRequest } from 'fastify';

// Prometheus registry and metrics
export const registry: Registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

// HTTP metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2.5, 5, 10],
});
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
});
export const httpRequestErrorsTotal = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP requests that resulted in 5xx errors',
  labelNames: ['method', 'route'] as const,
});

// WebSocket metrics
export const wsConnections = new Gauge({
  name: 'ws_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['namespace'] as const,
});
export const wsConnectionsTotal = new Counter({
  name: 'ws_connections_total',
  help: 'Total number of WebSocket connections accepted',
  labelNames: ['namespace'] as const,
});

registry.registerMetric(httpRequestDuration);
registry.registerMetric(httpRequestsTotal);
registry.registerMetric(httpRequestErrorsTotal);
registry.registerMetric(wsConnections);
registry.registerMetric(wsConnectionsTotal);

// DB query duration
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of DB queries in seconds',
  labelNames: ['model', 'action'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});
registry.registerMetric(dbQueryDuration);

// Helper to start/observe request durations using Fastify hooks
export function onRequestHook(req: FastifyRequest) {
  (req as any)._startHrTime = process.hrtime.bigint();
}

export function onResponseHook(req: FastifyRequest, reply: FastifyReply) {
  const start = (req as any)._startHrTime as bigint | undefined;
  const method = (req.method || 'GET').toUpperCase();
  const route = (reply.context && (reply.context as any).config && (reply.context as any).config.url) || (req as any).routerPath || req.url || 'unknown';
  const status = String(reply.statusCode || 0);
  if (start) {
    const end = process.hrtime.bigint();
    const diffNs = Number(end - start);
    const seconds = diffNs / 1e9;
    httpRequestDuration.labels(method, route, status).observe(seconds);
  }
  httpRequestsTotal.labels(method, route, status).inc();
  const statusCode = reply.statusCode || 0;
  if (statusCode >= 500) {
    httpRequestErrorsTotal.labels(method, route).inc();
  }
}

export async function metricsHandler(_req: FastifyRequest, reply: FastifyReply) {
  reply.header('Content-Type', registry.contentType);
  const body = await registry.metrics();
  return reply.send(body);
}
