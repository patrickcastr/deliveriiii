import { PrismaClient, PackageStatus } from '@prisma/client';

async function run() {
  const prisma = new PrismaClient();
  try {
  const pkg = await prisma.package.create({
      data: {
        barcode: `SMOKE-${Date.now()}`,
    status: PackageStatus.pending,
        recipient: { name: 'Smoke', phone: '000', email: 'smoke@test', address: 'test' },
      },
    });
    const read = await prisma.package.findUnique({ where: { id: pkg.id } });
    console.log({ created: pkg.barcode, read: read?.barcode });
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
