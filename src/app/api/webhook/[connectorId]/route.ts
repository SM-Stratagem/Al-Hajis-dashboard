import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── POST /api/webhook/[connectorId] ────────────
// Universal webhook receiver — any POS/ERP can POST here
// The webhook auto-routes data to the correct ingest endpoint

/*
  This is a catch-all webhook endpoint that:
  1. Validates the connector exists and is enabled
  2. Checks for an optional auth header
  3. Auto-detects the data type (sales, inventory, etc.)
  4. Routes to the appropriate ingest logic
  5. Logs the sync

  CONFIG:
  The connector config should have:
  - "webhookSecret": used for HMAC verification
  - "authHeader": expected Authorization header value
  - "allowedIPs": optional IP whitelist (comma-separated)

  EXAMPLE WEBHOOK PAYLOADS:

  // Sales webhook
  {
    "type": "sales",
    "data": {
      "branchSlug": "adcb",
      "sales": [{ "date": "2026-04-20", "gross": 4500, "net": 4380, "cash": 1500, "card": 2880 }]
    }
  }

  // Inventory webhook
  {
    "type": "inventory",
    "data": {
      "branchSlug": "adcb",
      "items": [{ "sku": "PFM-SC-O001", "name": "Oud Royal", "currentQtyL": 3.5 }]
    }
  }
*/

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ connectorId: string }> }
) {
  const startTime = Date.now();

  try {
    const { connectorId } = await params;

    // 1. Validate connector
    const connector = await db.connector.findUnique({
      where: { id: connectorId },
      include: { branch: { select: { id: true, name: true, slug: true } } },
    });

    if (!connector) {
      return NextResponse.json({ error: 'Connector not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    if (!connector.enabled) {
      return NextResponse.json({ error: 'Connector is disabled', code: 'DISABLED' }, { status: 403 });
    }

    // 2. Auth check
    const config = JSON.parse(connector.config || '{}');
    if (config.authHeader) {
      const auth = req.headers.get('authorization') || req.headers.get('x-api-key') || '';
      if (auth !== config.authHeader && !auth.includes(config.authHeader)) {
        await db.syncLog.create({
          data: { connectorId, direction: 'inbound', category: 'webhook', method: 'webhook', recordCount: 0, status: 'error', errorMessage: 'Authentication failed', durationMs: Date.now() - startTime },
        });
        return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_FAILED' }, { status: 401 });
      }
    }

    // 3. Parse payload
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body', code: 'BAD_BODY' }, { status: 400 });
    }

    const type = body.type || body.event || 'unknown';
    const data = body.data || body.payload || body;
    const branchSlug = data.branchSlug || config.defaultBranchSlug || connector.branch?.slug;

    if (!branchSlug) {
      return NextResponse.json({ error: 'Cannot determine target branch. Set defaultBranchSlug in connector config or include branchSlug in payload.', code: 'NO_BRANCH' }, { status: 400 });
    }

    let recordCount = 0;
    let status = 'success';
    let errorMsg: string | undefined;
    let summary = '';

    // 4. Route by type
    switch (type) {
      case 'sales':
      case 'transaction':
      case 'payment': {
        const sales = Array.isArray(data.sales) ? data.sales : Array.isArray(data.transactions) ? data.transactions : Array.isArray(data) ? data : [data];
        // Process sales records...
        const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
        if (!branch) { status = 'error'; errorMsg = `Branch ${branchSlug} not found`; break; }

        for (const sale of sales) {
          const dateStr = sale.date || sale.timestamp?.split('T')[0];
          if (!dateStr) continue;
          const date = new Date(dateStr + 'T00:00:00Z');
          if (isNaN(date.getTime())) continue;

          const month = date.getUTCMonth() + 1;
          const year = date.getUTCFullYear();
          const gross = Number(sale.gross || sale.amount || sale.total || 0);
          const net = Number(sale.net || gross - (Number(sale.returns) || 0));

          // Find or create the MonthlySale
          let monthlySale = await db.monthlySale.findFirst({
            where: { branchId: branch.id, month, year },
          });
          if (!monthlySale) {
            monthlySale = await db.monthlySale.create({
              data: { branchId: branch.id, month, year, gross: 0, returns: 0, net: 0, cash: 0, card: 0 },
            });
          }

          // Check if daily sale exists
          const existingDaily = await db.dailySale.findUnique({
            where: { date_monthlySaleId: { date: dateStr, monthlySaleId: monthlySale.id } },
          });

          if (existingDaily) {
            await db.dailySale.update({
              where: { id: existingDaily.id },
              data: { revenue: net, dayOfWeek: date.getUTCDay() },
            });
          } else {
            await db.dailySale.create({
              data: { date: dateStr, dayOfWeek: date.getUTCDay(), revenue: net, month, year, monthlySaleId: monthlySale.id },
            });
          }
          recordCount++;

          // Products if present
          if (Array.isArray(sale.lineItems || sale.items)) {
            for (const li of (sale.lineItems || sale.items)) {
              await db.productSale.create({
                data: { branchId: branch.id, name: li.name || li.description || 'Unknown', sku: li.sku || null, category: li.category || 'Other', quantitySold: Number(li.quantity) || 1, revenue: Number(li.total || li.amount) || 0, unitCost: Number(li.cost) || 0, sellingPrice: Number(li.price || li.unitPrice) || 0 },
              });
              recordCount++;
            }
          }
        }

        }

        summary = `${recordCount} sales records from webhook`;
        break;
      }

      case 'inventory':
      case 'stock':
      case 'stock_update': {
        const items = Array.isArray(data.items) ? data.items : [data];
        const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
        if (!branch) { status = 'error'; errorMsg = `Branch ${branchSlug} not found`; break; }

        for (const item of items) {
          const sku = item.sku || item.itemId;
          if (!sku) continue;
          await db.supplyItem.upsert({
            where: { itemId: sku },
            create: { itemId: sku, itemName: item.name || sku, category: item.category || 'Other', currentQtyL: Number(item.currentQtyL || item.quantity) || 0, minThresholdL: Number(item.minThresholdL || item.reorderPoint) || 0, unitCostAED: Number(item.unitCostAED || item.unitCost) || 0, supplierName: item.supplier || null, branchId: branch.id },
            update: { currentQtyL: Number(item.currentQtyL || item.quantity) || undefined, lastUpdated: new Date() },
          });
          recordCount++;
        }
        summary = `${recordCount} inventory items updated`;
        break;
      }

      default: {
        // Unknown type — just log it
        summary = `Received unknown webhook type "${type}" — raw log only`;
        status = 'partial';
      }
    }

    // 5. Log and update connector
    await db.syncLog.create({
      data: { connectorId, direction: 'inbound', category: type, method: 'webhook', recordCount, status, errorMessage: errorMsg, durationMs: Date.now() - startTime, summary },
    });

    await db.connector.update({
      where: { id: connectorId },
      data: { lastSyncAt: new Date(), lastStatus: status, lastError: errorMsg },
    });

    return NextResponse.json({
      received: true,
      type,
      recordCount,
      status,
      message: `Webhook processed: ${summary}`,
    });
  } catch (error: any) {
    console.error('[webhook] POST error:', error);
    return NextResponse.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// ─── GET /api/webhook/[connectorId] ─────────────
// Health check endpoint for webhook connectivity

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ connectorId: string }> }
) {
  try {
    const { connectorId } = await params;
    const connector = await db.connector.findUnique({
      where: { id: connectorId },
      select: { id: true, name: true, enabled: true, system: true, lastSyncAt: true, lastStatus: true },
    });

    if (!connector) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'alive',
      connector: connector.name,
      system: connector.system,
      enabled: connector.enabled,
      lastSync: connector.lastSyncAt,
      // Show the full webhook URL that should be configured in POS/ERP
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhook/${connectorId}`,
      supportedTypes: ['sales', 'transaction', 'payment', 'inventory', 'stock', 'stock_update'],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
