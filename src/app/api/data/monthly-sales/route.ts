import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV, toNumber } from '@/lib/csv-parser';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');
  const branchSlug = searchParams.get('branchSlug');

  let where: any = {};
  if (branchId) {
    where.branchId = branchId;
  } else if (branchSlug) {
    const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
    if (branch) where.branchId = branch.id;
  }

  const data = await db.monthlySale.findMany({
    where,
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchId = body.branchId;

    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    // Verify branch exists
    const branch = await db.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    if (body.csv) {
      const { rows } = parseCSV(body.csv);
      const created = [];

      await db.monthlySale.deleteMany({ where: { branchId } });

      for (const row of rows) {
        const month = toNumber(row.month || row['month_num'] || row.m);
        const year = toNumber(row.year || row.yr || row.y);
        if (!month || !year) continue;

        const data = await db.monthlySale.create({
          data: {
            branchId,
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
        data: { branchId, category: 'monthly-sales', fileName: body.fileName || 'upload.csv', rowCount: created.length, status: 'success' },
      });

      return NextResponse.json({ success: true, count: created.length });
    }

    if (Array.isArray(body)) {
      await db.monthlySale.deleteMany({ where: { branchId } });
      const created = await db.monthlySale.createMany({
        data: body.map((item: any) => ({ ...item, branchId })),
      });
      return NextResponse.json({ success: true, count: created.count });
    }

    return NextResponse.json({ error: 'Provide csv string or JSON array' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
