import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_BRANCH_SLUG, getBranchBySlug } from '@/lib/branches';

// ─── GET /api/supply-chain/summary?branchSlug=adcb ───
// Fetch aggregated supply chain summary for dashboard feeds

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchSlug = searchParams.get('branchSlug') || DEFAULT_BRANCH_SLUG;

    // Resolve branch
    const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
    if (!branch) {
      return NextResponse.json({ error: `Branch "${branchSlug}" not found` }, { status: 404 });
    }

    // Fetch all supply items for the branch
    const items = await db.supplyItem.findMany({
      where: { branchId: branch.id },
    });

    // Compute date bounds
    const now = new Date();
    const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twentyOneDaysAgoStr = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch all consumption records for this branch's items in the last 30 days
    const supplyItemIds = items.map(i => i.id);

    // Run queries in parallel
    const [consumptions30d, consumptions21d, recentOrders] = await Promise.all([
      // 30-day consumption for avg daily / turnover
      supplyItemIds.length > 0
        ? db.supplyConsumption.findMany({
            where: {
              supplyItemId: { in: supplyItemIds },
              date: { gte: thirtyDaysAgoStr },
            },
          })
        : [],
      // 21-day consumption for slow-moving detection
      supplyItemIds.length > 0
        ? db.supplyConsumption.findMany({
            where: {
              supplyItemId: { in: supplyItemIds },
              date: { gte: twentyOneDaysAgoStr },
            },
          })
        : [],
      // Last 5 orders
      db.supplyOrder.findMany({
        where: { branchId: branch.id },
        orderBy: { dateCreated: 'desc' },
        take: 5,
        include: { lineItems: true },
      }),
    ]);

    // Build consumption maps
    const consumptionByItemId30d = new Map<string, number>();
    for (const c of consumptions30d) {
      consumptionByItemId30d.set(c.supplyItemId, (consumptionByItemId30d.get(c.supplyItemId) || 0) + c.qtyUsedL);
    }

    const recentConsumptionItemIds = new Set(consumptions21d.map(c => c.supplyItemId));

    // ── Compute per-item metrics ──
    let totalStockValueAED = 0;
    let capitalIdle = 0;
    let criticalCount = 0;
    let lowCount = 0;
    let healthyCount = 0;
    let slowMovingCount = 0;
    let totalConsumption30d = 0;
    let totalAvgStock30d = 0;

    const itemCountByCategory: Record<string, number> = {};

    for (const item of items) {
      const totalConsumed30d = consumptionByItemId30d.get(item.id) || 0;
      const avgDailyConsumption = totalConsumed30d / 30;
      const daysRemaining = avgDailyConsumption > 0 ? item.currentQtyL / avgDailyConsumption : Infinity;
      const stockValueAED = item.currentQtyL * item.unitCostAED;

      totalStockValueAED += stockValueAED;
      totalConsumption30d += totalConsumed30d;

      // Average stock over 30 days (approximation: current stock + half of what was consumed)
      const avgStock = item.currentQtyL + (totalConsumed30d / 2);
      totalAvgStock30d += avgStock;

      // Category count
      const cat = item.category || 'Uncategorized';
      itemCountByCategory[cat] = (itemCountByCategory[cat] || 0) + 1;

      // Stock status
      let stockStatus: 'CRITICAL' | 'LOW' | 'HEALTHY';
      if (daysRemaining <= 5 || item.currentQtyL < (item.minThresholdL * 0.3)) {
        stockStatus = 'CRITICAL';
        criticalCount++;
      } else if (daysRemaining <= 14 || item.currentQtyL < item.minThresholdL) {
        stockStatus = 'LOW';
        lowCount++;
      } else {
        stockStatus = 'HEALTHY';
        healthyCount++;
      }

      // Capital idle: excess stock beyond 30-day buffer × unit cost
      const buffer30d = avgDailyConsumption * 30;
      if (item.currentQtyL > buffer30d) {
        const excessL = item.currentQtyL - buffer30d;
        capitalIdle += excessL * item.unitCostAED;
      }

      // Slow-moving detection
      if (!recentConsumptionItemIds.has(item.id)) {
        slowMovingCount++;
      }
    }

    // Average turnover rate = total consumption / avg stock over 30 days
    const avgTurnoverRate = totalAvgStock30d > 0
      ? Math.round((totalConsumption30d / totalAvgStock30d) * 1000) / 1000
      : 0;

    // Capital deployed = total stock in hand × landed cost (unit cost)
    const capitalDeployed = totalStockValueAED;

    return NextResponse.json({
      branch: { id: branch.id, name: branch.name, slug: branch.slug },
      totalStockValueAED: Math.round(totalStockValueAED * 100) / 100,
      capitalDeployed: Math.round(capitalDeployed * 100) / 100,
      capitalIdle: Math.round(capitalIdle * 100) / 100,
      itemCountByCategory,
      criticalCount,
      lowCount,
      healthyCount,
      slowMovingCount,
      avgTurnoverRate,
      totalConsumption30d: Math.round(totalConsumption30d * 1000) / 1000,
      itemCount: items.length,
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        orderId: o.orderId,
        branchName: o.branchName,
        dateCreated: o.dateCreated,
        deliveryRequested: o.deliveryRequested,
        generatedBy: o.generatedBy,
        orderTotalAED: o.orderTotalAED,
        status: o.status,
        notes: o.notes,
        lineItemCount: o.lineItems.length,
      })),
    });
  } catch (error: any) {
    console.error('[supply-chain/summary] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
