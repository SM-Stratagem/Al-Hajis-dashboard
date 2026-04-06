import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { BRANCHES, COUNTRIES } from '@/lib/branches';

// GET /api/branches — returns all branches with hierarchy + data status
export async function GET() {
  // Ensure all branches exist in the database
  for (const b of BRANCHES) {
    await db.branch.upsert({
      where: { slug: b.slug },
      create: {
        name: b.name,
        slug: b.slug,
        city: b.city,
        country: b.country,
        flag: b.flag,
        currency: b.currency,
        sortOrder: b.sortOrder,
      },
      update: {},
    });
  }

  // Get data counts per branch
  const branches = await db.branch.findMany({ orderBy: { sortOrder: 'asc' } });
  const monthlyCounts = await db.monthlySale.groupBy({
    by: ['branchId'],
    _count: true,
  });
  const capexCounts = await db.capexItem.groupBy({
    by: ['branchId'],
    _count: true,
  });
  const pnlCounts = await db.pnlPeriod.groupBy({
    by: ['branchId'],
    _count: true,
  });

  const countMap: Record<string, Record<string, number>> = {};
  for (const mc of monthlyCounts) countMap[mc.branchId] = { monthly: mc._count };
  for (const cc of capexCounts) {
    if (!countMap[cc.branchId]) countMap[cc.branchId] = {};
    countMap[cc.branchId].capex = cc._count;
  }
  for (const pc of pnlCounts) {
    if (!countMap[pc.branchId]) countMap[pc.branchId] = {};
    countMap[pc.branchId].pnl = pc._count;
  }

  const enriched = branches.map(b => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    city: b.city,
    country: b.country,
    flag: b.flag,
    currency: b.currency,
    sortOrder: b.sortOrder,
    hasData: !!countMap[b.id],
    dataCounts: countMap[b.id] || {},
  }));

  return NextResponse.json({
    branches: enriched,
    hierarchy: COUNTRIES,
  });
}
