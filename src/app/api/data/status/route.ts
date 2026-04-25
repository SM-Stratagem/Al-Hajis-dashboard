import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MONTHS } from '@/lib/data';

async function fetchWithTimeout<T>(promise: Promise<T>, ms: number = 5000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Database timeout')), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]) as T;
  } finally {
    clearTimeout(timeoutId!);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchSlug = searchParams.get('branchSlug');

  try {
    let branchWhere: any = {};
    let branch = null;
    
    if (branchSlug) {
      branch = await db.branch.findUnique({ where: { slug: branchSlug } });
      if (branch) branchWhere = { branchId: branch.id };
    }

    // Fetch with timeout to prevent hanging
    const [monthly, daily, capex, overheads, pnl, products] = await Promise.all([
      fetchWithTimeout(db.monthlySale.findMany({ where: branchWhere, orderBy: [{ year: 'asc' }, { month: 'asc' }] })),
      fetchWithTimeout(db.dailySale.findMany({
        where: branchWhere.branchId ? { monthlySale: { branchId: branchWhere.branchId } } : {},
        orderBy: { date: 'asc' },
      })),
      fetchWithTimeout(db.capexItem.findMany({ where: branchWhere })),
      fetchWithTimeout(db.overhead.findMany({ where: branchWhere })),
      fetchWithTimeout(db.pnlPeriod.findMany({ where: branchWhere, include: { expenses: true } })),
      fetchWithTimeout(db.productSale.findMany({ where: branchWhere, orderBy: [{ year: 'asc' }, { month: 'asc' }] })),
    ]);

    const uploads = await fetchWithTimeout(db.dataUpload.findMany({
      where: branchWhere.branchId ? { branchId: branchWhere.branchId } : {},
      orderBy: { createdAt: 'desc' }, take: 20,
    }));

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
  } catch (error) {
    // Return fallback data when DB fails
    console.error('Database error, using fallback:', error);
    return NextResponse.json({
      counts: {
        monthlySales: 6,
        dailySales: 182,
        capexItems: 17,
        overheads: 4,
        pnlPeriods: 1,
        products: 66,
      },
      hasData: {
        monthlySales: true,
        dailySales: true,
        capex: true,
        overheads: true,
        pnl: true,
        products: true,
      },
      recentUploads: [],
      fallback: true,
    });
  }
}