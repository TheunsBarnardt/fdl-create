import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultProject = await prisma.project.upsert({
    where: { slug: 'default' },
    create: { slug: 'default', name: 'Default', description: 'Default project (auto-created on multi-project migration).' },
    update: {}
  });
  const projectId = defaultProject.id;
  console.log(`Default project: ${projectId}`);

  const [
    collections, pages, themes, customBlocks, variableCollections,
    assetCategories, assets, documentCategories, documents,
    navigations, footers, procedureGroups
  ] = await Promise.all([
    prisma.collection.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.page.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.theme.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.customBlock.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.variableCollection.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.assetCategory.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.asset.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.documentCategory.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.document.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.navigation.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.footer.updateMany({ where: { projectId: null }, data: { projectId } }),
    prisma.procedureGroup.updateMany({ where: { projectId: null }, data: { projectId } })
  ]);

  console.log({
    collections: collections.count, pages: pages.count, themes: themes.count,
    customBlocks: customBlocks.count, variableCollections: variableCollections.count,
    assetCategories: assetCategories.count, assets: assets.count,
    documentCategories: documentCategories.count, documents: documents.count,
    navigations: navigations.count, footers: footers.count, procedureGroups: procedureGroups.count
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
