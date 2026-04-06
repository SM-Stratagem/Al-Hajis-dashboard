import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV, toNumber } from '@/lib/csv-parser';

export async function GET() {
  const data = await db.pnlPeriod.findMany({ include: { expenses: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.csv) {
      // CSV with expense lines
      const { rows } = parseCSV(body.csv);
      const expenses = [];

      for (const row of rows) {
        const name = row.name || row.expense || row.item || '';
        const amount = toNumber(row.amount || row.cost || row.value);
        if (name && amount) {
          expenses.push({ name, amount });
        }
      }

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      const pnl = await db.pnlPeriod.create({
        data: {
          period: body.period || 'Uploaded P&L',
          revenue: toNumber(String(body.revenue || body.totalRevenue)),
          cogsGoods: toNumber(String(body.cogsGoods || body.cogs_goods || 0)),
          cogsAccessories: toNumber(String(body.cogsAccessories || body.cogs_accessories || 0)),
          totalCogs: toNumber(String(body.totalCogs || body.total_cogs || 0)),
          grossProfit: toNumber(String(body.grossProfit || body.gross_profit || 0)),
          grossMargin: toNumber(String(body.grossMargin || body.gross_margin || 0)),
          totalExpenses,
          netProfitLoss: toNumber(String(body.netProfitLoss || body.net_profit || 0)),
          expenses: { create: expenses },
        },
      });

      await db.dataUpload.create({
        data: { category: 'pnl', fileName: body.fileName || 'upload.csv', rowCount: expenses.length, status: 'success' },
      });

      return NextResponse.json({ success: true, pnlId: pnl.id, expenseCount: expenses.length });
    }

    // JSON mode with embedded expenses
    if (body.period) {
      const expenses = body.expenses || [];
      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      const pnl = await db.pnlPeriod.create({
        data: {
          period: body.period,
          revenue: body.revenue || 0,
          cogsGoods: body.cogsGoods || 0,
          cogsAccessories: body.cogsAccessories || 0,
          totalCogs: body.totalCogs || 0,
          grossProfit: body.grossProfit || 0,
          grossMargin: body.grossMargin || 0,
          totalExpenses: body.totalExpenses || totalExpenses,
          netProfitLoss: body.netProfitLoss || 0,
          expenses: { create: expenses },
        },
      });

      return NextResponse.json({ success: true, pnlId: pnl.id });
    }

    return NextResponse.json({ error: 'Provide period data or csv' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  await db.pnlExpense.deleteMany({});
  await db.pnlPeriod.deleteMany({});
  return NextResponse.json({ success: true });
}
