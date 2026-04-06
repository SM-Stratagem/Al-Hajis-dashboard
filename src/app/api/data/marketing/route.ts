import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV, toNumber } from '@/lib/csv-parser';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchSlug = searchParams.get('branchSlug');

  let where: any = {};
  if (branchSlug) {
    const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
    if (branch) {
      where.monthlySale = { branchId: branch.id };
    }
  }

  const data = await db.marketingSpend.findMany({ where, orderBy: [{ year: 'asc' }, { month: 'asc' }] });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchId = body.branchId;
    if (!branchId) return NextResponse.json({ error: 'branchId is required' }, { status: 400 });

    if (body.csv) {
      const { rows } = parseCSV(body.csv);
      const created = [];

      for (const row of rows) {
        const month = toNumber(row.month || row.m);
        const year = toNumber(row.year || row.yr || row.y);
        const channel = row.channel || row.platform || row.source || row.type || '';
        const amount = toNumber(row.amount || row.spend || row.cost);
        const notes = row.notes || row.description || row.campaign || null;
        if (!month || !year || !channel || !amount) continue;

        const ms = await db.monthlySale.findFirst({ where: { month, year, branchId } });

        const data = await db.marketingSpend.create({
          data: { month, year, channel, amount, notes, monthlySaleId: ms?.id || '' },
        });
        created.push(data);
      }

      await db.dataUpload.create({
        data: { branchId, category: 'marketing', fileName: body.fileName || 'upload.csv', rowCount: created.length, status: 'success' },
      });

      return NextResponse.json({ success: true, count: created.length });
    }

    if (Array.isArray(body)) {
      await db.marketingSpend.deleteMany({});
      await db.marketingSpend.createMany({ data: body });
      return NextResponse.json({ success: true, count: body.length });
    }

    return NextResponse.json({ error: 'Provide csv string or JSON array' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await db.marketingSpend.deleteMany({});
  return NextResponse.json({ success: true });
}
