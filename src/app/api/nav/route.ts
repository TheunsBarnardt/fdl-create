import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

export const GET = withApi('read:pages', async () => {
  // Get or create navigation
  let nav = await prisma.navigation.findFirst({
    include: {
      items: {
        where: { parentId: null },
        orderBy: { order: 'asc' },
        include: {
          children: {
            orderBy: { order: 'asc' },
            include: {
              children: {
                orderBy: { order: 'asc' }
              }
            }
          }
        }
      }
    }
  });

  if (!nav) {
    nav = await prisma.navigation.create({
      data: {},
      include: {
        items: {
          where: { parentId: null },
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
              include: {
                children: {
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        }
      }
    });
  }

  return NextResponse.json({
    id: nav.id,
    items: nav.items,
    createdAt: nav.createdAt,
    updatedAt: nav.updatedAt
  });
});

export const POST = withApi('write:pages', async () => {
  // Idempotent: create if doesn't exist, return existing if it does
  let nav = await prisma.navigation.findFirst();

  if (!nav) {
    nav = await prisma.navigation.create({ data: {} });
  }

  return NextResponse.json({ id: nav.id }, { status: 201 });
});
