// ═══════════════════════════════════════════════════════════════
// CONNECTOR DRIVER INTERFACE
// ═══════════════════════════════════════════════════════════════
// This defines the contract every connector driver must implement.
// To add a new system, create a new driver file and register it in registry.ts
//
// SUPPORTED DATA TYPES:
//   - sales:        Daily/monthly sales records
//   - inventory:    Stock on hand (SupplyItem) updates
//   - consumption:  Material usage records
//   - transactions: Receipt/ticket counts and ticket sizes
//   - products:     SKU-level product sales
//   - staff:        Staff cost/attendance data
//   - expenses:     P&L expense lines
// ═══════════════════════════════════════════════════════════════

export type DataCategory = 'sales' | 'inventory' | 'consumption' | 'transactions' | 'products' | 'staff' | 'expenses';

export type SyncDirection = 'pull' | 'push';

export interface SyncResult {
  success: boolean;
  category: DataCategory;
  direction: SyncDirection;
  recordsProcessed: number;
  recordsFailed: number;
  errors: string[];
  summary: string;
  durationMs: number;
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, string>;
  latencyMs: number;
}

export interface ConnectorConfig {
  [key: string]: string;
}

/**
 * The core interface every connector driver must implement.
 *
 * Each driver handles ONE external system (e.g., Magnati POS, Google Sheets, Odoo).
 * The driver is responsible for:
 *   1. Testing connectivity (authenticate, reach endpoint)
 *   2. Pulling data from the external system
 *   3. Transforming external data into the Parfumix internal format
 *   4. Returning structured results for the sync engine to write to DB
 */
export interface IConnectorDriver {
  /** Unique system identifier (matches Connector.system in DB) */
  readonly systemId: string;

  /** Human-readable name */
  readonly name: string;

  /** What data categories this driver can pull */
  readonly supportedCategories: DataCategory[];

  /** Does this driver support push (webhook) or pull (API) or both? */
  readonly supportedDirections: SyncDirection[];

  /**
   * Test the connection to the external system.
   * Used to verify credentials, endpoint reachability, etc.
   * Should NOT modify any data.
   */
  testConnection(config: ConnectorConfig): Promise<TestResult>;

  /**
   * Pull data from the external system.
   * Returns data in the Parfumix internal format, ready for DB insertion.
   *
   * The returned data shape depends on the category:
   *
   * sales:        { sales: Array<{ date, gross?, returns?, net?, cash?, card?, receiptCount? }> }
   * inventory:    { items: Array<{ sku, name?, category?, currentQtyL?, minThresholdL?, unitCostAED?, supplier? }> }
   * consumption:  { consumptions: Array<{ sku, date?, qtyUsedL?, staffCode?, type? }> }
   * transactions: { transactions: Array<{ month, year, receiptCount, totalRevenue, avgTicketSize? }> }
   * products:     { products: Array<{ name, sku?, category?, quantitySold, revenue?, unitCost?, unitPrice? }> }
   * staff:        { staffCosts: Array<{ month, year, salary?, commission?, visa?, accommodation?, overtime? }> }
   * expenses:     { expenses: Array<{ name, amount, month?, year? }> }
   */
  pullData(category: DataCategory, config: ConnectorConfig, options?: PullOptions): Promise<PullResult>;
}

export interface PullOptions {
  /** Branch slug to tag data with */
  branchSlug?: string;

  /** Only pull records after this ISO date */
  sinceDate?: string;

  /** Only pull records before this ISO date */
  untilDate?: string;

  /** Maximum number of records to pull (for testing) */
  limit?: number;

  /** Specific sheet/tab name (for Google Sheets, etc.) */
  sheetName?: string;
}

export type PullResult =
  | { type: 'sales'; sales: SalesRecord[] }
  | { type: 'inventory'; items: InventoryRecord[] }
  | { type: 'consumption'; consumptions: ConsumptionRecord[] }
  | { type: 'transactions'; transactions: TransactionRecord[] }
  | { type: 'products'; products: ProductRecord[] }
  | { type: 'staff'; staffCosts: StaffCostRecord[] }
  | { type: 'expenses'; expenses: ExpenseRecord[] };

// ── Internal data record shapes ──────────────────

export interface SalesRecord {
  date: string;           // "YYYY-MM-DD"
  gross?: number;
  returns?: number;
  net?: number;
  cash?: number;
  card?: number;
  receiptCount?: number;
  products?: ProductRecord[];
}

export interface InventoryRecord {
  sku: string;
  name?: string;
  category?: string;
  currentQtyL?: number;
  minThresholdL?: number;
  unitCostAED?: number;
  supplier?: string;
}

export interface ConsumptionRecord {
  sku: string;
  date?: string;
  qtyUsedL?: number;
  staffCode?: string;
  type?: 'sale' | 'blending' | 'wastage';
}

export interface TransactionRecord {
  month: number;
  year: number;
  receiptCount: number;
  totalRevenue: number;
  avgTicketSize?: number;
}

export interface ProductRecord {
  name: string;
  sku?: string;
  category?: string;
  quantitySold: number;
  revenue?: number;
  unitCost?: number;
  unitPrice?: number;
}

export interface StaffCostRecord {
  month: number;
  year: number;
  salary?: number;
  commission?: number;
  visa?: number;
  accommodation?: number;
  overtime?: number;
  other?: number;
}

export interface ExpenseRecord {
  name: string;
  amount: number;
  month?: number;
  year?: number;
}
