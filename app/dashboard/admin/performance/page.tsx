'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Database,
  Server,
  Clock,
  AlertTriangle,
  RefreshCw,
  Cpu,
  HardDrive,
  Zap,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: string; latency?: number };
    redis: { status: string; latency?: number };
    memory: { heapUsed: number; heapTotal: number; rss: number };
  };
}

interface MetricsData {
  timestamp: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics: any[];
  tracing: {
    totalSpans: number;
    activeSpans: number;
    avgDuration: number;
    errorRate: number;
    slowestOperations: { operation: string; avgDuration: number }[];
  };
  errors: {
    totalErrors: number;
    last24h: number;
    bySeverity: Record<string, number>;
    topErrors: { error_type: string; count: number }[];
  };
}

interface HistoryEntry {
  time: string;
  dbLatency: number;
  redisLatency: number;
  heapUsed: number;
  rss: number;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    healthy: 'bg-green-100 text-green-800',
    connected: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    not_configured: 'bg-gray-100 text-gray-600',
    unhealthy: 'bg-red-100 text-red-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function PerformanceDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, metricsRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/metrics'),
      ]);

      if (healthRes.ok) {
        const healthData: HealthData = await healthRes.json();
        setHealth(healthData);

        setHistory((prev) => {
          const entry: HistoryEntry = {
            time: new Date().toLocaleTimeString(),
            dbLatency: healthData.checks.database.latency || 0,
            redisLatency: healthData.checks.redis.latency || 0,
            heapUsed: healthData.checks.memory.heapUsed,
            rss: healthData.checks.memory.rss,
          };
          const updated = [...prev, entry];
          return updated.slice(-30); // Keep last 30 entries
        });
      }

      if (metricsRes.ok) {
        const metricsData: MetricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-lg text-gray-600">Loading performance data...</span>
      </div>
    );
  }

  const severityData = metrics?.errors.bySeverity
    ? Object.entries(metrics.errors.bySeverity).map(([name, value]) => ({ name, value }))
    : [];

  const topErrorsData = metrics?.errors.topErrors || [];
  const slowOps = metrics?.tracing.slowestOperations || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-600" />
            Performance Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            System health, metrics, and performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
            disabled={!autoRefresh}
          >
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Overview */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">System Status</span>
              </div>
              <StatusBadge status={health.status} />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-gray-900">{health.status}</p>
              <p className="text-xs text-gray-500">v{health.version}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Uptime</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatUptime(health.uptime)}
            </p>
            <p className="text-xs text-gray-500">since last restart</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Database</span>
              </div>
              <StatusBadge status={health.checks.database.status} />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {health.checks.database.latency ?? '—'}ms
            </p>
            <p className="text-xs text-gray-500">response latency</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Redis Cache</span>
              </div>
              <StatusBadge status={health.checks.redis.status} />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {health.checks.redis.latency !== undefined ? `${health.checks.redis.latency}ms` : 'N/A'}
            </p>
            <p className="text-xs text-gray-500">
              {health.checks.redis.status === 'not_configured' ? 'not configured' : 'response latency'}
            </p>
          </div>
        </div>
      )}

      {/* Memory & Latency Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4" />
            Memory Usage Over Time (MB)
          </h3>
          {history.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="heapUsed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Heap Used"
                />
                <Line
                  type="monotone"
                  dataKey="rss"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="RSS"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
              Collecting data...
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" />
            Service Latency Over Time (ms)
          </h3>
          {history.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="dbLatency"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="DB Latency"
                />
                <Line
                  type="monotone"
                  dataKey="redisLatency"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="Redis Latency"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
              Collecting data...
            </div>
          )}
        </div>
      </div>

      {/* Memory Gauge */}
      {health && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <HardDrive className="w-4 h-4" />
            Current Memory Usage
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Heap Used</span>
                <span className="font-medium">{health.checks.memory.heapUsed} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{
                    width: `${Math.min(100, (health.checks.memory.heapUsed / health.checks.memory.heapTotal) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                of {health.checks.memory.heapTotal} MB total heap
              </p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Heap Total</span>
                <span className="font-medium">{health.checks.memory.heapTotal} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-500 h-2.5 rounded-full"
                  style={{
                    width: `${Math.min(100, (health.checks.memory.heapTotal / health.checks.memory.rss) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">of {health.checks.memory.rss} MB RSS</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">RSS</span>
                <span className="font-medium">{health.checks.memory.rss} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: '100%' }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">resident set size</p>
            </div>
          </div>
        </div>
      )}

      {/* Tracing & Errors */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tracing Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" />
              Request Tracing
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total Spans</p>
                <p className="text-xl font-bold text-gray-900">{metrics.tracing.totalSpans}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Active Spans</p>
                <p className="text-xl font-bold text-gray-900">{metrics.tracing.activeSpans}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Avg Duration</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics.tracing.avgDuration.toFixed(1)}ms
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Error Rate</p>
                <p className="text-xl font-bold text-gray-900">
                  {(metrics.tracing.errorRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {slowOps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Slowest Operations</p>
                <div className="space-y-2">
                  {slowOps.slice(0, 5).map((op, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate max-w-[200px]">{op.operation}</span>
                      <span className="font-mono text-gray-500">{op.avgDuration.toFixed(1)}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4" />
              Error Tracking
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total Errors</p>
                <p className="text-xl font-bold text-gray-900">{metrics.errors.totalErrors}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Last 24h</p>
                <p className="text-xl font-bold text-red-600">{metrics.errors.last24h}</p>
              </div>
            </div>

            {severityData.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">By Severity</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {severityData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {topErrorsData.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Top Errors (24h)</p>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={topErrorsData.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="error_type"
                      tick={{ fontSize: 11 }}
                      width={120}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-xs text-gray-400">
        Last updated: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : '—'}
      </div>
    </div>
  );
}
