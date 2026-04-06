import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV, toNumber } from '@/lib/csv-parser';

export async function GET() {
  const data = await db.capexItem.findMany({ orderBy: { amount: 'desc' } });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.csv) {
      const { rows } = parseCSV(body.csv);
      const created = [];
      await db.capexItem.deleteMany({});

      for (const row of rows) {
        const name = row.name || row.item || row.description || '';
        const amount = toNumber(row.amount || row.cost || row.value || row.total);
        const category = row.category || row.type || row.cat || 'Other';
        if (!name || !amount) continue;

        const data = await db.capexItem.create({ data: { name, amount, category } });
        created.push(data);
      }

      await db.dataUpload.create({
        data: { category: 'capex', fileName: body.fileName || 'upload.csv', rowCount: created.length, status: 'success' },
      });

      return NextResponse.json({ success: true, count: created.length });
    }

    if (Array.isArray(body)) {
      await db.capexItem.deleteMany({});
      await db.capexItem.createMany({ data: body });
      return NextResponse.json({ success: true, count: body.length });
    }

    return NextResponse.json({ error: 'Provide csv string or JSON array' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  await db.capexItem.deleteMany({});
  return NextResponse.json({ success: true });
}
