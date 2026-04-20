// ═══════════════════════════════════════════════════════════════
// SAP BUSINESS ONE CONNECTOR
// ═══════════════════════════════════════════════════════════════
// SAP B1 integration via Service Layer (REST API).
// Requires SAP B1 Service Layer URL and user credentials.
//
// SETUP:
//   1. Enable Service Layer in SAP B1 → Administration → System Initialization
//   2. Create API user with appropriate authorizations
//   3. Get: endpoint URL, username, password
//
// API DOCS: https://help.sap.com/docs/SAP_BUSINESS_ONE
// ═══════════════════════════════════════════════════════════════

import type { IConnectorDriver, ConnectorConfig, TestResult, DataCategory, PullOptions, PullResult, InventoryRecord, ProductRecord, SalesRecord } from './types';

export class SAPConnector implements IConnectorDriver {
  readonly systemId = 'sap';
  readonly name = 'SAP B1';
  readonly supportedCategories: DataCategory[] = ['sales', 'inventory', 'products', 'staff', 'expenses'];
  readonly supportedDirections = ['pull'] as const;

  private cachedSession: { sessionId: string; routeId: string; baseUrl: string; expiresAt: number } | null = null;

  async testConnection(config: ConnectorConfig): Promise<TestResult> {
    const start = Date.now();
    const { endpoint, username, password } = config;

    if (!endpoint || !username || !password) {
      return {
        success: false,
        message: 'Missing required config: endpoint, username, password',
        details: {
          endpoint: endpoint ? '✓ provided' : '✗ missing',
          username: username ? '✓ provided' : '✗ missing',
          password: password ? '✓ provided' : '✗ missing',
        },
        latencyMs: Date.now() - start,
      };
    }

    try {
      const baseUrl = endpoint.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ UserName: username, Password: password }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const sessionId = response.headers.get('set-cookie') || 'session-active';
        return {
          success: true,
          message: 'Connected to SAP B1 Service Layer!',
          details: { session: '✓ authenticated', endpoint: baseUrl },
          latencyMs: Date.now() - start,
        };
      }

      return {
        success: false,
        message: `SAP B1 login failed: HTTP ${response.status}`,
        details: { hint: 'Check credentials and Service Layer availability' },
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Cannot reach SAP B1: ${err.message}`,
        details: { hint: 'Ensure Service Layer is running and endpoint is accessible' },
        latencyMs: Date.now() - start,
      };
    }
  }

  async pullData(category: DataCategory, config: ConnectorConfig, options?: PullOptions): Promise<PullResult> {
    const { endpoint, username, password } = config;
    if (!endpoint || !username || !password) throw new Error('SAP connector requires: endpoint, username, password');

    const baseUrl = endpoint.replace(/\/$/, '');

    // Authenticate
    const loginResponse = await fetch(`${baseUrl}/Login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ UserName: username, Password: password }),
      signal: AbortSignal.timeout(10000),
    });

    if (!loginResponse.ok) throw new Error(`SAP B1 authentication failed: ${loginResponse.status}`);
    const cookie = loginResponse.headers.get('set-cookie') || '';

    const fetchHeaders = { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) };

    try {
      switch (category) {
        case 'inventory': {
          const response = await fetch(`${baseUrl}/Items?$filter=QuantityOnStock gt 0&$select=ItemCode,ItemName,ItemsGroupCode,QuantityOnStock,LastPurchasePrice`, {
            headers: fetchHeaders,
            signal: AbortSignal.timeout(30000),
          });
          const data = await response.json();
          const items: InventoryRecord[] = (data.value || []).map((r: any) => ({
            sku: r.ItemCode,
            name: r.ItemName,
            category: r.ItemsGroupCode || 'Other',
            currentQtyL: r.QuantityOnStock || 0,
            minThresholdL: undefined,
            unitCostAED: r.LastPurchasePrice || undefined,
            supplier: undefined,
          }));
          return { type: 'inventory', items };
        }

        case 'products': {
          const response = await fetch(`${baseUrl}/Items?$filter=SellItem eq 'tYES'&$select=ItemCode,ItemName,ItemsGroupCode,LastPurchasePrice,ItemPrices`, {
            headers: fetchHeaders,
            signal: AbortSignal.timeout(30000),
          });
          const data = await response.json();
          const products: ProductRecord[] = (data.value || []).map((r: any) => ({
            name: r.ItemName || 'Unknown',
            sku: r.ItemCode || undefined,
            category: r.ItemsGroupCode || 'Other',
            quantitySold: 0,
            revenue: undefined,
            unitCost: r.LastPurchasePrice || undefined,
            unitPrice: Array.isArray(r.ItemPrices) && r.ItemPrices.length > 0 ? r.ItemPrices[0].Price : undefined,
          }));
          return { type: 'products', products };
        }

        case 'sales': {
          const dateFilter = [];
          if (options?.sinceDate) dateFilter.push(`DocDate ge '${options.sinceDate}'`);
          if (options?.untilDate) dateFilter.push(`DocDate le '${options.untilDate}'`);

          const filter = dateFilter.length > 0
            ? `${dateFilter.join(' and ')} and DocumentStatus eq 'bost_Close'`
            : "DocumentStatus eq 'bost_Close'";

          const response = await fetch(`${baseUrl}/Orders?$filter=${encodeURIComponent(filter)}&$select=DocDate,DocTotal,DocNum&$orderby=DocDate asc`, {
            headers: fetchHeaders,
            signal: AbortSignal.timeout(30000),
          });
          const data = await response.json();

          const salesByDate = new Map<string, SalesRecord>();
          for (const order of (data.value || [])) {
            const dateStr = (order.DocDate || '').split('T')[0];
            if (!dateStr) continue;
            const existing = salesByDate.get(dateStr) || { date: dateStr, gross: 0, net: 0, receiptCount: 0 };
            existing.gross += order.DocTotal || 0;
            existing.net += order.DocTotal || 0;
            existing.receiptCount += 1;
            salesByDate.set(dateStr, existing);
          }

          return { type: 'sales', sales: Array.from(salesByDate.values()).sort((a, b) => a.date.localeCompare(b.date)) };
        }

        default:
          throw new Error(`SAP B1 does not support category: ${category} yet. Supported: sales, inventory, products.`);
      }
    } finally {
      // Logout
      try { await fetch(`${baseUrl}/Logout`, { method: 'POST', headers: fetchHeaders }); } catch {}
    }
  }
}
