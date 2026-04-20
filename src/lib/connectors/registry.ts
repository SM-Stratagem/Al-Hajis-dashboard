// ═══════════════════════════════════════════════════════════════
// CONNECTOR DRIVER REGISTRY
// ═══════════════════════════════════════════════════════════════
// Central registry that maps system identifiers to connector drivers.
// To add a new system:
//   1. Create a new file in this directory implementing IConnectorDriver
//   2. Import it here and add it to the registry
//   3. Add a template entry in page.tsx CONNECTOR_TEMPLATES
// ═══════════════════════════════════════════════════════════════

import type { IConnectorDriver } from './types';

// ── Driver imports ───────────────────────────────
import { MagnatiPOSConnector } from './magnati-pos';
import { GoogleSheetsConnector } from './google-sheets';
import { OdooERPConnector } from './odoo-erp';
import { GenericWebhookConnector } from './generic-webhook';
import { CustomPOSConnector } from './custom-pos';
import { SquarePOSConnector } from './square-pos';
import { SAPConnector } from './sap-erp';
import { ZohoConnector } from './zoho-erp';

// ── Registry ─────────────────────────────────────
const driverMap = new Map<string, IConnectorDriver>([
  ['magnati', new MagnatiPOSConnector()],
  ['google_sheets', new GoogleSheetsConnector()],
  ['odoo', new OdooERPConnector()],
  ['webhook', new GenericWebhookConnector()],
  ['custom', new CustomPOSConnector()],
  ['square', new SquarePOSConnector()],
  ['sap', new SAPConnector()],
  ['zoho', new ZohoConnector()],
]);

/**
 * Get a connector driver by system identifier.
 * Returns null if no driver is registered for the system.
 */
export function getDriver(system: string): IConnectorDriver | null {
  return driverMap.get(system) || null;
}

/**
 * List all registered connector drivers.
 */
export function listDrivers(): IConnectorDriver[] {
  return Array.from(driverMap.values());
}

/**
 * Register a new connector driver at runtime.
 * Useful for plugins or dynamic system additions.
 */
export function registerDriver(driver: IConnectorDriver): void {
  driverMap.set(driver.systemId, driver);
}

/**
 * Get all supported data categories across all drivers.
 */
export function getAllSupportedCategories(): string[] {
  const categories = new Set<string>();
  for (const driver of driverMap.values()) {
    for (const cat of driver.supportedCategories) {
      categories.add(cat);
    }
  }
  return Array.from(categories);
}
