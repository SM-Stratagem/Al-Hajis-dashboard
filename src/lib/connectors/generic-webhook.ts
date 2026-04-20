// ═══════════════════════════════════════════════════════════════
// GENERIC WEBHOOK CONNECTOR
// ═══════════════════════════════════════════════════════════════
// The webhook connector is passive — it doesn't pull data.
// Instead, external systems POST to /api/webhook/[connectorId].
// This driver exists for registry completeness and to support
// connection testing and status reporting.
//
// Webhook data is processed by /api/webhook/[connectorId]/route.ts
// which auto-detects data type and routes to the correct ingest logic.
// ═══════════════════════════════════════════════════════════════

import type { IConnectorDriver, ConnectorConfig, TestResult, DataCategory, PullOptions, PullResult } from './types';

export class GenericWebhookConnector implements IConnectorDriver {
  readonly systemId = 'webhook';
  readonly name = 'Generic Webhook';
  readonly supportedCategories: DataCategory[] = ['sales', 'inventory', 'consumption', 'transactions', 'products', 'staff', 'expenses'];
  readonly supportedDirections = ['push'] as const;

  async testConnection(config: ConnectorConfig): Promise<TestResult> {
    const start = Date.now();

    // For webhooks, we just verify the configuration is present
    const hasAuth = !!config.authHeader || !!config.webhookSecret;
    const hasBranch = !!config.defaultBranchSlug;

    if (!hasAuth && !hasBranch) {
      return {
        success: false,
        message: 'Webhook needs either authHeader/webhookSecret or defaultBranchSlug',
        details: {
          auth: hasAuth ? '✓ configured' : '✗ missing (optional but recommended)',
          branch: hasBranch ? '✓ configured' : '✗ missing (required in payload or config)',
        },
        latencyMs: Date.now() - start,
      };
    }

    return {
      success: true,
      message: 'Webhook connector ready. Share the webhook URL with your POS/ERP system.',
      details: {
        status: 'PASSIVE — waiting for incoming webhooks',
        ...(config.authHeader ? { auth: '✓ auth header will be verified' } : { auth: '⚠ no auth — anyone can post' }),
        ...(config.defaultBranchSlug ? { branch: `✓ default: ${config.defaultBranchSlug}` } : { branch: '⚠ specify branchSlug in each payload' }),
      },
      latencyMs: Date.now() - start,
    };
  }

  async pullData(_category: DataCategory, _config: ConnectorConfig, _options?: PullOptions): Promise<PullResult> {
    throw new Error('Webhook connector is passive — it receives data via POST, not pull. Use the webhook URL to receive data from your external system.');
  }
}
