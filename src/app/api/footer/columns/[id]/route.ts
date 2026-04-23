import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const UpdateFooterColumn = z.object({
  title: z.string().min(1).optional(),
  items: z.array(
    z.object({
      label: z.string(),
      url: z.string().url(),
    })
  ).optional(),
});

export const PATCH = withApi('write:pages', async (req, { params }: { params: { id: string } }) => {
  const body = UpdateFooterColumn.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const column = await prisma.footerColumn.findUnique({
    where: { id: params.id },
  });

  if (!column) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  }

  const updated = await prisma.footerColumn.update({
    where: { id: params.id },
    data: {
      ...(body.data.title && { title: body.data.title }),
      ...(body.data.items && { items: JSON.stringify(body.data.items) }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    items: JSON.parse(updated.items),
    order: updated.order,
  });
});

export const DELETE = withApi('write:pages', async (req, { params }: { params: { id: string } }) => {
  const column = await prisma.footerColumn.findUnique({
    where: { id: params.id },
  });

  if (!column) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  }

  await prisma.footerColumn.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
});
