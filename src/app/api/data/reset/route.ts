import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');

  if (branchId) {
    // Delete data for a specific branch
    const monthlySales = await db.monthlySale.findMany({ where: { branchId }, select: { id: true } });
    const msIds = monthlySales.map(ms => ms.id);

    await db.dailySale.deleteMany({ where: { monthlySaleId: { in: msIds } } });
    await db.staffCost.deleteMany({ where: { monthlySaleId: { in: msIds } } });
    await db.marketingSpend.deleteMany({ where: { monthlySaleId: { in: msIds } } });
    await db.transactionSummary.deleteMany({ where: { monthlySaleId: { in: msIds } } });
    await db.monthlySale.deleteMany({ where: { branchId } });
    await db.capexItem.deleteMany({ where: { branchId } });
    await db.overhead.deleteMany({ where: { branchId } });
    await db.productSale.deleteMany({ where: { branchId } });

    const pnlPeriods = await db.pnlPeriod.findMany({ where: { branchId }, select: { id: true } });
    await db.pnlExpense.deleteMany({ where: { pnlPeriodId: { in: pnlPeriods.map(p => p.id) } } });
    await db.pnlPeriod.deleteMany({ where: { branchId } });

    await db.dataUpload.deleteMany({ where: { branchId } });

    return NextResponse.json({ success: true, message: `Data cleared for branch ${branchId}` });
  }

  // Delete all data
  await db.dailySale.deleteMany({});
  await db.staffCost.deleteMany({});
  await db.marketingSpend.deleteMany({});
  await db.transactionSummary.deleteMany({});
  await db.monthlySale.deleteMany({});
  await db.capexItem.deleteMany({});
  await db.overhead.deleteMany({});
  await db.productSale.deleteMany({});
  await db.pnlExpense.deleteMany({});
  await db.pnlPeriod.deleteMany({});
  await db.dataUpload.deleteMany({});
  return NextResponse.json({ success: true, message: 'All data cleared' });
}
