import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE() {
  await db.dailySale.deleteMany({});
  await db.monthlySale.deleteMany({});
  await db.capexItem.deleteMany({});
  await db.overhead.deleteMany({});
  await db.pnlExpense.deleteMany({});
  await db.pnlPeriod.deleteMany({});
  await db.productSale.deleteMany({});
  await db.staffCost.deleteMany({});
  await db.marketingSpend.deleteMany({});
  await db.transactionSummary.deleteMany({});
  await db.dataUpload.deleteMany({});
  return NextResponse.json({ success: true, message: 'All data cleared' });
}
