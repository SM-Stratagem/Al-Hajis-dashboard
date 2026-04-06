import { NextRequest, NextResponse } from 'next/server';
import { parseCSV, toNumber, toMonthNum, toYear } from '@/lib/csv-parser';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: 'No category specified' }, { status: 400 });
    }

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    let rowCount = 0;

    switch (category) {
      case 'monthly-sales': {
        await db.monthlySale.deleteMany({});
        for (const row of rows) {
          const month = toNumber(row.month || row.m);
          const year = toNumber(row.year || row.yr || row.y);
          if (!month || !year) continue;
          await db.monthlySale.create({
            data: {
              month, year,
              gross: toNumber(row.gross || row.total_gross),
              returns: toNumber(row.returns || row.return_amount),
              net: toNumber(row.net || row.net_revenue),
              cash: toNumber(row.cash || row.cash_sales),
              card: toNumber(row.card || row.card_sales),
            },
          });
          rowCount++;
        }
        break;
      }

      case 'capex': {
        await db.capexItem.deleteMany({});
        for (const row of rows) {
          const name = row.name || row.item || row.description || '';
          const amount = toNumber(row.amount || row.cost || row.value);
          const category_name = row.category || row.type || row.cat || 'Other';
          if (!name || !amount) continue;
          await db.capexItem.create({ data: { name, amount, category: category_name } });
          rowCount++;
        }
        break;
      }

      case 'overheads': {
        await db.overhead.deleteMany({});
        for (const row of rows) {
          const name = row.name || row.item || row.description || '';
          const amount = toNumber(row.amount || row.cost || row.value);
          if (!name || !amount) continue;
          await db.overhead.create({ data: { name, amount } });
          rowCount++;
        }
        break;
      }

      case 'products': {
        await db.productSale.deleteMany({});
        for (const row of rows) {
          const name = row.name || row.product || row.item || '';
          const unitCost = toNumber(row.unit_cost || row.cost);
          const sellingPrice = toNumber(row.selling_price || row.price);
          const quantitySold = toNumber(row.quantity || row.qty);
          const revenue = toNumber(row.revenue || row.total);
          const margin = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : null;
          if (!name) continue;
          await db.productSale.create({
            data: {
              name, sku: row.sku || null,
              category: row.category || row.type || '',
              unitCost, sellingPrice, quantitySold, revenue, margin,
            },
          });
          rowCount++;
        }
        break;
      }

      case 'transactions': {
        await db.transactionSummary.deleteMany({});
        for (const row of rows) {
          const month = toNumber(row.month || row.m);
          const year = toNumber(row.year || row.yr || row.y);
          const receiptCount = toNumber(row.receipts || row.transactions);
          const totalRevenue = toNumber(row.revenue || row.total);
          const avgTicketSize = receiptCount > 0 ? totalRevenue / receiptCount : null;
          if (!month || !year || !receiptCount) continue;
          const ms = await db.monthlySale.findFirst({ where: { month, year } });
          await db.transactionSummary.create({
            data: { month, year, receiptCount, totalRevenue, avgTicketSize, monthlySaleId: ms?.id || '' },
          });
          rowCount++;
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown category: ${category}` }, { status: 400 });
    }

    await db.dataUpload.create({
      data: {
        category,
        fileName: file.name,
        rowCount,
        status: rowCount > 0 ? 'success' : 'error',
        error: rowCount === 0 ? 'No valid rows found' : null,
      },
    });

    return NextResponse.json({
      success: rowCount > 0,
      category,
      fileName: file.name,
      rowCount,
      columns: headers,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
