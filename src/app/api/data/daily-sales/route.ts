import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV, toNumber, parseDate } from '@/lib/csv-parser';

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

  const data = await db.dailySale.findMany({
    where,
    orderBy: { date: 'asc' },
  });
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
        const dateStr = row.date || row.day;
        const month = toNumber(row.month || row.m);
        const year = toNumber(row.year || row.yr || row.y);
        const revenue = toNumber(row.revenue || row.sales || row.amount || row.total);

        if (!month || !year || !revenue) continue;

        let date: string;
        let dayOfWeek: number;
        const parsed = parseDate(dateStr);
        if (parsed) {
          date = parsed.date;
          dayOfWeek = parsed.dayOfWeek;
        } else {
          const day = toNumber(row.day_num || row.day_number || row.d);
          date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const d = new Date(year, month - 1, day);
          dayOfWeek = d.getDay();
        }

        const ms = await db.monthlySale.findFirst({ where: { month, year, branchId } });
        if (!ms) continue;

        const data = await db.dailySale.create({
          data: { date, dayOfWeek, revenue, month, year, monthlySaleId: ms.id },
        });
        created.push(data);
      }

      await db.dataUpload.create({
        data: { branchId, category: 'daily-sales', fileName: body.fileName || 'upload.csv', rowCount: created.length, status: 'success' },
      });

      return NextResponse.json({ success: true, count: created.length });
    }

    if (Array.isArray(body)) {
      const created = await db.dailySale.createMany({ data: body });
      return NextResponse.json({ success: true, count: created.count });
    }

    return NextResponse.json({ error: 'Provide csv string or JSON array' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
