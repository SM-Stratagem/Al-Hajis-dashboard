import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchSlug = searchParams.get('branchSlug');

  let branchWhere: any = {};
  if (branchSlug) {
    const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
    if (branch) branchWhere = { branchId: branch.id };
  }

  const monthly = await db.monthlySale.findMany({ where: branchWhere, orderBy: [{ year: 'asc' }, { month: 'asc' }] });
  const daily = await db.dailySale.findMany({
    where: branchWhere.branchId ? { monthlySale: { branchId: branchWhere.branchId } } : {},
    orderBy: { date: 'asc' },
  });
  const capex = await db.capexItem.findMany({ where: branchWhere });
  const overheads = await db.overhead.findMany({ where: branchWhere });
  const pnl = await db.pnlPeriod.findMany({ where: branchWhere, include: { expenses: true } });
  const products = await db.productSale.findMany({ where: branchWhere, orderBy: [{ year: 'asc' }, { month: 'asc' }] });
  const uploads = await db.dataUpload.findMany({
    where: branchWhere.branchId ? { branchId: branchWhere.branchId } : {},
    orderBy: { createdAt: 'desc' }, take: 20,
  });

  return NextResponse.json({
    counts: {
      monthlySales: monthly.length,
      dailySales: daily.length,
      capexItems: capex.length,
      overheads: overheads.length,
      pnlPeriods: pnl.length,
      products: products.length,
    },
    hasData: {
      monthlySales: monthly.length > 0,
      dailySales: daily.length > 0,
      capex: capex.length > 0,
      overheads: overheads.length > 0,
      pnl: pnl.length > 0,
      products: products.length > 0,
    },
    recentUploads: uploads,
  });
}
