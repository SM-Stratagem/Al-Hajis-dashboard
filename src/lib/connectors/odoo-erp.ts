// ═══════════════════════════════════════════════════════════════
// ODOO ERP CONNECTOR
// ═══════════════════════════════════════════════════════════════
// Odoo ERP integration via XML-RPC or REST API (depending on version).
// Odoo provides: inventory, sales orders, purchase orders, products,
// accounting, HR (staff costs), and more.
//
// SETUP:
//   1. Enable "External API" in Odoo Settings → General
//   2. Create API user with appropriate permissions
//   3. Get: URL, Database name, Username, API Key/Password
//   4. Install relevant modules: sale, stock, purchase, hr
//
// API DOCS: https://www.odoo.com/documentation
// ═══════════════════════════════════════════════════════════════

import type { IConnectorDriver, ConnectorConfig, TestResult, DataCategory, PullOptions, PullResult, InventoryRecord, ProductRecord, SalesRecord } from './types';

export class OdooERPConnector implements IConnectorDriver {
  readonly systemId = 'odoo';
  readonly name = 'Odoo ERP';
  readonly supportedCategories: DataCategory[] = ['sales', 'inventory', 'products', 'staff', 'expenses'];
  readonly supportedDirections = ['pull'] as const;

  async testConnection(config: ConnectorConfig): Promise<TestResult> {
    const start = Date.now();
    const { url, database, username, apiKey } = config;

    if (!url || !username || !apiKey) {
      return {
        success: false,
        message: 'Missing required config: url, username, apiKey',
        details: {
          url: url ? '✓ provided' : '✗ missing',
          database: database ? '✓ provided' : '⚠ optional',
          username: username ? '✓ provided' : '✗ missing',
          apiKey: apiKey ? '✓ provided' : '✗ missing',
        },
        latencyMs: Date.now() - start,
      };
    }

    try {
      // Test with Odoo JSON-RPC /web/session/authenticate
      const response = await fetch(`${url.replace(/\/$/, '')}/web/session/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            db: database,
            login: username,
            password: apiKey,
          },
          id: 1,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.json();
      if (data.result?.uid) {
        return {
          success: true,
          message: `Connected to Odoo! Database: ${database || 'default'}, User: ${username}`,
          details: { database: database || 'default', username },
          latencyMs: Date.now() - start,
        };
      }

      return {
        success: false,
        message: `Odoo auth failed: ${data.error?.data?.message || data.error?.message || 'Invalid credentials'}`,
        details: { error: data.error?.data?.name || 'AUTH_ERROR' },
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Cannot reach Odoo: ${err.message}`,
        details: { hint: 'Ensure the URL is correct and External API is enabled' },
        latencyMs: Date.now() - start,
      };
    }
  }

