import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const monthly = await db.monthlySale.findMany({ orderBy: [{ year: 'asc' }, { month: 'asc' }] });
  const daily = await db.dailySale.findMany({ orderBy: { date: 'asc' } });
  const capex = await db.capexItem.findMany();
  const overheads = await db.overhead.findMany();
  const pnl = await db.pnlPeriod.findMany({ include: { expenses: true } });
  const products = await db.productSale.findMany({ orderBy: [{ year: 'asc' }, { month: 'asc' }] });
  const staffCosts = await db.staffCost.findMany({ orderBy: [{ year: 'asc' }, { month: 'asc' }] });
  const marketing = await db.marketingSpend.findMany({ orderBy: [{ year: 'asc' }, { month: 'asc' }] });
  const transactions = await db.transactionSummary.findMany({ orderBy: [{ year: 'asc' }, { month: 'asc' }] });
  const uploads = await db.dataUpload.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });

  return NextResponse.json({
    counts: {
      monthlySales: monthly.length,
      dailySales: daily.length,
      capexItems: capex.length,
      overheads: overheads.length,
      pnlPeriods: pnl.length,
      products: products.length,
      staffCosts: staffCosts.length,
      marketingSpends: marketing.length,
      transactionSummaries: transactions.length,
    },
    hasData: {
      monthlySales: monthly.length > 0,
      dailySales: daily.length > 0,
      capex: capex.length > 0,
      overheads: overheads.length > 0,
      pnl: pnl.length > 0,
      products: products.length > 0,
      staffCosts: staffCosts.length > 0,
      marketing: marketing.length > 0,
      transactions: transactions.length > 0,
    },
    recentUploads: uploads,
  });
}
