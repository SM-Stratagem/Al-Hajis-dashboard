import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── POST /api/ingest/sales ─────────────────────
// Universal sales ingestion — accepts data from ANY POS/ERP

/*
  BODY:
  {
    "branchSlug": "adcb",
    "connectorId": "optional",
    "source": "magnati-pos",
    "sales": [{
      "date": "2026-04-20",
      "gross": 4500.00,
      "returns": 120.00,
      "net": 4380.00,
      "cash": 1500.00,
      "card": 2880.00,
      "receiptCount": 12
    }],
    "products": [{
      "name": "Oud Royal 50ml",
      "sku": "PFM-OUD-001",
      "category": "Oud",
      "quantitySold": 3,
      "unitPrice": 350,
      "revenue": 1050,
      "unitCost": 120
    }]
  }
*/

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { branchSlug, connectorId, source, sales, products } = body;

    if (!branchSlug || !Array.isArray(sales) || sales.length === 0) {
      return NextResponse.json({ error: 'branchSlug and sales array are required' }, { status: 400 });
    }

    const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
    if (!branch) return NextResponse.json({ error: `Branch "${branchSlug}" not found` }, { status: 404 });

    let salesCreated = 0, productsCreated = 0;
    const errors: string[] = [];

    for (const sale of sales) {
      const { date: dateStr } = sale;
      if (!dateStr) { errors.push('Missing date'); continue; }
      const date = new Date(dateStr + 'T00:00:00Z');
      if (isNaN(date.getTime())) { errors.push(`Invalid date: ${dateStr}`); continue; }

      const month = date.getUTCMonth() + 1;
      const year = date.getUTCFullYear();
      const gross = Number(sale.gross) || 0;
      const returns = Number(sale.returns) || 0;
      const net = Number(sale.net) || (gross - returns);

      const monthlySale = await db.monthlySale.upsert({
        where: { branchId_month_year: { branchId: branch.id, month, year } },
        create: { branchId: branch.id, month, year, gross: 0, returns: 0, net: 0, cash: 0, card: 0 },
        update: {},
      });

      try {
        await db.dailySale.upsert({
          where: { date_monthlySaleId: { date: dateStr, monthlySaleId: monthlySale.id } },
          create: { date: dateStr, dayOfWeek: date.getUTCDay(), revenue: net, month, year, monthlySaleId: monthlySale.id },
          update: { revenue: net, dayOfWeek: date.getUTCDay() },
        });
        salesCreated++;
      } catch (e: any) { errors.push(`${dateStr}: ${e.message}`); }

      // Recalc monthly totals
      const allDaily = await db.dailySale.findMany({ where: { monthlySaleId: monthlySale.id } });
      const totalNet = allDaily.reduce((s, d) => s + d.revenue, 0);
      await db.monthlySale.update({ where: { id: monthlySale.id }, data: { gross: totalNet, net: totalNet } });
    }

    // Products
    if (Array.isArray(products)) {
      for (const prod of products) {
        try {
          await db.productSale.create({
            data: {
              branchId: branch.id,
              name: prod.name,
              sku: prod.sku || null,
              category: prod.category || 'Other',
              unitCost: Number(prod.unitCost) || 0,
              sellingPrice: Number(prod.unitPrice) || 0,
              quantitySold: Number(prod.quantitySold) || 0,
              revenue: Number(prod.revenue) || 0,
              margin: prod.margin !== undefined ? Number(prod.margin) : null,
              month: prod.date ? new Date(prod.date + 'T00:00:00Z').getUTCMonth() + 1 : null,
              year: prod.date ? new Date(prod.date + 'T00:00:00Z').getUTCFullYear() : null,
            },
          });
          productsCreated++;
        } catch (e: any) { errors.push(`${prod.name}: ${e.message}`); }
      }
    }

    // Log sync
    if (connectorId) {
      const status = errors.length > 0 && salesCreated === 0 ? 'error' : errors.length > 0 ? 'partial' : 'success';
      await db.syncLog.create({
        data: { connectorId, direction: 'inbound', category: 'sales', method: 'push', recordCount: salesCreated + productsCreated, status, errorMessage: errors.slice(0, 5).join('; ') || undefined, durationMs: Date.now() - startTime, summary: `${salesCreated} sales, ${productsCreated} products from ${source || 'unknown'}` },
      });
      await db.connector.update({ where: { id: connectorId }, data: { lastSyncAt: new Date(), lastStatus: status, lastError: errors.slice(0, 3).join('; ') || null } });
    }

    // Fire data-changed event so dashboard refreshes
    // (The client will see new data on next fetch)

    return NextResponse.json({ success: true, salesCreated, productsCreated, errors: errors.length > 0 ? errors : undefined, message: `${salesCreated} sales${productsCreated ? ` + ${productsCreated} products` : ''} ingested for ${branch.name}` });
  } catch (error: any) {
    console.error('[ingest/sales] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
