import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  SEED_MONTHLY_SALES, SEED_DAILY_SALES, SEED_CAPEX,
  SEED_OVERHEADS, SEED_PNL,
} from '@/lib/seed-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { confirm } = body;

    if (!confirm) {
      return NextResponse.json({
        message: 'This will seed the database with existing Parfumix ADCB data. Set confirm: true to proceed.',
        what: [
          '6 months of monthly sales (Oct 2025 – Mar 2026)',
          '181 days of daily sales data',
          '17 CAPEX items',
          '4 overhead items',
          '1 P&L period with 27 expense lines',
        ],
      });
    }

    const results: Record<string, number> = {};

    // ── Monthly Sales ──
    await db.dailySale.deleteMany({});
    await db.monthlySale.deleteMany({});
    for (const ms of SEED_MONTHLY_SALES) {
      const created = await db.monthlySale.create({ data: ms });

      // Seed daily sales for this month
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
    results.monthlySales = await db.monthlySale.count();
    results.dailySales = await db.dailySale.count();

    // ── CAPEX ──
    await db.capexItem.deleteMany({});
    for (const item of SEED_CAPEX) {
      await db.capexItem.create({ data: item });
    }
    results.capex = await db.capexItem.count();

    // ── Overheads ──
    await db.overhead.deleteMany({});
    for (const item of SEED_OVERHEADS) {
      await db.overhead.create({ data: item });
    }
    results.overheads = await db.overhead.count();

    // ── P&L ──
    await db.pnlExpense.deleteMany({});
    await db.pnlPeriod.deleteMany({});
    const pnl = await db.pnlPeriod.create({
      data: {
        period: SEED_PNL.period,
        revenue: SEED_PNL.revenue,
        cogsGoods: SEED_PNL.cogsGoods,
        cogsAccessories: SEED_PNL.cogsAccessories,
        totalCogs: SEED_PNL.totalCogs,
        grossProfit: SEED_PNL.grossProfit,
        grossMargin: SEED_PNL.grossMargin,
        totalExpenses: SEED_PNL.totalExpenses,
        netProfitLoss: SEED_PNL.netProfitLoss,
        expenses: {
          create: SEED_PNL.expenses,
        },
      },
    });
    results.pnlPeriods = 1;
    results.pnlExpenses = await db.pnlExpense.count({ where: { pnlPeriodId: pnl.id } });

    // ── Log upload ──
    await db.dataUpload.create({
      data: { category: 'seed', fileName: 'builtin-seed', rowCount: Object.values(results).reduce((a, b) => a + b, 0), status: 'success' },
    });

    return NextResponse.json({
      success: true,
      message: 'Database seeded with existing Parfumix ADCB data',
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