  async pullData(category: DataCategory, config: ConnectorConfig, options?: PullOptions): Promise<PullResult> {
    const { url, database, username, apiKey } = config;
    if (!url || !username || !apiKey) throw new Error('Odoo connector requires: url, username, apiKey');

    // Authenticate and get session
    const authResponse = await fetch(`${url.replace(/\/$/, '')}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { db: database, login: username, password: apiKey }, id: 1 }),
      signal: AbortSignal.timeout(10000),
    });

    const authData = await authResponse.json();
    if (!authData.result?.uid) throw new Error('Odoo authentication failed');

    const cookie = authResponse.headers.get('set-cookie') || '';

    switch (category) {
      case 'inventory': {
        // Fetch stock.quant (current inventory levels)
        const response = await this.odooSearchRead(url, 'stock.quant', cookie, [
          ['quantity', '>', 0],
        ], ['product_id', 'product_uom_id', 'quantity', 'reserved_quantity'], { limit: options?.limit || 100 });

        const items: InventoryRecord[] = (response || []).map((r: any) => ({
          sku: String(r.product_id?.[0] || r.id),
          name: r.product_id?.[1] || `Product ${r.product_id?.[0]}`,
          category: 'Other', // Would need product.template lookup
          currentQtyL: r.quantity || 0,
          minThresholdL: undefined,
          unitCostAED: undefined,
          supplier: undefined,
        }));

        return { type: 'inventory', items };
      }

      case 'products': {
        const response = await this.odooSearchRead(url, 'product.product', cookie, [
          ['sale_ok', '=', true],
        ], ['name', 'default_code', 'categ_id', 'lst_price', 'standard_price'], { limit: options?.limit || 100 });

        const products: ProductRecord[] = (response || []).map((r: any) => ({
          name: r.name || 'Unknown',
          sku: r.default_code || undefined,
          category: r.categ_id?.[1] || 'Other',
          quantitySold: 0,
          revenue: undefined,
          unitCost: r.standard_price || undefined,
          unitPrice: r.lst_price || undefined,
        }));

        return { type: 'products', products };
      }

      case 'sales': {
        // Fetch sale.order records
        const domain: any[] = [
          ['state', 'in', ['sale', 'done']],
        ];
        if (options?.sinceDate) domain.push(['date_order', '>=', options.sinceDate]);
        if (options?.untilDate) domain.push(['date_order', '<=', options.untilDate]);

        const response = await this.odooSearchRead(url, 'sale.order', cookie, domain,
          ['date_order', 'amount_total', 'amount_untaxed', 'partner_id', 'state'],
          { limit: options?.limit || 100, order: 'date_order asc' });

        // Group by date
        const salesByDate = new Map<string, SalesRecord>();
        for (const order of (response || [])) {
          const dateStr = (order.date_order || '').split(' ')[0].split('T')[0];
          if (!dateStr) continue;

          const existing = salesByDate.get(dateStr) || { date: dateStr, gross: 0, net: 0, receiptCount: 0 };
          existing.gross += order.amount_total || 0;
          existing.net += order.amount_untaxed || 0;
          existing.receiptCount += 1;
          salesByDate.set(dateStr, existing);
        }

        return { type: 'sales', sales: Array.from(salesByDate.values()).sort((a, b) => a.date.localeCompare(b.date)) };
      }

      case 'staff': {
        // Fetch hr.payslip or hr.contract for staff cost data
        const domain: any[] = [['state', '=', 'done']];
        if (options?.sinceDate) domain.push(['date_from', '>=', options.sinceDate]);

        const response = await this.odooSearchRead(url, 'hr.payslip', cookie, domain,
          ['date_from', 'date_to', 'basic_wage', 'gross_pay', 'net_pay', 'employee_id'],
          { limit: options?.limit || 50 });

        // Transform into StaffCostRecord format
        const staffCosts = (response || []).map((p: any) => {
          const d = new Date(p.date_from);
          return {
            month: d.getUTCMonth() + 1,
            year: d.getUTCFullYear(),
            salary: p.basic_wage || p.net_pay || undefined,
            commission: undefined,
            visa: undefined,
            accommodation: undefined,
            overtime: (p.gross_pay && p.basic_wage) ? p.gross_pay - p.basic_wage : undefined,
            other: undefined,
          };
        });

        return { type: 'staff', staffCosts };
      }

      case 'expenses': {
        // Fetch account.move.line for expense entries
        const domain: any[] = [['account_id.account_type', 'in', ['expense', 'expense_decrease']]];
        if (options?.sinceDate) domain.push(['date', '>=', options.sinceDate]);

        const response = await this.odooSearchRead(url, 'account.move.line', cookie, domain,
          ['name', 'balance', 'date', 'account_id'],
          { limit: options?.limit || 200, order: 'date desc' });

        const expenses = (response || []).map((e: any) => ({
          name: e.name || e.account_id?.[1] || 'Unknown',
          amount: Math.abs(e.balance || 0),
          month: new Date(e.date).getUTCMonth() + 1,
          year: new Date(e.date).getUTCFullYear(),
        }));

        return { type: 'expenses', expenses };
      }

      default:
        throw new Error(`Odoo ERP does not support category: ${category}`);
    }
  }

  // ── Odoo JSON-RPC helper ────────────────────
  private async odooSearchRead(url: string, model: string, cookie: string, domain: any[], fields: string[], kwargs: Record<string, any>): Promise<any[]> {
    const response = await fetch(`${url.replace(/\/$/, '')}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model,
          method: 'search_read',
          args: [domain, fields],
          kwargs,
        },
        id: Math.floor(Math.random() * 10000),
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();
    if (data.error) throw new Error(`Odoo API error: ${data.error.message || JSON.stringify(data.error)}`);
    return data.result || [];
  }
}
