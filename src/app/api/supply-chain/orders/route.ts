import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_BRANCH_SLUG, getBranchBySlug } from '@/lib/branches';

// ─── GET /api/supply-chain/orders?branchSlug=adcb&status=draft&limit=20 ───
// Fetch order history for a branch

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchSlug = searchParams.get('branchSlug') || DEFAULT_BRANCH_SLUG;
    const status = searchParams.get('status') || null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Resolve branch
    const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
    if (!branch) {
      return NextResponse.json({ error: `Branch "${branchSlug}" not found` }, { status: 404 });
    }

    // Build where clause
    const where: any = { branchId: branch.id };
    if (status) {
      where.status = status;
    }

    // Fetch orders with line items
    const orders = await db.supplyOrder.findMany({
      where,
      include: {
        lineItems: true,
      },
      orderBy: { dateCreated: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      branch: { id: branch.id, name: branch.name, slug: branch.slug },
      orders,
      count: orders.length,
    });
  } catch (error: any) {
    console.error('[supply-chain/orders] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST /api/supply-chain/orders ───
// Save a generated order to the database

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branchSlug, order } = body;

    if (!branchSlug || !order) {
      return NextResponse.json({ error: 'branchSlug and order are required' }, { status: 400 });
    }

    if (!order.orderId || !order.lineItems || !Array.isArray(order.lineItems)) {
      return NextResponse.json({ error: 'order.orderId and order.lineItems are required' }, { status: 400 });
    }

    // Resolve branch
    const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
    if (!branch) {
      return NextResponse.json({ error: `Branch "${branchSlug}" not found` }, { status: 404 });
    }

    // Check if orderId already exists
    const existingOrder = await db.supplyOrder.findUnique({
      where: { orderId: order.orderId },
    });
    if (existingOrder) {
      return NextResponse.json({ error: `Order "${order.orderId}" already exists` }, { status: 409 });
    }

    // Calculate order total from line items
    const orderTotalAED = order.lineItems.reduce((sum: number, line: any) => {
      return sum + (line.orderQtyL * line.unitCostAED);
    }, 0);

    // Create the order with its line items in a transaction
    const createdOrder = await db.supplyOrder.create({
      data: {
        orderId: order.orderId,
        branchId: branch.id,
        branchName: branch.name,
        deliveryRequested: order.deliveryRequested || null,
        generatedBy: order.generatedBy || 'AI',
        orderTotalAED: Math.round(orderTotalAED * 100) / 100,
        status: order.status || 'draft',
        notes: order.notes || null,
        lineItems: {
          create: order.lineItems.map((line: any) => ({
            itemId: line.itemId,
            itemName: line.itemName,
            category: line.category,
            currentSohL: line.currentSohL || 0,
            orderQtyL: line.orderQtyL,
            unitCostAED: line.unitCostAED,
            lineTotalAED: Math.round((line.orderQtyL * line.unitCostAED) * 100) / 100,
            priority: line.priority || 'LOW',
            supplierLeadDays: line.supplierLeadDays || 3,
            urgent: line.urgent || false,
            supplyItemId: line.supplyItemId || null,
          })),
        },
      },
      include: {
        lineItems: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: createdOrder,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[supply-chain/orders] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
