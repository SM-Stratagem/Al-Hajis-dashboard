import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV, toNumber } from '@/lib/csv-parser';

export async function GET() {
  const data = await db.transactionSummary.findMany({ orderBy: [{ year: 'asc' }, { month: 'asc' }] });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.csv) {
      const { rows } = parseCSV(body.csv);
      const created = [];

      for (const row of rows) {
        const month = toNumber(row.month || row.m);
        const year = toNumber(row.year || row.yr || row.y);
        const receiptCount = toNumber(row.receipts || row.transactions || row.receipt_count || row.tx_count);
        const totalRevenue = toNumber(row.revenue || row.total || row.total_revenue);
        const avgTicketSize = receiptCount > 0 ? totalRevenue / receiptCount : null;
        if (!month || !year || !receiptCount) continue;

        const ms = await db.monthlySale.findFirst({ where: { month, year } });

        const data = await db.transactionSummary.create({
          data: { month, year, receiptCount, totalRevenue, avgTicketSize, monthlySaleId: ms?.id || '' },
        });
        created.push(data);
      }

      await db.dataUpload.create({
        data: { category: 'transactions', fileName: body.fileName || 'upload.csv', rowCount: created.length, status: 'success' },
      });

      return NextResponse.json({ success: true, count: created.length });
    }

    if (Array.isArray(body)) {
      await db.transactionSummary.deleteMany({});
      await db.transactionSummary.createMany({ data: body });
      return NextResponse.json({ success: true, count: body.length });
    }

    return NextResponse.json({ error: 'Provide csv string or JSON array' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  await db.transactionSummary.deleteMany({});
  return NextResponse.json({ success: true });
}
