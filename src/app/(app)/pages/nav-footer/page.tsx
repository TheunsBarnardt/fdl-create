import { prisma } from '@/lib/db';
import { ScreenHeader } from '@/components/screen-header';
import { NavFooterBuilder } from '@/components/nav-footer/nav-footer-builder';

export default async function NavFooterPage() {
  const [navigation, footer, pages] = await Promise.all([
    prisma.navigation.findFirst({
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
    }).then(async nav => {
      if (!nav) {
        return await prisma.navigation.create({
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
      return nav;
    }),
    prisma.footer.findFirst({
      include: {
        columns: {
          orderBy: { order: 'asc' }
        }
      }
    }).then(async footer => {
      if (!footer) {
        return await prisma.footer.create({
          data: { type: 'simple' },
          include: {
            columns: {
              orderBy: { order: 'asc' }
            }
          }
        });
      }
      return footer;
    }),
    prisma.page.findMany({
      select: { id: true, slug: true, title: true },
      orderBy: { title: 'asc' }
    })
  ]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ScreenHeader title="Navigation & Footer" />
      <main className="flex-1 overflow-auto">
        <NavFooterBuilder
          navigation={navigation}
          footer={footer}
          pages={pages}
        />
      </main>
    </div>
  );
}
