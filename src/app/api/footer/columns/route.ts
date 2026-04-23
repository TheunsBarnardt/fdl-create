import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const CreateFooterColumn = z.object({
  title: z.string().min(1, 'Title is required'),
  items: z.array(
    z.object({
      label: z.string(),
      url: z.string().url(),
    })
  ),
});

export const POST = withApi('write:pages', async (req) => {
  const body = CreateFooterColumn.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  // Get or create footer
  let footer = await prisma.footer.findFirst();
  if (!footer) {
    footer = await prisma.footer.create({ data: {} });
  }

  // Get max order
  const maxOrder = await prisma.footerColumn.aggregate({
    where: { footerId: footer.id },
    _max: { order: true },
  });

  const created = await prisma.footerColumn.create({
    data: {
      footerId: footer.id,
      title: body.data.title,
      items: JSON.stringify(body.data.items),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json({
    id: created.id,
    title: created.title,
    items: body.data.items,
    order: created.order,
  }, { status: 201 });
});
