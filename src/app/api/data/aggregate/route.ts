import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { BRANCHES } from '@/lib/branches';

// ─── GET /api/data/aggregate?viewType=all|country|city&country=...&city=... ───
// Returns aggregated data across multiple branches for multi-branch views.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viewType = searchParams.get('viewType') as 'all' | 'country' | 'city' | null;
  const country = searchParams.get('country');
  const city = searchParams.get('city');

  // ── 1. Validate & filter branches from BRANCHES array ──────────────
  let matchingBranches = BRANCHES;

  if (viewType === 'country') {
    if (!country) {
      return NextResponse.json({ error: '"country" is required when viewType is "country"' }, { status: 400 });
    }
    matchingBranches = BRANCHES.filter((b) => b.country === country);
  } else if (viewType === 'city') {
    if (!country || !city) {
      return NextResponse.json({ error: '"country" and "city" are required when viewType is "city"' }, { status: 400 });
    }
    matchingBranches = BRANCHES.filter((b) => b.country === country && b.city === city);
  }
  // viewType === 'all' or omitted → all branches

  if (matchingBranches.length === 0) {
    return NextResponse.json({
      monthlySales: [],
      dailySales: [],
      capexItems: [],
      overheads: [],
      pnl: [],
      branchCount: 0,
      branchNames: [],
    });
  }

  // ── 2. Resolve branch slugs → DB branch IDs ────────────────────────
  const slugs = matchingBranches.map((b) => b.slug);
  const branchesInDb = await db.branch.findMany({
    where: { slug: { in: slugs } },
  });

  if (branchesInDb.length === 0) {
    return NextResponse.json({
      monthlySales: [],
      dailySales: [],
      capexItems: [],
      overheads: [],
      pnl: [],
      branchCount: 0,
      branchNames: [],
    });
  }

  const branchIds = branchesInDb.map((b) => b.id);

  // Build a lookup: branchId → branch name
  const branchNameMap = new Map<string, string>();
  for (const b of branchesInDb) {
    branchNameMap.set(b.id, b.name);
  }

  // ── 3. Fetch all data in parallel ───────────────────────────────────
  const [monthlySales, capexItems, overheads, pnlPeriods] = await Promise.all([
    // Monthly sales for these branches
    db.monthlySale.findMany({
      where: { branchId: { in: branchIds } },
      include: { dailySales: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    }),
    // CAPEX items
    db.capexItem.findMany({
      where: { branchId: { in: branchIds } },
      orderBy: { amount: 'desc' },
    }),
    // Overheads
    db.overhead.findMany({
      where: { branchId: { in: branchIds } },
    }),
    // P&L periods with expenses
    db.pnlPeriod.findMany({
      where: { branchId: { in: branchIds } },
      include: { expenses: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // ── 4. Aggregate monthly sales ──────────────────────────────────────
  const monthlySalesMap = new Map<string, {
    month: number;
    year: number;
    gross: number;
    returns: number;
    net: number;
    cash: number;
    card: number;
  }>();

  for (const ms of monthlySales) {
    const key = `${ms.year}-${ms.month}`;
    const existing = monthlySalesMap.get(key);
    if (existing) {
      existing.gross += ms.gross;
      existing.returns += ms.returns;
      existing.net += ms.net;
      existing.cash += ms.cash;
      existing.card += ms.card;
    } else {
      monthlySalesMap.set(key, {
        month: ms.month,
        year: ms.year,
        gross: ms.gross,
        returns: ms.returns,
        net: ms.net,
        cash: ms.cash,
        card: ms.card,
      });
    }
  }

  const aggregatedMonthlySales = Array.from(monthlySalesMap.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month
  );

  // ── 5. Aggregate daily sales ────────────────────────────────────────
  const dailySalesMap = new Map<string, {
    date: string;
    dayOfWeek: number;
    revenue: number;
  }>();

  for (const ms of monthlySales) {
    for (const ds of ms.dailySales) {
      const existing = dailySalesMap.get(ds.date);
      if (existing) {
        existing.revenue += ds.revenue;
      } else {
        dailySalesMap.set(ds.date, {
          date: ds.date,
          dayOfWeek: ds.dayOfWeek,
          revenue: ds.revenue,
        });
      }
    }
  }

  const aggregatedDailySales = Array.from(dailySalesMap.values()).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // ── 6. CAPEX items — list all with branchName attached ─────────────
  const aggregatedCapex = capexItems.map((item) => ({
    id: item.id,
    name: item.name,
    amount: item.amount,
    category: item.category,
    branchName: branchNameMap.get(item.branchId) || 'Unknown',
  }));

  // ── 7. Overheads — list all with branchName attached ───────────────
  const aggregatedOverheads = overheads.map((item) => ({
    id: item.id,
    name: item.name,
    amount: item.amount,
    branchName: branchNameMap.get(item.branchId) || 'Unknown',
  }));

  // ── 8. Aggregate P&L by period ─────────────────────────────────────
  const pnlMap = new Map<string, {
    period: string;
    revenue: number;
    cogsGoods: number;
    cogsAccessories: number;
    totalCogs: number;
    grossProfit: number;
    grossMargin: number;
    totalExpenses: number;
    netProfitLoss: number;
    expenses: { name: string; amount: number }[];
  }>();

  for (const pnl of pnlPeriods) {
    const key = pnl.period;
    const existing = pnlMap.get(key);

    if (existing) {
      existing.revenue += pnl.revenue;
      existing.cogsGoods += pnl.cogsGoods;
      existing.cogsAccessories += pnl.cogsAccessories;
      existing.totalCogs += pnl.totalCogs;
      existing.grossProfit += pnl.grossProfit;
      existing.totalExpenses += pnl.totalExpenses;
      existing.netProfitLoss += pnl.netProfitLoss;

      // Merge expense line items by name
      for (const exp of pnl.expenses) {
        const expEntry = existing.expenses.find((e) => e.name === exp.name);
        if (expEntry) {
          expEntry.amount += exp.amount;
        } else {
          existing.expenses.push({ name: exp.name, amount: exp.amount });
        }
      }
    } else {
      pnlMap.set(key, {
        period: pnl.period,
        revenue: pnl.revenue,
        cogsGoods: pnl.cogsGoods,
        cogsAccessories: pnl.cogsAccessories,
        totalCogs: pnl.totalCogs,
        grossProfit: pnl.grossProfit,
        grossMargin: pnl.revenue > 0 ? (pnl.grossProfit / pnl.revenue) * 100 : 0,
        totalExpenses: pnl.totalExpenses,
        netProfitLoss: pnl.netProfitLoss,
        expenses: pnl.expenses.map((e) => ({ name: e.name, amount: e.amount })),
      });
    }
  }

  // Recalculate grossMargin as weighted average across branches for each period
  const aggregatedPnl = Array.from(pnlMap.values()).map((p) => ({
    ...p,
    grossMargin: p.revenue > 0 ? (p.grossProfit / p.revenue) * 100 : 0,
    expenses: p.expenses.sort((a, b) => b.amount - a.amount),
  }));

  // ── 9. Collect branch names that had any data ───────────────────────
  const branchIdsWithData = new Set<string>();

  for (const ms of monthlySales) branchIdsWithData.add(ms.branchId);
  for (const ci of capexItems) branchIdsWithData.add(ci.branchId);
  for (const oh of overheads) branchIdsWithData.add(oh.branchId);
  for (const p of pnlPeriods) branchIdsWithData.add(p.branchId);

  const branchNames = Array.from(branchIdsWithData)
    .map((id) => branchNameMap.get(id) || id)
    .sort();

  // ── 10. Per-branch revenue summary for comparison charts ─────────
  const branchRevenueMap = new Map<string, number>();
  for (const ms of monthlySales) {
    const existing = branchRevenueMap.get(ms.branchId) || 0;
    branchRevenueMap.set(ms.branchId, existing + ms.net);
  }

  const branchComparison = Array.from(branchRevenueMap.entries())
    .map(([branchId, totalNet]) => ({
      branchId,
      branchName: branchNameMap.get(branchId) || branchId,
      totalNet: Math.round(totalNet * 100) / 100,
      monthCount: new Set(
        monthlySales.filter((ms) => ms.branchId === branchId).map((ms) => `${ms.year}-${ms.month}`)
      ).size,
    }))
    .sort((a, b) => b.totalNet - a.totalNet);

  // ── 11. Return aggregated response ─────────────────────────────────
  return NextResponse.json({
    monthlySales: aggregatedMonthlySales,
    dailySales: aggregatedDailySales,
    capexItems: aggregatedCapex,
    overheads: aggregatedOverheads,
    pnl: aggregatedPnl,
    branchCount: branchNames.length,
    branchNames,
    branchComparison,
  });
}
