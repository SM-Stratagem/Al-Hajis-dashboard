import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  SEED_MONTHLY_SALES, SEED_DAILY_SALES, SEED_CAPEX,
  SEED_OVERHEADS, SEED_PNL, SEED_PRODUCTS, SEED_STAFF_COSTS,
  SEED_MARKETING, SEED_TRANSACTIONS,
  SEED_SUPPLY_ITEMS, SEED_SUPPLY_CONSUMPTIONS, SEED_SUPPLY_ORDERS,
} from '@/lib/seed-data';
import { DEFAULT_BRANCH_SLUG, BRANCHES, getBranchBySlug } from '@/lib/branches';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { confirm, branchSlug } = body;
    const slug = branchSlug || DEFAULT_BRANCH_SLUG;
    const branchDef = getBranchBySlug(slug);

    if (!confirm) {
      return NextResponse.json({
        message: `This will seed the ${branchDef?.name || slug} branch database with existing Parfumix data. Set confirm: true to proceed.`,
        branch: slug,
        what: [
          '6 months of monthly sales (Oct 2025 – Mar 2026)',
          '181 days of daily sales data',
          '17 CAPEX items',
          '4 overhead items',
          '1 P&L period with 27 expense lines',
          '66 product/SKU records across 5 categories',
          '6 months staff costs',
          '17 marketing spend records',
          '6 months transaction summaries',
          '24 supply chain inventory items (Oils, Alcohol, Combiners, Accessories)',
          '185 daily consumption records',
          '3 historical supply orders',
        ],
      });
    }

    // Ensure the branch exists with correct info from BRANCHES array
    const branch = await db.branch.upsert({
      where: { slug },
      create: {
        name: branchDef?.name || `Parfumix ${slug}`,
        slug,
        city: branchDef?.city || 'Unknown',
        country: branchDef?.country || 'UAE',
        flag: branchDef?.flag || '🇦🇪',
        currency: branchDef?.currency || 'AED',
        sortOrder: branchDef?.sortOrder || 0,
      },
      update: {},
    });

    const results: Record<string, number> = {};

    // ── Clear existing data for this branch ──
    const existingMS = await db.monthlySale.findMany({ where: { branchId: branch.id }, select: { id: true } });
    const msIds = existingMS.map(ms => ms.id);
    await db.dailySale.deleteMany({ where: { monthlySaleId: { in: msIds } } });
    await db.staffCost.deleteMany({ where: { monthlySaleId: { in: msIds } } });
    await db.marketingSpend.deleteMany({ where: { monthlySaleId: { in: msIds } } });
    await db.transactionSummary.deleteMany({ where: { monthlySaleId: { in: msIds } } });
    await db.monthlySale.deleteMany({ where: { branchId: branch.id } });
    await db.capexItem.deleteMany({ where: { branchId: branch.id } });
    await db.overhead.deleteMany({ where: { branchId: branch.id } });
    await db.productSale.deleteMany({ where: { branchId: branch.id } });

    // Clear supply chain data
    const existingOrders = await db.supplyOrder.findMany({ where: { branchId: branch.id }, select: { id: true } });
    const orderIds = existingOrders.map(o => o.id);
    await db.supplyOrderLine.deleteMany({ where: { supplyOrderId: { in: orderIds } } });
    await db.supplyOrder.deleteMany({ where: { branchId: branch.id } });
    const existingSI = await db.supplyItem.findMany({ where: { branchId: branch.id }, select: { id: true } });
    const siIds = existingSI.map(si => si.id);
    await db.supplyConsumption.deleteMany({ where: { supplyItemId: { in: siIds } } });
    await db.supplyItem.deleteMany({ where: { branchId: branch.id } });

    const existingPnl = await db.pnlPeriod.findMany({ where: { branchId: branch.id }, select: { id: true } });
    await db.pnlExpense.deleteMany({ where: { pnlPeriodId: { in: existingPnl.map(p => p.id) } } });
    await db.pnlPeriod.deleteMany({ where: { branchId: branch.id } });

    // ── Monthly Sales ──
    for (const ms of SEED_MONTHLY_SALES) {
      const created = await db.monthlySale.create({
        data: { branchId: branch.id, ...ms },
      });

      const key = `${ms.year}-${String(ms.month).padStart(2, '0')}`;
      const dailyData = SEED_DAILY_SALES[key as keyof typeof SEED_DAILY_SALES];
      if (dailyData) {
        let day = 1;
        let dow = dailyData.startDay;
        for (const revenue of dailyData.values) {
          const date = `${ms.year}-${String(ms.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          await db.dailySale.create({
            data: { date, dayOfWeek: dow, revenue, month: ms.month, year: ms.year, monthlySaleId: created.id },
          });
          day++;
          dow = (dow + 1) % 7;
        }
      }
    }
    results.monthlySales = await db.monthlySale.count({ where: { branchId: branch.id } });
    results.dailySales = await db.dailySale.count({ where: { monthlySale: { branchId: branch.id } } });

    // ── CAPEX ──
    for (const item of SEED_CAPEX) {
      await db.capexItem.create({ data: { ...item, branchId: branch.id } });
    }
    results.capex = await db.capexItem.count({ where: { branchId: branch.id } });

    // ── Overheads ──
    for (const item of SEED_OVERHEADS) {
      await db.overhead.create({ data: { ...item, branchId: branch.id } });
    }
    results.overheads = await db.overhead.count({ where: { branchId: branch.id } });

    // ── P&L ──
    const pnl = await db.pnlPeriod.create({
      data: {
        branchId: branch.id,
        period: SEED_PNL.period,
        revenue: SEED_PNL.revenue,
        cogsGoods: SEED_PNL.cogsGoods,
        cogsAccessories: SEED_PNL.cogsAccessories,
        totalCogs: SEED_PNL.totalCogs,
        grossProfit: SEED_PNL.grossProfit,
        grossMargin: SEED_PNL.grossMargin,
        totalExpenses: SEED_PNL.totalExpenses,
        netProfitLoss: SEED_PNL.netProfitLoss,
        expenses: { create: SEED_PNL.expenses },
      },
    });
    results.pnlPeriods = 1;
    results.pnlExpenses = await db.pnlExpense.count({ where: { pnlPeriodId: pnl.id } });

    // ── Products ──
    for (const p of SEED_PRODUCTS) {
      await db.productSale.create({ data: { ...p, branchId: branch.id } });
    }
    results.products = await db.productSale.count({ where: { branchId: branch.id } });

    // ── Staff Costs ──
    for (const sc of SEED_STAFF_COSTS) {
      const ms = await db.monthlySale.findFirst({ where: { month: sc.month, year: sc.year, branchId: branch.id } });
      const total = sc.salary + sc.commission + sc.visa + sc.accommodation + sc.overtime + sc.other;
      await db.staffCost.create({
        data: { ...sc, total, monthlySaleId: ms?.id || '' },
      });
    }
    results.staffCosts = await db.staffCost.count({ where: { monthlySale: { branchId: branch.id } } });

    // ── Marketing Spend ──
    for (const m of SEED_MARKETING) {
      const ms = await db.monthlySale.findFirst({ where: { month: m.month, year: m.year, branchId: branch.id } });
      await db.marketingSpend.create({
        data: { ...m, monthlySaleId: ms?.id || '' },
      });
    }
    results.marketing = await db.marketingSpend.count({ where: { monthlySale: { branchId: branch.id } } });

    // ── Transaction Summaries ──
    for (const t of SEED_TRANSACTIONS) {
      const ms = await db.monthlySale.findFirst({ where: { month: t.month, year: t.year, branchId: branch.id } });
      const avgTicketSize = t.receiptCount > 0 ? t.totalRevenue / t.receiptCount : null;
      await db.transactionSummary.create({
        data: { month: t.month, year: t.year, receiptCount: t.receiptCount, totalRevenue: t.totalRevenue, avgTicketSize, monthlySaleId: ms?.id || '' },
      });
    }
    results.transactions = await db.transactionSummary.count({ where: { monthlySale: { branchId: branch.id } } });

    // ── Supply Chain: Inventory Items ──
    for (const si of SEED_SUPPLY_ITEMS) {
      await db.supplyItem.create({
        data: {
          ...si,
          lastUpdated: new Date(),
          branchId: branch.id,
        },
      });
    }
    results.supplyItems = await db.supplyItem.count({ where: { branchId: branch.id } });

    // ── Supply Chain: Consumption Records ──
    const itemMap = new Map<string, string>();
    const allSupplyItems = await db.supplyItem.findMany({ where: { branchId: branch.id }, select: { itemId: true, id: true } });
    for (const si of allSupplyItems) itemMap.set(si.itemId, si.id);

    for (const c of SEED_SUPPLY_CONSUMPTIONS) {
      const siId = itemMap.get(c.itemId);
      if (siId) {
        await db.supplyConsumption.create({
          data: {
            date: c.date,
            qtyUsedL: c.qtyUsedL,
            staffCode: c.staffCode,
            transactionType: c.transactionType,
            supplyItemId: siId,
          },
        });
      }
    }
    results.supplyConsumptions = await db.supplyConsumption.count({
      where: { supplyItem: { branchId: branch.id } },
    });

    // ── Supply Chain: Historical Orders ──
    for (const order of SEED_SUPPLY_ORDERS) {
      const so = await db.supplyOrder.create({
        data: {
          orderId: order.orderId,
          branchId: branch.id,
          branchName: branch.name,
          deliveryRequested: order.deliveryRequested || null,
          generatedBy: order.generatedBy,
          orderTotalAED: order.lineItems.reduce((s: number, li: any) => s + li.lineTotalAED, 0),
          status: order.status,
          notes: order.notes || null,
          lineItems: {
            create: order.lineItems.map((li: any) => ({
              itemId: li.itemId,
              itemName: li.itemName,
              category: li.category,
              currentSohL: li.currentSohL,
              orderQtyL: li.orderQtyL,
              unitCostAED: li.unitCostAED,
              lineTotalAED: li.lineTotalAED,
              priority: li.priority,
              supplierLeadDays: li.supplierLeadDays || 3,
              urgent: li.urgent || false,
              supplyItemId: itemMap.get(li.itemId) || null,
            })),
          },
        },
      });
    }
    results.supplyOrders = await db.supplyOrder.count({ where: { branchId: branch.id } });

    // ── Log upload ──
    await db.dataUpload.create({
      data: { branchId: branch.id, category: 'seed', fileName: 'builtin-seed', rowCount: Object.values(results).reduce((a, b) => a + b, 0), status: 'success' },
    });

    return NextResponse.json({
      success: true,
      message: `Database seeded for branch: ${branch.name} (${slug})`,
      branch: { id: branch.id, name: branch.name, slug },
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
