import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV, toNumber } from '@/lib/csv-parser';

export async function GET() {
  const data = await db.overhead.findMany();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.csv) {
      const { rows } = parseCSV(body.csv);
      const created = [];
      await db.overhead.deleteMany({});

      for (const row of rows) {
        const name = row.name || row.item || row.description || '';
        const amount = toNumber(row.amount || row.cost || row.value);
        if (!name || !amount) continue;

        const data = await db.overhead.create({ data: { name, amount } });
        created.push(data);
      }

      await db.dataUpload.create({
        data: { category: 'overheads', fileName: body.fileName || 'upload.csv', rowCount: created.length, status: 'success' },
      });

      return NextResponse.json({ success: true, count: created.length });
    }

    if (Array.isArray(body)) {
      await db.overhead.deleteMany({});
      await db.overhead.createMany({ data: body });
      return NextResponse.json({ success: true, count: body.length });
    }

    return NextResponse.json({ error: 'Provide csv string or JSON array' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
