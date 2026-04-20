import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── POST /api/ingest/inventory ─────────────────
// Universal inventory ingestion — accepts stock data from any POS/ERP/warehouse

/*
  BODY:
  {
    "branchSlug": "adcb",
    "connectorId": "optional",
    "source": "odoo-erp",
    "items": [{
      "sku": "PFM-SC-O001",
      "name": "Oud Royal",
      "category": "Oil",
      "currentQtyL": 3.5,
      "minThresholdL": 5.0,
      "unitCostAED": 350,
      "supplier": "Al Haramain Oud Co."
    }],
    "consumptions": [{
      "sku": "PFM-SC-O001",
      "date": "2026-04-20",
      "qtyUsedL": 0.15,
      "staffCode": "S001",
      "type": "sale"        // sale | blending | wastage
    }]
  }
*/

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { branchSlug, connectorId, source, items, consumptions } = body;

    if (!branchSlug) {
      return NextResponse.json({ error: 'branchSlug is required' }, { status: 400 });
    }

    const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
    if (!branch) return NextResponse.json({ error: `Branch "${branchSlug}" not found` }, { status: 404 });

    let itemsUpdated = 0, consumptionsCreated = 0;
    const errors: string[] = [];

    // ── Process inventory items ──
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        try {
          const sku = item.sku || item.itemId;
          if (!sku) { errors.push('Item missing sku/itemId'); continue; }

          // Upsert the supply item
          await db.supplyItem.upsert({
            where: { itemId: sku },
            create: {
              itemId: sku,
              itemName: item.name || sku,
              category: item.category || 'Other',
              currentQtyL: Number(item.currentQtyL) || Number(item.quantityOnHand) || 0,
              minThresholdL: Number(item.minThresholdL) || Number(item.reorderPoint) || 0,
              unitCostAED: Number(item.unitCostAED) || Number(item.unitCost) || 0,
              supplierName: item.supplier || item.supplierName || null,
              branchId: branch.id,
              lastUpdated: new Date(),
            },
            update: {
              currentQtyL: Number(item.currentQtyL) || Number(item.quantityOnHand) || undefined,
              minThresholdL: Number(item.minThresholdL) || Number(item.reorderPoint) || undefined,
              unitCostAED: Number(item.unitCostAED) || Number(item.unitCost) || undefined,
              supplierName: item.supplier || item.supplierName || undefined,
              lastUpdated: new Date(),
            },
          });
          itemsUpdated++;
        } catch (e: any) { errors.push(`${item.sku || item.name}: ${e.message}`); }
      }
    }

    // ── Process consumption records ──
    if (Array.isArray(consumptions) && consumptions.length > 0) {
      for (const c of consumptions) {
        try {
          const sku = c.sku || c.itemId;
          if (!sku) { errors.push('Consumption missing sku/itemId'); continue; }

          // Find the supply item
          const supplyItem = await db.supplyItem.findUnique({ where: { itemId: sku } });
          if (!supplyItem) { errors.push(`Supply item ${sku} not found. Ingest inventory first.`); continue; }

          await db.supplyConsumption.create({
            data: {
              supplyItemId: supplyItem.id,
              date: c.date || new Date().toISOString().split('T')[0],
              qtyUsedL: Number(c.qtyUsedL) || Number(c.quantity) || 0,
              staffCode: c.staffCode || null,
              transactionType: c.type || c.transactionType || 'sale',
            },
          });
          consumptionsCreated++;
        } catch (e: any) { errors.push(`Consumption ${c.sku}: ${e.message}`); }
      }
    }

    // ── Log sync ──
    if (connectorId) {
      const status = errors.length > 0 && itemsUpdated === 0 ? 'error' : errors.length > 0 ? 'partial' : 'success';
      await db.syncLog.create({
        data: { connectorId, direction: 'inbound', category: 'inventory', method: 'push', recordCount: itemsUpdated + consumptionsCreated, status, errorMessage: errors.slice(0, 5).join('; ') || undefined, durationMs: Date.now() - startTime, summary: `${itemsUpdated} items, ${consumptionsCreated} consumptions from ${source || 'unknown'}` },
      });
      await db.connector.update({ where: { id: connectorId }, data: { lastSyncAt: new Date(), lastStatus: status, lastError: errors.slice(0, 3).join('; ') || null } });
    }

    return NextResponse.json({ success: true, itemsUpdated, consumptionsCreated, errors: errors.length > 0 ? errors : undefined, message: `${itemsUpdated} items${consumptionsCreated ? ` + ${consumptionsCreated} consumptions` : ''} synced for ${branch.name}` });
  } catch (error: any) {
    console.error('[ingest/inventory] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
