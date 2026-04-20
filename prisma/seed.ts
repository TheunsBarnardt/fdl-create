import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@fdl.local' },
    create: { email: 'admin@fdl.local', name: 'Admin', role: 'admin', passwordHash },
    update: {}
  });

  const customersSchema = {
    fields: [
      { name: 'name', type: 'text', label: 'Full name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'phone', type: 'text', label: 'Phone' },
      { name: 'status', type: 'select', label: 'Status', options: ['lead', 'active', 'churned'] },
      { name: 'notes', type: 'textarea', label: 'Notes' }
    ]
  };

  const customers = await prisma.collection.upsert({
    where: { name: 'customers' },
    create: {
      name: 'customers',
      label: 'Customers',
      description: 'Core customer records. AI-disabled by default (POPIA).',
      schema: JSON.stringify(customersSchema)
    },
    update: { schema: JSON.stringify(customersSchema) }
  });

  const existing = await prisma.record.count({ where: { collectionId: customers.id } });
  if (existing === 0) {
    const rows = [
      { name: 'Thandi Mokoena', email: 'thandi@example.co.za', phone: '+27 82 000 0001', status: 'active', notes: 'Pilot customer' },
      { name: 'Johan van der Merwe', email: 'johan@example.co.za', phone: '+27 82 000 0002', status: 'lead', notes: '' },
      { name: 'Aisha Patel', email: 'aisha@example.co.za', phone: '+27 82 000 0003', status: 'active', notes: 'Expanding next quarter' }
    ];
    for (const r of rows) {
      await prisma.record.create({ data: { collectionId: customers.id, data: JSON.stringify(r) } });
    }
  }

  console.log('Seeded: admin@fdl.local / admin123, customers collection with 3 records.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
