import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV, toNumber } from '@/lib/csv-parser';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchSlug = searchParams.get('branchSlug');

  let where: any = {};
  if (branchSlug) {
    const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
    if (branch) where.branchId = branch.id;
  }

  const data = await db.capexItem.findMany({ where, orderBy: { amount: 'desc' } });
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
      await db.capexItem.deleteMany({ where: { branchId } });

      for (const row of rows) {
        const name = row.name || row.item || row.description || '';
        const amount = toNumber(row.amount || row.cost || row.value || row.total);
        const category = row.category || row.type || row.cat || 'Other';
        if (!name || !amount) continue;

        const data = await db.capexItem.create({ data: { name, amount, category, branchId } });
        created.push(data);
      }

      await db.dataUpload.create({
        data: { branchId, category: 'capex', fileName: body.fileName || 'upload.csv', rowCount: created.length, status: 'success' },
      });

      return NextResponse.json({ success: true, count: created.length });
    }

    if (Array.isArray(body)) {
      await db.capexItem.deleteMany({ where: { branchId } });
      await db.capexItem.createMany({ data: body.map((i: any) => ({ ...i, branchId })) });
      return NextResponse.json({ success: true, count: body.length });
    }

    return NextResponse.json({ error: 'Provide csv string or JSON array' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');
  await db.capexItem.deleteMany({ where: branchId ? { branchId } : {} });
  return NextResponse.json({ success: true });
}
