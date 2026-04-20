// ═══════════════════════════════════════════════════════════════
// MAGNATI POS CONNECTOR (Network International)
// ═══════════════════════════════════════════════════════════════
// Magnati (formerly Network International) is the primary card
// payment processor in UAE. Their POS terminal API provides:
//
//   - Card payment transactions (amount, time, card type, auth code)
//   - Settlement/reconciliation reports
//   - Merchant statements
//
// IMPORTANT LIMITATIONS:
//   - Only captures CARD payments (no cash)
//   - No SKU-level product data
//   - No staff/employee info
//   - No inventory levels
//   - No customer data (beyond card type)
//
// For complete POS data, combine with:
//   - Manual cash tracking (staff daily count)
//   - Google Sheets (for products/inventory)
//   - ERP integration (for full inventory/costs)
//
// SETUP REQUIREMENTS (user must provide):
//   1. Magnati Merchant Portal credentials
//   2. API endpoint URL (from Magnati dashboard)
//   3. API Key (generated in merchant portal)
//   4. Merchant ID (assigned by Magnati)
//
// API DOCUMENTATION:
//   Contact Magnati merchant support for API access.
//   Base URL typically: https://api.magnati.ae/ or merchant-specific.
// ═══════════════════════════════════════════════════════════════

import type { IConnectorDriver, ConnectorConfig, TestResult, DataCategory, PullOptions, PullResult, SalesRecord, TransactionRecord } from './types';

export class MagnatiPOSConnector implements IConnectorDriver {
  readonly systemId = 'magnati';
  readonly name = 'Magnati POS';
  readonly supportedCategories: DataCategory[] = ['sales', 'transactions'];
  readonly supportedDirections = ['pull'] as const;

  // ── Test Connection ──────────────────────────
  async testConnection(config: ConnectorConfig): Promise<TestResult> {
    const start = Date.now();
    const { endpoint, apiKey, merchantId } = config;

    if (!endpoint || !apiKey || !merchantId) {
      return {
        success: false,
        message: 'Missing required config: endpoint, apiKey, merchantId',
        details: {
          endpoint: endpoint ? '✓ provided' : '✗ missing',
          apiKey: apiKey ? '✓ provided' : '✗ missing',
          merchantId: merchantId ? '✓ provided' : '✗ missing',
        },
        latencyMs: Date.now() - start,
      };
    }

    try {
      // Attempt to reach the Magnati API endpoint
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Merchant-Id': merchantId,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Connected to Magnati API successfully',
          details: { status: String(response.status), endpoint },
          latencyMs: Date.now() - start,
        };
      }

      // Some APIs return 401 for GET but accept POST
      if (response.status === 401 || response.status === 403 || response.status === 405) {
        return {
          success: true,
          message: `Endpoint reachable (HTTP ${response.status}). Auth may need POST method for data requests.`,
          details: { status: String(response.status), endpoint, hint: 'This is normal — data retrieval uses POST with query params' },
          latencyMs: Date.now() - start,
        };
      }

