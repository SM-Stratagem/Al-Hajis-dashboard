import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDriver } from '@/lib/connectors/registry';
import type { DataCategory } from '@/lib/connectors/types';

// ─── POST /api/connectors/[id]/sync ──────────────
// Trigger a data pull from an external system.
// Pulls data using the connector's driver, then writes to DB.

/*
  BODY:
  {
    "category": "sales" | "inventory" | "consumption" | "transactions" | "products" | "staff" | "expenses",
    "sinceDate": "2026-04-01",  // optional
    "untilDate": "2026-04-30",  // optional
    "sheetName": "Sales",        // optional (for Google Sheets)
    "limit": 100                 // optional (for testing)
  }

  Or pull ALL supported categories:
  {
    "category": "all"
  }
*/

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id } = await params;
    const connector = await db.connector.findUnique({
      where: { id },
      include: { branch: { select: { id: true, name: true, slug: true } } },
    });

    if (!connector) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    if (!connector.enabled) {
      return NextResponse.json({ error: 'Connector is disabled. Enable it first.' }, { status: 400 });
    }

    const driver = getDriver(connector.system);
    if (!driver) {
      return NextResponse.json({
        error: `No driver registered for system "${connector.system}"`,
        hint: 'Webhook-based connectors receive data via POST, not pull sync.',
      }, { status: 400 });
    }

    const config = JSON.parse(connector.config || '{}');
    const body = await req.json().catch(() => ({}));
    const branchSlug = body.branchSlug || connector.branch?.slug;

    if (!branchSlug && !connector.branchId) {
      return NextResponse.json({ error: 'No branch assigned to this connector. Set a branch first.' }, { status: 400 });
    }

    const branch = connector.branch || (branchSlug ? await db.branch.findUnique({ where: { slug: branchSlug } }) : null);
    if (!branch) {
      return NextResponse.json({ error: `Branch "${branchSlug}" not found` }, { status: 404 });
    }

    // Determine which categories to sync
    const requestedCategory = body.category || 'all';
    const categories: DataCategory[] = requestedCategory === 'all'
      ? [...driver.supportedCategories]
      : [requestedCategory as DataCategory];

    // Validate requested categories
    for (const cat of categories) {
      if (!driver.supportedCategories.includes(cat)) {
        return NextResponse.json({
          error: `Driver "${driver.name}" does not support category "${cat}". Supported: ${driver.supportedCategories.join(', ')}`,
        }, { status: 400 });
      }
    }

    // Check if driver supports pull
    if (!driver.supportedDirections.includes('pull')) {
      return NextResponse.json({
        error: `Driver "${driver.name}" does not support pull sync. It uses push/webhook. Share the webhook URL with your external system.`,
        webhookUrl: `/api/webhook/${connector.id}`,
      }, { status: 400 });
    }

    // Sync each category
    const results: Array<{
      category: string;
      success: boolean;
      records: number;
      message: string;
      durationMs: number;
    }> = [];

    let totalRecords = 0;
    let hasErrors = false;

    for (const category of categories) {
      const catStart = Date.now();
      try {
        const pullResult = await driver.pullData(category, config, {
          branchSlug: branch.slug,
          sinceDate: body.sinceDate,
          untilDate: body.untilDate,
          sheetName: body.sheetName,
          limit: body.limit,
        });

        // Write pulled data to DB
        const count = await writePullResultToDb(pullResult, branch.id);

        results.push({
          category,
          success: true,
          records: count,
          message: `${count} records synced`,
          durationMs: Date.now() - catStart,
        });

        totalRecords += count;

        // Log per-category
        await db.syncLog.create({
          data: {
            connectorId: id,
            direction: 'inbound',
            category,
            method: 'pull',
            recordCount: count,
            status: 'success',
            durationMs: Date.now() - catStart,
            summary: `${count} ${category} records from ${driver.name}`,
          },
        });
      } catch (err: any) {
        hasErrors = true;
        results.push({
          category,
          success: false,
          records: 0,
          message: err.message,
          durationMs: Date.now() - catStart,
        });

        await db.syncLog.create({
          data: {
            connectorId: id,
            direction: 'inbound',
            category,
            method: 'pull',
            recordCount: 0,
            status: 'error',
            errorMessage: err.message,
            durationMs: Date.now() - catStart,
            summary: `${category} sync failed: ${err.message}`,
          },
        });
      }
    }

    // Update connector status
    const overallStatus = hasErrors ? (totalRecords > 0 ? 'partial' : 'error') : 'success';
    await db.connector.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        lastStatus: overallStatus,
        lastError: hasErrors ? `${results.filter(r => !r.success).map(r => `${r.category}: ${r.message}`).join('; ')}` : null,
      },
    });

    return NextResponse.json({
      success: !hasErrors || totalRecords > 0,
      status: overallStatus,
      totalRecords,
      results,
      durationMs: Date.now() - startTime,
      message: hasErrors
        ? `Sync completed with errors. ${totalRecords} records synced.`
        : `${totalRecords} records synced across ${results.length} categories.`,
    });
  } catch (error: any) {
    console.error('[connectors/sync] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Write pulled data to database ──────────────

async function writePullResultToDb(result: any, branchId: string): Promise<number> {
  let count = 0;

  switch (result.type) {
    case 'sales': {
      for (const sale of result.sales) {
        const dateStr = sale.date;
        if (!dateStr) continue;
        const date = new Date(dateStr + 'T00:00:00Z');
        if (isNaN(date.getTime())) continue;

        const month = date.getUTCMonth() + 1;
        const year = date.getUTCFullYear();
        const gross = Number(sale.gross) || 0;
        const returns = Number(sale.returns) || 0;
        const net = Number(sale.net) || (gross - returns);
        const cash = Number(sale.cash) || 0;
        const card = Number(sale.card) || 0;

        const monthlySale = await db.monthlySale.upsert({
          where: { branchId_month_year: { branchId, month, year } },
          create: { branchId, month, year, gross, returns, net, cash, card },
          update: {}, // Don't overwrite existing aggregated data
        });

        await db.dailySale.upsert({
          where: { date_monthlySaleId: { date: dateStr, monthlySaleId: monthlySale.id } },
          create: { date: dateStr, dayOfWeek: date.getUTCDay(), revenue: net, month, year, monthlySaleId: monthlySale.id },
          update: { revenue: net },
        });

        // Products if present in sales record
        if (Array.isArray(sale.products)) {
          for (const prod of sale.products) {
            await db.productSale.create({
              data: {
                branchId,
                name: prod.name,
                sku: prod.sku || null,
                category: prod.category || 'Other',
                quantitySold: Number(prod.quantitySold) || 0,
                revenue: Number(prod.revenue) || 0,
                unitCost: Number(prod.unitCost) || 0,
                sellingPrice: Number(prod.unitPrice) || 0,
                month, year,
              },
            });
            count++;
          }
        }

        count++;
      }
      break;
    }

    case 'inventory': {
      for (const item of result.items) {
        const sku = item.sku;
        if (!sku) continue;
        await db.supplyItem.upsert({
          where: { itemId: sku },
          create: {
            itemId: sku,
            itemName: item.name || sku,
            category: item.category || 'Other',
            currentQtyL: Number(item.currentQtyL) || 0,
            minThresholdL: Number(item.minThresholdL) || 0,
            unitCostAED: Number(item.unitCostAED) || 0,
            supplierName: item.supplier || null,
            branchId,
            lastUpdated: new Date(),
          },
          update: {
            currentQtyL: Number(item.currentQtyL) || undefined,
            minThresholdL: Number(item.minThresholdL) || undefined,
            unitCostAED: Number(item.unitCostAED) || undefined,
            supplierName: item.supplier || undefined,
            lastUpdated: new Date(),
          },
        });
        count++;
      }
      break;
    }

    case 'consumption': {
      for (const c of result.consumptions) {
        const sku = c.sku;
        if (!sku) continue;
        const supplyItem = await db.supplyItem.findUnique({ where: { itemId: sku } });
        if (!supplyItem) continue;

        await db.supplyConsumption.create({
          data: {
            supplyItemId: supplyItem.id,
            date: c.date || new Date().toISOString().split('T')[0],
            qtyUsedL: Number(c.qtyUsedL) || 0,
            staffCode: c.staffCode || null,
            transactionType: c.type || 'sale',
          },
        });
        count++;
      }
      break;
    }

    case 'transactions': {
      for (const t of result.transactions) {
        const monthlySale = await db.monthlySale.upsert({
          where: { branchId_month_year: { branchId, month: t.month, year: t.year } },
          create: { branchId, month: t.month, year: t.year, gross: 0, returns: 0, net: t.totalRevenue, cash: 0, card: 0 },
          update: {},
        });

        await db.transactionSummary.upsert({
          where: { month_year_monthlySaleId: { month: t.month, year: t.year, monthlySaleId: monthlySale.id } },
          create: {
            month: t.month, year: t.year,
            receiptCount: t.receiptCount,
            totalRevenue: t.totalRevenue,
            avgTicketSize: t.avgTicketSize,
            monthlySaleId: monthlySale.id,
          },
          update: {
            receiptCount: t.receiptCount,
            totalRevenue: t.totalRevenue,
            avgTicketSize: t.avgTicketSize,
          },
        });
        count++;
      }
      break;
    }

    case 'products': {
      for (const prod of result.products) {
        await db.productSale.create({
          data: {
            branchId,
            name: prod.name,
            sku: prod.sku || null,
            category: prod.category || 'Other',
            quantitySold: Number(prod.quantitySold) || 0,
            revenue: Number(prod.revenue) || 0,
            unitCost: Number(prod.unitCost) || 0,
            sellingPrice: Number(prod.unitPrice) || 0,
            month: prod.month || null,
            year: prod.year || null,
          },
        });
        count++;
      }
      break;
    }

    case 'staff': {
      for (const s of result.staffCosts) {
        const monthlySale = await db.monthlySale.upsert({
          where: { branchId_month_year: { branchId, month: s.month, year: s.year } },
          create: { branchId, month: s.month, year: s.year, gross: 0, returns: 0, net: 0, cash: 0, card: 0 },
          update: {},
        });

        await db.staffCost.upsert({
          where: { month_year_monthlySaleId: { month: s.month, year: s.year, monthlySaleId: monthlySale.id } },
          create: {
            month: s.month, year: s.year,
            salary: s.salary || 0,
            commission: s.commission || 0,
            visa: s.visa || 0,
            accommodation: s.accommodation || 0,
            overtime: s.overtime || 0,
            other: s.other || 0,
            total: (s.salary || 0) + (s.commission || 0) + (s.visa || 0) + (s.accommodation || 0) + (s.overtime || 0) + (s.other || 0),
            monthlySaleId: monthlySale.id,
          },
          update: {
            salary: s.salary || undefined,
            commission: s.commission || undefined,
            visa: s.visa || undefined,
            accommodation: s.accommodation || undefined,
            overtime: s.overtime || undefined,
            other: s.other || undefined,
            total: (s.salary || 0) + (s.commission || 0) + (s.visa || 0) + (s.accommodation || 0) + (s.overtime || 0) + (s.other || 0),
          },
        });
        count++;
      }
      break;
    }

    case 'expenses': {
      // Group expenses by period or just log them
      for (const e of result.expenses) {
        // For now, create/update a PnlPeriod if we have month/year
        if (e.month && e.year) {
          await db.pnlExpense.create({
            data: { name: e.name, amount: e.amount, pnlPeriodId: await getPnlPeriodId(branchId, e.month, e.year) },
          }).catch(() => {}); // Ignore if no PnlPeriod exists
        }
        count++;
      }
      break;
    }
  }

  return count;
}

// Helper: find or create a PnlPeriod for expense grouping
async function getPnlPeriodId(branchId: string, month: number, year: number): Promise<string> {
  const periodLabel = `Synced ${new Date(year, month - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' })}`;
  let pnl = await db.pnlPeriod.findFirst({ where: { branchId } });
  if (!pnl) {
    pnl = await db.pnlPeriod.create({
      data: { branchId, period: periodLabel, revenue: 0, cogsGoods: 0, cogsAccessories: 0, totalCogs: 0, grossProfit: 0, grossMargin: 0, totalExpenses: 0, netProfitLoss: 0 },
    });
  }
  return pnl.id;
}
