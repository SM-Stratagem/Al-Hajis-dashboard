import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV, toNumber } from '@/lib/csv-parser';

export async function GET() {
  const data = await db.monthlySale.findMany({ orderBy: [{ year: 'asc' }, { month: 'asc' }] });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.csv) {
      // CSV upload mode
      const { headers, rows } = parseCSV(body.csv);
      const created = [];

      await db.monthlySale.deleteMany({});

      for (const row of rows) {
        const month = toNumber(row.month || row['month_num'] || row.m);
        const year = toNumber(row.year || row.yr || row.y);
        if (!month || !year) continue;

        const data = await db.monthlySale.create({
          data: {
            month,
            year,
            gross: toNumber(row.gross || row.total_gross || row.gross_revenue),
            returns: toNumber(row.returns || row.return_amount),
            net: toNumber(row.net || row.net_revenue || row.net_sales),
            cash: toNumber(row.cash || row.cash_sales),
            card: toNumber(row.card || row.card_sales || row.credit_card),
          },
        });
        created.push(data);
      }

      await db.dataUpload.create({
        data: { category: 'monthly-sales', fileName: body.fileName || 'upload.csv', rowCount: created.length, status: 'success' },
      });

      return NextResponse.json({ success: true, count: created.length });
    }

    // Direct JSON array mode
    if (Array.isArray(body)) {
      await db.monthlySale.deleteMany({});
      const created = await db.monthlySale.createMany({ data: body });
      return NextResponse.json({ success: true, count: created.count });
    }

    return NextResponse.json({ error: 'Provide csv string or JSON array' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
