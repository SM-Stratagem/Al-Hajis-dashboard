// ═══════════════════════════════════════════════════════════════
// SQUARE POS CONNECTOR
// ═══════════════════════════════════════════════════════════════
// Square POS integration via Square API v2.
// Provides: transactions, payments, inventory, items catalog.
//
// SETUP:
//   1. Square Developer Dashboard → Create App
//   2. Get Access Token (OAuth or Personal)
//   3. Get Location ID
//   4. Enable Payments, Items, Inventory APIs
//
// API DOCS: https://developer.squareup.com/reference/square
// ═══════════════════════════════════════════════════════════════

import type { IConnectorDriver, ConnectorConfig, TestResult, DataCategory, PullOptions, PullResult, SalesRecord } from './types';

const SQUARE_API = 'https://connect.squareup.com/v2';

export class SquarePOSConnector implements IConnectorDriver {
  readonly systemId = 'square';
  readonly name = 'Square POS';
  readonly supportedCategories: DataCategory[] = ['sales', 'transactions', 'inventory', 'products'];
  readonly supportedDirections = ['pull'] as const;

  async testConnection(config: ConnectorConfig): Promise<TestResult> {
    const start = Date.now();
    const { accessToken, locationId } = config;

    if (!accessToken) {
      return {
        success: false,
        message: 'Missing required config: accessToken',
        details: { accessToken: accessToken ? '✓ provided' : '✗ missing', locationId: locationId ? '✓ provided' : '✗ missing (optional)' },
        latencyMs: Date.now() - start,
      };
    }

    try {
      const response = await fetch(`${SQUARE_API}/locations`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Square-Version': '2024-01-17' },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        const locations = data.locations?.map((l: any) => l.name).join(', ') || 'None';
        return {
          success: true,
          message: `Connected to Square! Locations: ${locations}`,
          details: { locations, ...(locationId ? { selected: locationId } : {}) },
          latencyMs: Date.now() - start,
        };
      }

      return {
        success: false,
        message: `Square API error: HTTP ${response.status}`,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Cannot reach Square: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async pullData(category: DataCategory, config: ConnectorConfig, options?: PullOptions): Promise<PullResult> {
    const { accessToken, locationId } = config;
    if (!accessToken) throw new Error('Square connector requires: accessToken');

    const commonHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Square-Version': '2024-01-17',
      'Content-Type': 'application/json',
    };

    switch (category) {
      case 'sales':
      case 'transactions': {
        const sales: SalesRecord[] = [];
        // Query Square payments for the date range
        const since = options?.sinceDate || this.defaultSince();
        const until = options?.untilDate || new Date().toISOString().split('T')[0];

        let cursor: string | undefined;
        do {
          const params = new URLSearchParams({
            begin_time: new Date(since + 'T00:00:00Z').toISOString(),
            end_time: new Date(until + 'T23:59:59Z').toISOString(),
            sort_order: 'ASC',
            ...(locationId ? { location_id: locationId } : {}),
            ...(cursor ? { cursor } : {}),
          });

          const response = await fetch(`${SQUARE_API}/payments?${params}`, {
            headers: commonHeaders,
            signal: AbortSignal.timeout(30000),
          });

          if (!response.ok) throw new Error(`Square payments API error: ${response.status}`);
          const data = await response.json();
          const payments = data.payments || [];

          for (const p of payments) {
            const dateStr = (p.created_at || '').split('T')[0];
            if (!dateStr) continue;

            const amount = (p.amount_money?.amount || 0) / 100; // Square amounts are in cents
            const cardType = p.card_details?.card?.card_brand || 'OTHER';

            if (p.status === 'COMPLETED') {
              sales.push({
                date: dateStr,
                gross: amount,
                net: amount - ((p.amount_money?.amount || 0) - (p.total_money?.amount || 0)) / 100,
                card: amount,
                cash: 0, // Square doesn't track cash
                receiptCount: 1,
              });
            }
          }

          cursor = data.cursor;
        } while (cursor && (!options?.limit || sales.length < options.limit));

        // Group by date
        const byDate = new Map<string, SalesRecord>();
        for (const s of sales) {
          const existing = byDate.get(s.date) || { date: s.date, gross: 0, net: 0, card: 0, cash: 0, receiptCount: 0 };
          existing.gross += s.gross || 0;
          existing.net += s.net || 0;
          existing.card += s.card || 0;
          existing.receiptCount += s.receiptCount || 0;
          byDate.set(s.date, existing);
        }

        if (category === 'transactions') {
          const transactions = Array.from(byDate.values()).map(s => {
            const d = new Date(s.date + 'T00:00:00Z');
            return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear(), receiptCount: s.receiptCount || 0, totalRevenue: s.net || 0, avgTicketSize: s.receiptCount > 0 ? (s.net || 0) / s.receiptCount : undefined };
          });
          return { type: 'transactions', transactions };
        }

        return { type: 'sales', sales: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)) };
      }

      case 'inventory': {
        const items: any[] = [];
        let cursor: string | undefined;
        do {
          const params = new URLSearchParams({ ...(locationId ? { location_id: locationId } : {}), ...(cursor ? { cursor } : {}) });
          const response = await fetch(`${SQUARE_API}/inventory?${params}`, { headers: commonHeaders, signal: AbortSignal.timeout(30000) });
          if (!response.ok) throw new Error(`Square inventory API error: ${response.status}`);
          const data = await response.json();
          items.push(...(data.counts || []));
          cursor = data.cursor;
        } while (cursor);

        const inventoryItems = items.map((c: any) => ({
          sku: c.catalog_object_id || c.catalog_object?.variations?.[0]?.id || 'UNKNOWN',
          name: c.catalog_object?.item_data?.name || c.catalog_object?.variations?.[0]?.item_variation_data?.name || 'Unknown',
          category: c.catalog_object?.item_data?.category_id || 'Other',
          currentQtyL: Number(c.quantity) || 0,
          minThresholdL: undefined,
          unitCostAED: undefined,
          supplier: undefined,
        }));

        return { type: 'inventory', items: inventoryItems };
      }

      case 'products': {
        const params = new URLSearchParams({ ...(locationId ? { location_id: locationId } : {}) });
        const response = await fetch(`${SQUARE_API}/catalog/list?${params}`, { headers: commonHeaders, signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`Square catalog API error: ${response.status}`);
        const data = await response.json();

        const products = (data.objects || [])
          .filter((o: any) => o.type === 'ITEM')
          .map((item: any) => ({
            name: item.item_data?.name || 'Unknown',
            sku: item.item_data?.variations?.[0]?.id || undefined,
            category: item.item_data?.category_id || 'Other',
            quantitySold: 0, // Square doesn't provide this in catalog API
            revenue: undefined,
            unitCost: undefined,
            unitPrice: item.item_data?.variations?.[0]?.item_variation_data?.price_money
              ? (item.item_data.variations[0].item_variation_data.price_money.amount || 0) / 100
              : undefined,
          }));

        return { type: 'products', products };
      }

      default:
        throw new Error(`Square POS does not support category: ${category}`);
    }
  }

  private defaultSince(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  }
}
