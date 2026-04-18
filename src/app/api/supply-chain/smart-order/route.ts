import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_BRANCH_SLUG, getBranchBySlug } from '@/lib/branches';

// ─── POST /api/supply-chain/smart-order ───
// Generate a smart purchase order for a branch

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchSlug = body.branchSlug || DEFAULT_BRANCH_SLUG;
    const includeHealthy = body.includeHealthy === true;
    const safetyFactor = typeof body.safetyFactor === 'number' ? body.safetyFactor : 1.3;

    // Resolve branch
    const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
    if (!branch) {
      return NextResponse.json({ error: `Branch "${branchSlug}" not found` }, { status: 404 });
    }

    // Step 1: Get all supply items for the branch
    const items = await db.supplyItem.findMany({
      where: { branchId: branch.id },
    });

    if (items.length === 0) {
      return NextResponse.json({
        error: 'No supply items found for this branch',
        branch: { id: branch.id, name: branch.name, slug: branch.slug },
      }, { status: 404 });
    }

    // Compute date bound for 30-day consumption lookback
    const now = new Date();
    const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch all consumption records for this branch's items in the last 30 days
    const supplyItemIds = items.map(i => i.id);
    const consumptions = await db.supplyConsumption.findMany({
      where: {
        supplyItemId: { in: supplyItemIds },
        date: { gte: thirtyDaysAgoStr },
      },
    });

    // Build consumption totals per item
    const consumptionByItemId = new Map<string, number>();
    for (const c of consumptions) {
      consumptionByItemId.set(c.supplyItemId, (consumptionByItemId.get(c.supplyItemId) || 0) + c.qtyUsedL);
    }

    // Step 2 & 3: Calculate daysRemaining and flag each item
    interface OrderCandidate {
      supplyItemId: string;
      itemId: string;
      itemName: string;
      category: string;
      currentSohL: number;
      avgDailyConsumption: number;
      daysRemaining: number;
      stockStatus: 'CRITICAL' | 'LOW' | 'HEALTHY';
      orderQtyL: number;
      unitCostAED: number;
      lineTotalAED: number;
      supplierLeadDays: number;
      urgent: boolean;
    }

    const candidates: OrderCandidate[] = [];

    for (const item of items) {
      const totalConsumed30d = consumptionByItemId.get(item.id) || 0;
      const avgDailyConsumption = totalConsumed30d / 30;
      const daysRemaining = avgDailyConsumption > 0 ? item.currentQtyL / avgDailyConsumption : Infinity;

      // Determine stock status (same logic as inventory)
      let stockStatus: 'CRITICAL' | 'LOW' | 'HEALTHY';
      if (daysRemaining <= 5 || item.currentQtyL < (item.minThresholdL * 0.3)) {
        stockStatus = 'CRITICAL';
      } else if (daysRemaining <= 14 || item.currentQtyL < item.minThresholdL) {
        stockStatus = 'LOW';
      } else {
        stockStatus = 'HEALTHY';
      }

      // Skip HEALTHY items unless includeHealthy is true
      if (stockStatus === 'HEALTHY' && !includeHealthy) continue;

      // Step 4: Calculate order quantity
      // orderQty = (avgDaily × 30 × safetyFactor) - currentSoh
      const calculatedOrder = (avgDailyConsumption * 30 * safetyFactor) - item.currentQtyL;

      // Skip if ≤ 0 (we have enough stock)
      if (calculatedOrder <= 0) continue;

      // Step 5: Cap at 45-day max stock
      // maxOrder = (avgDaily × 45) - currentSoh
      const maxOrder = (avgDailyConsumption * 45) - item.currentQtyL;
      const cappedOrder = Math.min(calculatedOrder, maxOrder);

      // Round up to nearest 0.5L
      const orderQtyL = Math.ceil(cappedOrder * 2) / 2;

      if (orderQtyL <= 0) continue;

      // Step 6: Check supplier lead time vs daysRemaining for urgency
      const supplierLeadDays = 3; // default; could be enhanced with supplier data
      const urgent = daysRemaining <= supplierLeadDays;

      const lineTotalAED = orderQtyL * item.unitCostAED;

      candidates.push({
        supplyItemId: item.id,
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        currentSohL: item.currentQtyL,
        avgDailyConsumption: Math.round(avgDailyConsumption * 1000) / 1000,
        daysRemaining: daysRemaining === Infinity ? 999 : Math.round(daysRemaining * 10) / 10,
        stockStatus,
        orderQtyL,
        unitCostAED: item.unitCostAED,
        lineTotalAED: Math.round(lineTotalAED * 100) / 100,
        supplierLeadDays,
        urgent,
      });
    }

    // Sort by priority: CRITICAL first, then LOW, then HEALTHY
    const priorityOrder = { CRITICAL: 0, LOW: 1, HEALTHY: 2 };
    candidates.sort((a, b) => {
      const pDiff = priorityOrder[a.stockStatus] - priorityOrder[b.stockStatus];
      if (pDiff !== 0) return pDiff;
      // Within same priority, sort by urgency then days remaining
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return a.daysRemaining - b.daysRemaining;
    });

    // Generate order ID (ORD-XXXX sequential format)
    // Find the highest existing order number for this branch
    const existingOrders = await db.supplyOrder.findMany({
      where: { branchId: branch.id },
      select: { orderId: true },
      orderBy: { orderId: 'desc' },
    });

    let nextNumber = 1;
    if (existingOrders.length > 0) {
      const lastOrderId = existingOrders[0].orderId;
      const match = lastOrderId.match(/ORD-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const orderId = `ORD-${String(nextNumber).padStart(4, '0')}`;

    // Calculate totals
    const totalAED = candidates.reduce((sum, c) => sum + c.lineTotalAED, 0);
    const criticalCount = candidates.filter(c => c.stockStatus === 'CRITICAL').length;
    const lowCount = candidates.filter(c => c.stockStatus === 'LOW').length;
    const healthyCount = candidates.filter(c => c.stockStatus === 'HEALTHY').length;

    // Build line items in the format for SupplyOrderLine
    const lineItems = candidates.map(c => ({
      itemId: c.itemId,
      itemName: c.itemName,
      category: c.category,
      currentSohL: c.currentSohL,
      orderQtyL: c.orderQtyL,
      unitCostAED: c.unitCostAED,
      lineTotalAED: c.lineTotalAED,
      priority: c.stockStatus,
      supplierLeadDays: c.supplierLeadDays,
      urgent: c.urgent,
      supplyItemId: c.supplyItemId,
    }));

    return NextResponse.json({
      order: {
        orderId,
        branchId: branch.id,
        branchName: branch.name,
        dateCreated: new Date().toISOString(),
        generatedBy: 'AI',
        orderTotalAED: Math.round(totalAED * 100) / 100,
        status: 'draft',
        lineItems,
      },
      summary: {
        totalAED: Math.round(totalAED * 100) / 100,
        totalLineItems: candidates.length,
        criticalCount,
        lowCount,
        healthyCount,
        urgentCount: candidates.filter(c => c.urgent).length,
      },
      parameters: {
        branchSlug,
        safetyFactor,
        includeHealthy,
      },
    });
  } catch (error: any) {
    console.error('[supply-chain/smart-order] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
