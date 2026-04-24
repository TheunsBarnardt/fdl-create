import { prisma } from '@/lib/db';
import { ScreenHeader } from '@/components/screen-header';
import { NavFooterBuilder } from '@/components/nav-footer/nav-footer-builder';
import { getActiveProject } from '@/lib/active-project';

export default async function NavFooterPage() {
  const project = await getActiveProject();
  const [navigation, footer, pages] = await Promise.all([
    prisma.navigation.findFirst({
      where: { projectId: project.id },
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
          data: { projectId: project.id },
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
      where: { projectId: project.id },
      include: {
        columns: {
          orderBy: { order: 'asc' }
        }
      }
    }).then(async footer => {
      if (!footer) {
        return await prisma.footer.create({
          data: { type: 'simple', projectId: project.id },
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
      where: { projectId: project.id },
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
