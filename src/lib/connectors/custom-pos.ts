// ═══════════════════════════════════════════════════════════════
// CUSTOM POS CONNECTOR
// ═══════════════════════════════════════════════════════════════
// A flexible connector for any REST-based POS system.
// The user provides the endpoint URL and auth header.
// The POS must return data in the Parfumix ingest format.
//
// EXPECTED RESPONSE FORMAT (at {endpoint}/sales):
// {
//   "sales": [
//     { "date": "2026-04-20", "gross": 4500, "net": 4380, "cash": 1500, "card": 2880 }
//   ]
// }
//
// The response format matches /api/ingest/sales exactly,
// so any system that can produce this format works.
// ═══════════════════════════════════════════════════════════════

import type { IConnectorDriver, ConnectorConfig, TestResult, DataCategory, PullOptions, PullResult, SalesRecord } from './types';

export class CustomPOSConnector implements IConnectorDriver {
  readonly systemId = 'custom';
  readonly name = 'Custom POS';
  readonly supportedCategories: DataCategory[] = ['sales', 'inventory', 'transactions', 'products', 'staff', 'expenses'];
  readonly supportedDirections = ['pull', 'push'] as const;

  async testConnection(config: ConnectorConfig): Promise<TestResult> {
    const start = Date.now();
    const { endpoint, authHeader } = config;

    if (!endpoint) {
      return {
        success: false,
        message: 'Missing required config: endpoint',
        latencyMs: Date.now() - start,
      };
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authHeader) headers['Authorization'] = authHeader;

      const response = await fetch(endpoint.replace(/\/$/, ''), {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      });

      return {
        success: response.ok || response.status === 405,
        message: response.ok
          ? 'Connected successfully'
          : `Endpoint reachable (HTTP ${response.status}). May need POST for data.`,
        details: { status: String(response.status), endpoint },
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Cannot reach endpoint: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async pullData(category: DataCategory, config: ConnectorConfig, options?: PullOptions): Promise<PullResult> {
    const { endpoint, authHeader } = config;
    if (!endpoint) throw new Error('Custom POS connector requires: endpoint');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    const queryParams = new URLSearchParams();
    if (options?.sinceDate) queryParams.set('since', options.sinceDate);
    if (options?.untilDate) queryParams.set('until', options.untilDate);
    if (options?.limit) queryParams.set('limit', String(options.limit));

    const qs = queryParams.toString();
    const url = `${endpoint.replace(/\/$/, '')}/${category}${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Custom POS API error: HTTP ${response.status}`);
    }

    const data = await response.json();

    // The external system should return data in Parfumix format
    switch (category) {
      case 'sales': return { type: 'sales', sales: (data.sales || data.data || []) as SalesRecord[] };
      case 'inventory': return { type: 'inventory', items: data.items || data.data || [] };
      case 'transactions': return { type: 'transactions', transactions: data.transactions || data.data || [] };
      case 'products': return { type: 'products', products: data.products || data.data || [] };
      case 'staff': return { type: 'staff', staffCosts: data.staffCosts || data.staff || data.data || [] };
      case 'expenses': return { type: 'expenses', expenses: data.expenses || data.data || [] };
      case 'consumption': return { type: 'consumption', consumptions: data.consumptions || data.data || [] };
    }
  }
}
