import { PrismaClient, PackageStatus, UserRole, DeliveryEventSource, DeliveryEventType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@delivery.app' },
    update: {},
    create: {
      email: 'admin@delivery.app',
      name: 'Admin',
      passwordHash: 'adminhash',
      role: UserRole.admin,
    },
  });
  const manager = await prisma.user.upsert({
    where: { email: 'manager@delivery.app' },
    update: {},
    create: {
      email: 'manager@delivery.app',
      name: 'Manager',
      passwordHash: 'managerhash',
      role: UserRole.manager,
    },
  });
  const driver1 = await prisma.user.upsert({
    where: { email: 'driver1@delivery.app' },
    update: {},
    create: {
      email: 'driver1@delivery.app',
      name: 'Driver One',
      passwordHash: 'driverhash1',
      role: UserRole.driver,
    },
  });
  const driver2 = await prisma.user.upsert({
    where: { email: 'driver2@delivery.app' },
    update: {},
    create: {
      email: 'driver2@delivery.app',
      name: 'Driver Two',
      passwordHash: 'driverhash2',
      role: UserRole.driver,
    },
  });

  // Packages
  const now = new Date();
  const packages = await prisma.$transaction([
    prisma.package.upsert({
      where: { barcode: 'PKG-001' },
      update: {},
      create: {
        barcode: 'PKG-001',
        status: PackageStatus.pending,
        recipient: { name: 'Alice', phone: '111-111', email: 'alice@example.com', address: '1 Main St' },
        driverId: driver1.id,
        metadata: { notes: 'Leave at door' },
      },
    }),
    prisma.package.upsert({
      where: { barcode: 'PKG-002' },
      update: {},
      create: {
        barcode: 'PKG-002',
        status: PackageStatus.in_transit,
        locationLat: 37.7749,
        locationLng: -122.4194,
        recipient: { name: 'Bob', phone: '222-222', email: 'bob@example.com', address: '2 Pine St' },
        driverId: driver2.id,
      },
    }),
    prisma.package.upsert({
      where: { barcode: 'PKG-003' },
      update: {},
      create: {
        barcode: 'PKG-003',
        status: PackageStatus.delivered,
        deliveredAt: now,
        recipient: { name: 'Carol', phone: '333-333', email: 'carol@example.com', address: '3 Oak Ave' },
        driverId: driver1.id,
      },
    }),
  ]);

  // Audit & events
  for (const pkg of packages) {
    await prisma.auditEntry.create({
      data: {
        action: 'seed_create_package',
        userId: admin.id,
        packageId: pkg.id,
        deviceInfo: { os: 'seed' },
        newState: { status: pkg.status },
      },
    });
    await prisma.deliveryEvent.create({
      data: {
        type: DeliveryEventType.status_updated,
        source: DeliveryEventSource.system,
        packageId: pkg.id,
        payload: { status: pkg.status },
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
