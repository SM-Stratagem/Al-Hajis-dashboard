// ═══════════════════════════════════════════════════════════════
// GOOGLE SHEETS CONNECTOR
// ═══════════════════════════════════════════════════════════════
// Pulls data from Google Sheets via the Sheets API v4.
// This is the MVP integration tier — minimal setup, no POS access needed.
//
// HOW IT WORKS:
//   1. User shares a Google Sheet (or makes it "Anyone with link")
//   2. User provides the Sheet ID (from URL) and API Key
//   3. Dashboard pulls data from specific named tabs/ranges
//
// EXPECTED SHEET STRUCTURE:
//   Tab "Sales":  Date | Gross | Returns | Net | Cash | Card | Receipts
//   Tab "Inventory": SKU | Name | Category | Qty | Min Threshold | Cost | Supplier
//   Tab "Products": Name | SKU | Category | Qty Sold | Revenue | Cost | Price
//   Tab "Staff": Month | Year | Salary | Commission | Visa | Accom | OT
//   Tab "Expenses": Name | Amount | Month | Year
//
// SETUP:
//   1. Go to Google Cloud Console → APIs & Services → Enable Sheets API
//   2. Create API Key (restricted to Sheets API)
//   3. Share the spreadsheet → "Anyone with the link can view"
//   4. Copy Sheet ID from URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
// ═══════════════════════════════════════════════════════════════

