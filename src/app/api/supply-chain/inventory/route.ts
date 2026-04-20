import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_BRANCH_SLUG, getBranchBySlug } from '@/lib/branches';

// ─── GET /api/supply-chain/inventory?branchSlug=adcb ───
// Fetch inventory for a branch with computed stock health fields

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
      orderBy: { category: 'asc' },
    });

    // Compute date bounds for consumption queries
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const twentyOneDaysAgoStr = twentyOneDaysAgo.toISOString().split('T')[0];

    // Fetch all consumption records for this branch's items in the last 30 days
    const supplyItemIds = items.map(i => i.id);
    const consumptions = supplyItemIds.length > 0
      ? await db.supplyConsumption.findMany({
          where: {
            supplyItemId: { in: supplyItemIds },
            date: { gte: thirtyDaysAgoStr },
          },
        })
      : [];

    // Build consumption totals per item
    const consumptionByItemId = new Map<string, number>();
    for (const c of consumptions) {
      consumptionByItemId.set(c.supplyItemId, (consumptionByItemId.get(c.supplyItemId) || 0) + c.qtyUsedL);
    }

    // Fetch all consumption records in last 21 days for slow-moving detection
    const recentConsumptions = supplyItemIds.length > 0
      ? await db.supplyConsumption.findMany({
          where: {
            supplyItemId: { in: supplyItemIds },
            date: { gte: twentyOneDaysAgoStr },
          },
        })
      : [];

    const recentConsumptionItemIds = new Set(recentConsumptions.map(c => c.supplyItemId));

    // Compute enriched inventory items
    let totalStockValueAED = 0;
    const slowMovingItems: any[] = [];

    const enrichedItems = items.map(item => {
      const totalConsumed30d = consumptionByItemId.get(item.id) || 0;
      const avgDailyConsumption = totalConsumed30d / 30;
      const daysRemaining = avgDailyConsumption > 0 ? item.currentQtyL / avgDailyConsumption : Infinity;
      const stockValueAED = item.currentQtyL * item.unitCostAED;

      totalStockValueAED += stockValueAED;

      // Determine stock status
      let stockStatus: 'CRITICAL' | 'LOW' | 'HEALTHY';
      if (daysRemaining <= 5 || item.currentQtyL < (item.minThresholdL * 0.3)) {
        stockStatus = 'CRITICAL';
      } else if (daysRemaining <= 14 || item.currentQtyL < item.minThresholdL) {
        stockStatus = 'LOW';
      } else {
        stockStatus = 'HEALTHY';
      }

      // Check slow-moving (no consumption in last 21 days)
      const isSlowMoving = !recentConsumptionItemIds.has(item.id);
      if (isSlowMoving) {
        slowMovingItems.push({
          id: item.id,
          itemId: item.itemId,
          itemName: item.itemName,
          category: item.category,
          currentQtyL: item.currentQtyL,
          stockValueAED: Math.round(stockValueAED * 100) / 100,
          lastSoldDate: item.lastSoldDate,
        });
      }

      return {
        id: item.id,
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        currentQtyL: item.currentQtyL,
        minThresholdL: item.minThresholdL,
        unitCostAED: item.unitCostAED,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        lastUpdated: item.lastUpdated,
        lastSoldDate: item.lastSoldDate,
        avgDailyConsumption: Math.round(avgDailyConsumption * 1000) / 1000,
        daysRemaining: daysRemaining === Infinity ? null : Math.round(daysRemaining * 10) / 10,
        stockStatus,
        stockValueAED: Math.round(stockValueAED * 100) / 100,
        totalConsumed30d: Math.round(totalConsumed30d * 1000) / 1000,
        slowMoving: isSlowMoving,
      };
    });

    // Sort: CRITICAL first, then LOW, then HEALTHY
    const priorityOrder = { CRITICAL: 0, LOW: 1, HEALTHY: 2 };
    enrichedItems.sort((a, b) => priorityOrder[a.stockStatus] - priorityOrder[b.stockStatus]);

    return NextResponse.json({
      branch: { id: branch.id, name: branch.name, slug: branch.slug },
      items: enrichedItems,
      totalStockValueAED: Math.round(totalStockValueAED * 100) / 100,
      slowMovingItems,
      slowMovingCount: slowMovingItems.length,
      itemCount: enrichedItems.length,
      criticalCount: enrichedItems.filter(i => i.stockStatus === 'CRITICAL').length,
      lowCount: enrichedItems.filter(i => i.stockStatus === 'LOW').length,
      healthyCount: enrichedItems.filter(i => i.stockStatus === 'HEALTHY').length,
    });
  } catch (error: any) {
    console.error('[supply-chain/inventory] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
