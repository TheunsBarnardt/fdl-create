import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const UpdateNavItem = z.object({
  label: z.string().min(1).optional(),
  navType: z.enum(['flat', 'dropdown', 'mega']).optional(),
  pageId: z.string().nullable().optional(),
  customUrl: z.string().url().nullable().optional(),
  openInNewTab: z.boolean().optional(),
  columns: z.number().int().min(2).max(4).nullable().optional(),
});

export const PATCH = withApi('write:pages', async (req, { params }: { params: { id: string } }) => {
  const body = UpdateNavItem.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  // Get current item to check if it's a root item
  const current = await prisma.navItem.findUnique({
    where: { id: params.id },
  });

  if (!current) {
    return NextResponse.json({ error: 'Nav item not found' }, { status: 404 });
  }

  // Validate that navType is only set for root items
  if (body.data.navType && current.parentId) {
    return NextResponse.json(
      { error: 'navType can only be set for root items' },
      { status: 400 }
    );
  }

  // Validate that either pageId or customUrl is provided if updating links
  if (
    (body.data.pageId !== undefined || body.data.customUrl !== undefined) &&
    !body.data.pageId &&
    !body.data.customUrl
  ) {
    return NextResponse.json(
      { error: 'Either pageId or customUrl must be provided' },
      { status: 400 }
    );
  }

  const updated = await prisma.navItem.update({
    where: { id: params.id },
    data: {
      ...(body.data.label && { label: body.data.label }),
      ...(body.data.navType && { navType: body.data.navType }),
      ...(body.data.pageId !== undefined && { pageId: body.data.pageId }),
      ...(body.data.customUrl !== undefined && { customUrl: body.data.customUrl }),
      ...(body.data.openInNewTab !== undefined && { openInNewTab: body.data.openInNewTab }),
      ...(body.data.columns !== undefined && { columns: body.data.columns }),
    },
    include: {
      children: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return NextResponse.json(updated);
});

export const DELETE = withApi('write:pages', async (req, { params }: { params: { id: string } }) => {
  const item = await prisma.navItem.findUnique({
    where: { id: params.id },
  });

  if (!item) {
    return NextResponse.json({ error: 'Nav item not found' }, { status: 404 });
  }

  // Delete item (cascade deletes children)
  await prisma.navItem.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
});
