import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const CreateNavItem = z.object({
  label: z.string().min(1, 'Label is required'),
  navType: z.enum(['flat', 'dropdown', 'mega']).default('flat'),
  pageId: z.string().nullable().optional(),
  customUrl: z.string().url().nullable().optional(),
  openInNewTab: z.boolean().default(false),
  parentId: z.string().nullable().optional(),
  columns: z.number().int().min(2).max(4).nullable().optional(),
  navigationId: z.string(),
});

export const POST = withApi('write:pages', async (req) => {
  const body = CreateNavItem.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  // Validate that either pageId or customUrl is provided (not both)
  if (!body.data.pageId && !body.data.customUrl) {
    return NextResponse.json(
      { error: 'Either pageId or customUrl must be provided' },
      { status: 400 }
    );
  }

  // Validate that navType is only set for root items (no parent)
  if (body.data.parentId && body.data.navType !== 'flat') {
    return NextResponse.json(
      { error: 'navType can only be set for root items' },
      { status: 400 }
    );
  }

  // Get the max order for this level
  const maxOrder = await prisma.navItem.aggregate({
    where: {
      navigationId: body.data.navigationId,
      parentId: body.data.parentId || null,
    },
    _max: { order: true },
  });

  const created = await prisma.navItem.create({
    data: {
      label: body.data.label,
      navType: body.data.navType,
      pageId: body.data.pageId,
      customUrl: body.data.customUrl,
      openInNewTab: body.data.openInNewTab,
      parentId: body.data.parentId,
      columns: body.data.columns,
      navigationId: body.data.navigationId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: {
      children: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return NextResponse.json(created, { status: 201 });
});