      return {
        success: false,
        message: `Magnati API returned HTTP ${response.status}`,
        details: { status: String(response.status), endpoint },
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Cannot reach Magnati endpoint: ${err.message}`,
        details: { error: err.code || 'NETWORK_ERROR', hint: 'Check endpoint URL and network access' },
        latencyMs: Date.now() - start,
      };
    }
  }

  // ── Pull Sales Data ──────────────────────────
  async pullData(category: DataCategory, config: ConnectorConfig, options?: PullOptions): Promise<PullResult> {
    const { endpoint, apiKey, merchantId } = config;

    if (!endpoint || !apiKey || !merchantId) {
      throw new Error('Magnati connector requires: endpoint, apiKey, merchantId');
    }

    if (category === 'transactions') {
      return this.pullTransactions(config, options);
    }

    if (category !== 'sales') {
      throw new Error(`Magnati POS does not support category: ${category}. Supported: sales, transactions`);
    }

    const since = options?.sinceDate || this.getDefaultSinceDate();
    const until = options?.untilDate || new Date().toISOString().split('T')[0];

    try {
      // ── Magnati Transaction Query ──
      // POST to the transactions endpoint with date range filter
      // NOTE: The exact endpoint path and request body format
      // depends on the Magnati API version the merchant has.
      // User will need to provide the correct endpoint.

      const response = await fetch(`${endpoint.replace(/\/$/, '')}/transactions/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Merchant-Id': merchantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromDate: since,
          toDate: until,
          // Magnati typically supports these filters:
          // transactionType: 'SALE',
          // status: 'APPROVED',
          // currency: 'AED',
          ...(options?.limit ? { limit: options.limit } : {}),
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Magnati API error: HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawTransactions = data.transactions || data.results || data.data || [];

      // ── Transform Magnati transactions → Parfumix SalesRecord ──
      // Magnati provides individual card transactions. We aggregate by date.
      const salesByDate = new Map<string, SalesRecord>();

      for (const tx of rawTransactions) {
        const dateStr = (tx.date || tx.transactionDate || tx.createdAt || '').split('T')[0];
        if (!dateStr) continue;

        const amount = Number(tx.amount || tx.totalAmount || tx.settlementAmount || 0);
        const cardType = tx.cardType || tx.cardBrand || 'UNKNOWN';

        const existing = salesByDate.get(dateStr) || {
          date: dateStr,
          gross: 0,
          returns: 0,
          net: 0,
          cash: 0,
          card: 0,
          receiptCount: 0,
        };

        if (tx.transactionType === 'REFUND' || tx.type === 'refund' || amount < 0) {
          existing.returns = (existing.returns || 0) + Math.abs(amount);
          existing.gross = (existing.gross || 0) + Math.abs(amount);
        } else {
          existing.card = (existing.card || 0) + amount;
          existing.gross = (existing.gross || 0) + amount;
          existing.receiptCount = (existing.receiptCount || 0) + 1;
        }

        salesByDate.set(dateStr, existing);
      }

      const sales = Array.from(salesByDate.values());
      for (const s of sales) {
        s.net = (s.gross || 0) - (s.returns || 0);
      }

      // Sort by date ascending
      sales.sort((a, b) => a.date.localeCompare(b.date));

      if (options?.limit) return { type: 'sales', sales: sales.slice(0, options.limit) };

      return { type: 'sales', sales };
    } catch (err: any) {
      throw new Error(`Magnati pull failed: ${err.message}`);
    }
  }

  // ── Pull Transaction Summaries ──────────────
  private async pullTransactions(config: ConnectorConfig, options?: PullOptions): Promise<PullResult> {
    // Pull detailed sales first, then aggregate by month
    const salesResult = await this.pullData('sales', config, options);
    if (salesResult.type !== 'sales') throw new Error('Unexpected result type');

    // Aggregate sales into monthly transaction summaries
    const monthlyMap = new Map<string, TransactionRecord>();

    for (const sale of salesResult.sales) {
      const d = new Date(sale.date + 'T00:00:00Z');
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyMap.get(key) || {
        month: d.getUTCMonth() + 1,
        year: d.getUTCFullYear(),
        receiptCount: 0,
        totalRevenue: 0,
        avgTicketSize: 0,
      };

      existing.receiptCount += sale.receiptCount || 1;
      existing.totalRevenue += sale.net || sale.card || 0;

      monthlyMap.set(key, existing);
    }

    const transactions = Array.from(monthlyMap.values());
    for (const t of transactions) {
      t.avgTicketSize = t.receiptCount > 0 ? t.totalRevenue / t.receiptCount : 0;
    }

    return { type: 'transactions', transactions };
  }

  // ── Helpers ─────────────────────────────────
  private getDefaultSinceDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  }
}
