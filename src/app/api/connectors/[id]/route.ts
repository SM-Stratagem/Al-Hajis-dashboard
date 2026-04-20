import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/connectors/[id] ───────────────────
// Get single connector with recent sync logs

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connector = await db.connector.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, slug: true } },
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!connector) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    return NextResponse.json({
      connector: {
        ...connector,
        config: JSON.parse(connector.config || '{}'),
        fieldMap: JSON.parse(connector.fieldMap || '{}'),
      },
    });
  } catch (error: any) {
    console.error('[connectors/[id]] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PUT /api/connectors/[id] ───────────────────
// Update connector config, enable/disable, etc.

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, enabled, config, fieldMap, branchSlug } = body;

    const existing = await db.connector.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (config !== undefined) updateData.config = JSON.stringify(config);
    if (fieldMap !== undefined) updateData.fieldMap = JSON.stringify(fieldMap);
    if (branchSlug !== undefined) {
      if (branchSlug) {
        const branch = await db.branch.findUnique({ where: { slug: branchSlug } });
        if (branch) updateData.branchId = branch.id;
        else updateData.branchId = null;
      } else {
        updateData.branchId = null;
      }
    }

    const connector = await db.connector.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      connector,
      message: enabled !== undefined
        ? `Connector ${enabled ? 'enabled' : 'disabled'}`
        : 'Connector updated',
    });
  } catch (error: any) {
    console.error('[connectors/[id]] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE /api/connectors/[id] ────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.connector.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    // Delete sync logs first (cascade)
    await db.syncLog.deleteMany({ where: { connectorId: id } });
    await db.connector.delete({ where: { id } });

    return NextResponse.json({ message: `Connector "${existing.name}" deleted` });
  } catch (error: any) {
    console.error('[connectors/[id]] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