import type { IConnectorDriver, ConnectorConfig, TestResult, DataCategory, PullOptions, PullResult, SalesRecord, InventoryRecord, ProductRecord, StaffCostRecord, ExpenseRecord, ConsumptionRecord } from './types';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export class GoogleSheetsConnector implements IConnectorDriver {
  readonly systemId = 'google_sheets';
  readonly name = 'Google Sheets';
  readonly supportedCategories: DataCategory[] = ['sales', 'inventory', 'consumption', 'transactions', 'products', 'staff', 'expenses'];
  readonly supportedDirections = ['pull'] as const;

  // ── Test Connection ──────────────────────────
  async testConnection(config: ConnectorConfig): Promise<TestResult> {
    const start = Date.now();
    const { spreadsheetId, apiKey } = config;

    if (!spreadsheetId || !apiKey) {
      return {
        success: false,
        message: 'Missing required config: spreadsheetId, apiKey',
        details: {
          spreadsheetId: spreadsheetId ? '✓ provided' : '✗ missing',
          apiKey: apiKey ? '✓ provided' : '✗ missing',
        },
        latencyMs: Date.now() - start,
      };
    }

    try {
      // Try to get spreadsheet metadata
      const url = `${SHEETS_API_BASE}/${spreadsheetId}?key=${apiKey}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (response.ok) {
        const meta = await response.json();
        const sheets = meta.sheets?.map((s: any) => s.properties?.title) || [];
        return {
          success: true,
          message: `Connected! Found ${sheets.length} tab(s): ${sheets.join(', ')}`,
          details: { title: meta.properties?.title || 'Unknown', sheets: sheets.join(', ') },
          latencyMs: Date.now() - start,
        };
      }

      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `Google Sheets API error: HTTP ${response.status}`,
        details: { error: (errData as any)?.error?.message || 'Unknown error', hint: 'Ensure the sheet is shared with "Anyone with the link"' },
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Cannot reach Google Sheets: ${err.message}`,
        details: { error: err.code || 'NETWORK_ERROR' },
        latencyMs: Date.now() - start,
      };
    }
  }

  // ── Pull Data ────────────────────────────────
  async pullData(category: DataCategory, config: ConnectorConfig, options?: PullOptions): Promise<PullResult> {
    const { spreadsheetId, apiKey } = config;
    if (!spreadsheetId || !apiKey) throw new Error('Google Sheets connector requires: spreadsheetId, apiKey');

    const sheetName = options?.sheetName || this.getTabNameForCategory(category);

    // Fetch all data from the relevant tab
    const range = encodeURIComponent(`${sheetName}`);
    const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}?key=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Google Sheets API error: ${response.status} — ${(errData as any)?.error?.message || 'Unknown'}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length < 2) {
      return this.emptyResult(category);
    }

    // First row = headers
    const headers = rows[0].map((h: string) => h.trim().toLowerCase());
    const dataRows = rows.slice(1).filter((r: string[]) => r.some(cell => cell.trim()));

    if (options?.limit) {
      dataRows.length = Math.min(dataRows.length, options.limit);
    }

    switch (category) {
      case 'sales': return this.parseSales(headers, dataRows);
      case 'inventory': return this.parseInventory(headers, dataRows);
      case 'consumption': return this.parseConsumption(headers, dataRows);
      case 'transactions': return this.parseTransactions(headers, dataRows);
      case 'products': return this.parseProducts(headers, dataRows);
      case 'staff': return this.parseStaff(headers, dataRows);
      case 'expenses': return this.parseExpenses(headers, dataRows);
    }
  }

  // ── Parsers ──────────────────────────────────

  private parseSales(headers: string[], rows: string[][]): PullResult {
    const sales: SalesRecord[] = [];
    const dateCol = this.findCol(headers, ['date', 'day', 'transaction date']);
    const grossCol = this.findCol(headers, ['gross', 'total', 'amount', 'gross sales']);
    const returnsCol = this.findCol(headers, ['returns', 'refunds', 'return']);
    const netCol = this.findCol(headers, ['net', 'net sales', 'net amount']);
    const cashCol = this.findCol(headers, ['cash']);
    const cardCol = this.findCol(headers, ['card', 'credit', 'debit']);
    const receiptsCol = this.findCol(headers, ['receipts', 'receipt count', 'transactions', 'tickets']);

    for (const row of rows) {
      const dateStr = this.parseDateStr(row[dateCol]);
      if (!dateStr) continue;

      const gross = this.num(row[grossCol]);
      const returns = this.num(row[returnsCol]);
      const net = this.num(row[netCol]) || (gross - returns);
      const cash = this.num(row[cashCol]);
      const card = this.num(row[cardCol]);

      sales.push({
        date: dateStr,
        gross: gross || undefined,
        returns: returns || undefined,
        net: net || undefined,
        cash: cash || undefined,
        card: card || undefined,
        receiptCount: this.int(row[receiptsCol]) || undefined,
      });
    }

    return { type: 'sales', sales };
  }

  private parseInventory(headers: string[], rows: string[][]): PullResult {
    const items: InventoryRecord[] = [];
    const skuCol = this.findCol(headers, ['sku', 'item id', 'item code', 'code']);
    const nameCol = this.findCol(headers, ['name', 'item name', 'product', 'description']);
    const catCol = this.findCol(headers, ['category', 'type', 'group']);
    const qtyCol = this.findCol(headers, ['qty', 'quantity', 'current qty', 'stock', 'soh', 'current']);
    const minCol = this.findCol(headers, ['min threshold', 'min', 'reorder point', 'reorder', 'minimum']);
    const costCol = this.findCol(headers, ['cost', 'unit cost', 'price cost', 'cost aed']);
    const supplierCol = this.findCol(headers, ['supplier', 'vendor']);

    for (const row of rows) {
      const sku = (row[skuCol] || '').trim();
      if (!sku) continue;

      items.push({
        sku,
        name: row[nameCol]?.trim() || undefined,
        category: row[catCol]?.trim() || undefined,
        currentQtyL: this.num(row[qtyCol]) || undefined,
        minThresholdL: this.num(row[minCol]) || undefined,
        unitCostAED: this.num(row[costCol]) || undefined,
        supplier: row[supplierCol]?.trim() || undefined,
      });
    }

    return { type: 'inventory', items };
  }

  private parseConsumption(headers: string[], rows: string[][]): PullResult {
    const consumptions: ConsumptionRecord[] = [];
    const skuCol = this.findCol(headers, ['sku', 'item id', 'code']);
    const dateCol = this.findCol(headers, ['date', 'day']);
    const qtyCol = this.findCol(headers, ['qty used', 'quantity', 'usage', 'qty', 'amount']);
    const staffCol = this.findCol(headers, ['staff', 'staff code', 'employee']);
    const typeCol = this.findCol(headers, ['type', 'transaction type']);

    for (const row of rows) {
      const sku = (row[skuCol] || '').trim();
      if (!sku) continue;

      consumptions.push({
        sku,
        date: this.parseDateStr(row[dateCol]) || undefined,
        qtyUsedL: this.num(row[qtyCol]) || undefined,
        staffCode: row[staffCol]?.trim() || undefined,
        type: (row[typeCol]?.trim().toLowerCase() === 'sale' ? 'sale' :
               row[typeCol]?.trim().toLowerCase() === 'blending' ? 'blending' :
               row[typeCol]?.trim().toLowerCase() === 'wastage' ? 'wastage' : 'sale') as 'sale' | 'blending' | 'wastage',
      });
    }

    return { type: 'consumption', consumptions };
  }

  private parseTransactions(headers: string[], rows: string[][]): PullResult {
    const transactions: TransactionRecord[] = [];
    const monthCol = this.findCol(headers, ['month']);
    const yearCol = this.findCol(headers, ['year']);
    const receiptsCol = this.findCol(headers, ['receipts', 'receipt count', 'transactions', 'tickets']);
    const revenueCol = this.findCol(headers, ['revenue', 'total revenue', 'net', 'sales']);

    for (const row of rows) {
      const month = this.int(row[monthCol]);
      const year = this.int(row[yearCol]);
      if (!month || !year) continue;

      const receiptCount = this.int(row[receiptsCol]) || 0;
      const totalRevenue = this.num(row[revenueCol]) || 0;

      transactions.push({
        month, year, receiptCount, totalRevenue,
        avgTicketSize: receiptCount > 0 ? totalRevenue / receiptCount : undefined,
      });
    }

    return { type: 'transactions', transactions };
  }

  private parseProducts(headers: string[], rows: string[][]): PullResult {
    const products: ProductRecord[] = [];
    const nameCol = this.findCol(headers, ['name', 'product', 'item name']);
    const skuCol = this.findCol(headers, ['sku', 'code']);
    const catCol = this.findCol(headers, ['category', 'type']);
    const qtyCol = this.findCol(headers, ['qty sold', 'quantity', 'units', 'sold']);
    const revenueCol = this.findCol(headers, ['revenue', 'total', 'sales']);
    const costCol = this.findCol(headers, ['cost', 'unit cost']);
    const priceCol = this.findCol(headers, ['price', 'unit price', 'selling price']);

    for (const row of rows) {
      const name = (row[nameCol] || '').trim();
      if (!name) continue;

      products.push({
        name,
        sku: row[skuCol]?.trim() || undefined,
        category: row[catCol]?.trim() || undefined,
        quantitySold: this.int(row[qtyCol]) || 0,
        revenue: this.num(row[revenueCol]) || undefined,
        unitCost: this.num(row[costCol]) || undefined,
        unitPrice: this.num(row[priceCol]) || undefined,
      });
    }

    return { type: 'products', products };
  }

  private parseStaff(headers: string[], rows: string[][]): PullResult {
    const staffCosts: StaffCostRecord[] = [];
    const monthCol = this.findCol(headers, ['month']);
    const yearCol = this.findCol(headers, ['year']);
    const salaryCol = this.findCol(headers, ['salary', 'base salary']);
    const commissionCol = this.findCol(headers, ['commission']);
    const visaCol = this.findCol(headers, ['visa', 'visa cost']);
    const accomCol = this.findCol(headers, ['accommodation', 'accom', 'housing']);
    const otCol = this.findCol(headers, ['overtime', 'ot']);
    const otherCol = this.findCol(headers, ['other', 'misc', 'miscellaneous']);

    for (const row of rows) {
      const month = this.int(row[monthCol]);
      const year = this.int(row[yearCol]);
      if (!month || !year) continue;

      staffCosts.push({
        month, year,
        salary: this.num(row[salaryCol]) || undefined,
        commission: this.num(row[commissionCol]) || undefined,
        visa: this.num(row[visaCol]) || undefined,
        accommodation: this.num(row[accomCol]) || undefined,
        overtime: this.num(row[otCol]) || undefined,
        other: this.num(row[otherCol]) || undefined,
      });
    }

    return { type: 'staff', staffCosts };
  }

  private parseExpenses(headers: string[], rows: string[][]): PullResult {
    const expenses: ExpenseRecord[] = [];
    const nameCol = this.findCol(headers, ['name', 'expense', 'description', 'item']);
    const amountCol = this.findCol(headers, ['amount', 'cost', 'value', 'total']);
    const monthCol = this.findCol(headers, ['month']);
    const yearCol = this.findCol(headers, ['year']);

    for (const row of rows) {
      const name = (row[nameCol] || '').trim();
      const amount = this.num(row[amountCol]);
      if (!name || !amount) continue;

      expenses.push({
        name,
        amount,
        month: this.int(row[monthCol]) || undefined,
        year: this.int(row[yearCol]) || undefined,
      });
    }

    return { type: 'expenses', expenses };
  }

  // ── Helpers ──────────────────────────────────

  private findCol(headers: string[], aliases: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      if (aliases.some(a => headers[i].includes(a))) return i;
    }
    return -1;
  }

  private parseDateStr(raw: string | undefined): string | null {
    if (!raw) return null;
    const val = raw.trim();
    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    // Try DD/MM/YYYY or DD-MM-YYYY
    const parts = val.split(/[/-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      if (year > 100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    // Try native Date parse
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return null;
  }

  private num(raw: string | undefined): number | undefined {
    if (!raw) return undefined;
    const n = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? undefined : n;
  }

  private int(raw: string | undefined): number | undefined {
    if (!raw) return undefined;
    const n = parseInt(raw.replace(/[^0-9\-]/g, ''));
    return isNaN(n) ? undefined : n;
  }

  private getTabNameForCategory(category: DataCategory): string {
    const map: Record<DataCategory, string> = {
      sales: 'Sales',
      inventory: 'Inventory',
      consumption: 'Consumption',
      transactions: 'Transactions',
      products: 'Products',
      staff: 'Staff',
      expenses: 'Expenses',
    };
    return map[category];
  }

  private emptyResult(category: DataCategory): PullResult {
    switch (category) {
      case 'sales': return { type: 'sales', sales: [] };
      case 'inventory': return { type: 'inventory', items: [] };
      case 'consumption': return { type: 'consumption', consumptions: [] };
      case 'transactions': return { type: 'transactions', transactions: [] };
      case 'products': return { type: 'products', products: [] };
      case 'staff': return { type: 'staff', staffCosts: [] };
      case 'expenses': return { type: 'expenses', expenses: [] };
    }
  }
}
