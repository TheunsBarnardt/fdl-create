import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const UpdateFooter = z.object({
  type: z.enum(['simple', 'columns']).optional(),
  columns: z.any().optional(),
});

export const GET = withApi('read:pages', async () => {
  // Get or create footer
  let footer = await prisma.footer.findFirst({
    include: {
      columns: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!footer) {
    footer = await prisma.footer.create({
      data: {
        type: 'simple',
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  return NextResponse.json({
    id: footer.id,
    type: footer.type,
    columns: footer.columns.map((c) => ({
      id: c.id,
      title: c.title,
      items: JSON.parse(c.items),
      order: c.order,
    })),
    createdAt: footer.createdAt,
    updatedAt: footer.updatedAt,
  });
});

export const PATCH = withApi('write:pages', async (req) => {
  const body = UpdateFooter.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  let footer = await prisma.footer.findFirst({
    include: {
      columns: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!footer) {
    footer = await prisma.footer.create({
      data: {},
      include: {
        columns: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  if (body.data.type) {
    footer = await prisma.footer.update({
      where: { id: footer.id },
      data: { type: body.data.type },
      include: {
        columns: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  return NextResponse.json({
    id: footer.id,
    type: footer.type,
    columns: (footer.columns || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      items: JSON.parse(c.items),
      order: c.order,
    })),
  });
});
