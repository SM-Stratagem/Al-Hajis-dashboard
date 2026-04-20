import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/connectors ─────────────────────────
// List all connectors with optional filter

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const enabled = searchParams.get('enabled');
    const branchSlug = searchParams.get('branchSlug');

    const where: any = {};
    if (type) where.type = type;
    if (enabled === 'true') where.enabled = true;
    if (enabled === 'false') where.enabled = false;
    if (branchSlug) {
      const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
      if (branch) where.branchId = branch.id;
    }

    const connectors = await db.connector.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, slug: true } },
        _count: { select: { syncLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ connectors });
  } catch (error: any) {
    console.error('[connectors] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST /api/connectors ────────────────────────
// Create a new connector

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, system, branchSlug, config, fieldMap } = body;

    if (!name || !type || !system) {
      return NextResponse.json(
        { error: 'name, type, and system are required' },
        { status: 400 }
      );
    }

    // Resolve branch
    let branchId: string | null = null;
    if (branchSlug) {
      const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
      if (!branch) {
        return NextResponse.json({ error: `Branch "${branchSlug}" not found` }, { status: 404 });
      }
      branchId = branch.id;
    }

    const connector = await db.connector.create({
      data: {
        name,
        type,
        system,
        branchId,
        enabled: false, // Start disabled — user must configure and enable
        config: JSON.stringify(config || {}),
        fieldMap: JSON.stringify(fieldMap || {}),
      },
    });

    return NextResponse.json({
      connector,
      message: `Connector "${name}" created. Configure it and enable when ready.`,
    });
  } catch (error: any) {
    console.error('[connectors] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
