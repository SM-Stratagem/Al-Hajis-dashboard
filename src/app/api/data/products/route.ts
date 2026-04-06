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

  const data = await db.productSale.findMany({ where, orderBy: [{ year: 'asc' }, { month: 'asc' }, { revenue: 'desc' }] });
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
        const name = row.name || row.product || row.item || row.sku_name || '';
        const sku = row.sku || row.code || null;
        const category = row.category || row.type || row.cat || '';
        const unitCost = toNumber(row.unit_cost || row.cost || row.purchase_price);
        const sellingPrice = toNumber(row.selling_price || row.price || row.sale_price);
        const quantitySold = toNumber(row.quantity || row.qty || row.units_sold);
        const revenue = toNumber(row.revenue || row.total || row.sales);
        const month = toNumber(row.month || row.m) || null;
        const year = toNumber(row.year || row.yr || row.y) || null;
        const margin = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : null;

        if (!name) continue;

        const data = await db.productSale.create({
          data: { name, sku, category, unitCost, sellingPrice, quantitySold, revenue, margin, month, year, branchId },
        });
        created.push(data);
      }

      await db.dataUpload.create({
        data: { branchId, category: 'products', fileName: body.fileName || 'upload.csv', rowCount: created.length, status: 'success' },
      });

      return NextResponse.json({ success: true, count: created.length });
    }

    if (Array.isArray(body)) {
      await db.productSale.deleteMany({ where: { branchId } });
      await db.productSale.createMany({ data: body.map((i: any) => ({ ...i, branchId })) });
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
  await db.productSale.deleteMany({ where: branchId ? { branchId } : {} });
  return NextResponse.json({ success: true });
}
