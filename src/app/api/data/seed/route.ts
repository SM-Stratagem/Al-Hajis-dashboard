import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  SEED_MONTHLY_SALES, SEED_DAILY_SALES, SEED_CAPEX,
  SEED_OVERHEADS, SEED_PNL,
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
