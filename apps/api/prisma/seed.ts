import { PrismaClient, PackageStatus, UserRole, DeliveryEventSource, DeliveryEventType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = async (pwd: string) => bcrypt.hash(pwd, 10);
  const ADMIN_PWD = process.env.SEED_ADMIN_PASSWORD || 'Admin!2345';
  const MANAGER_PWD = process.env.SEED_MANAGER_PASSWORD || 'Manager!2345';
  const DRIVER1_PWD = process.env.SEED_DRIVER1_PASSWORD || 'Driver1!2345';
  const DRIVER2_PWD = process.env.SEED_DRIVER2_PASSWORD || 'Driver2!2345';
  // Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@delivery.app' },
    update: {},
    create: {
      email: 'admin@delivery.app',
      name: 'Admin',
      passwordHash: await hash(ADMIN_PWD),
      role: UserRole.admin,
    },
  });
  const manager = await prisma.user.upsert({
    where: { email: 'manager@delivery.app' },
    update: {},
    create: {
      email: 'manager@delivery.app',
      name: 'Manager',
      passwordHash: await hash(MANAGER_PWD),
      role: UserRole.manager,
    },
  });
  const driver1 = await prisma.user.upsert({
    where: { email: 'driver1@delivery.app' },
    update: {},
    create: {
      email: 'driver1@delivery.app',
      name: 'Driver One',
      passwordHash: await hash(DRIVER1_PWD),
      role: UserRole.driver,
    },
  });
  const driver2 = await prisma.user.upsert({
    where: { email: 'driver2@delivery.app' },
    update: {},
    create: {
      email: 'driver2@delivery.app',
      name: 'Driver Two',
      passwordHash: await hash(DRIVER2_PWD),
      role: UserRole.driver,
    },
  });

  // Item Template: Standard Intake (published)
  const db: any = prisma as any;
  const standardIntake = await db.packageItemTemplate.upsert({
    where: { name: 'Standard Intake' },
    update: { status: 'published' },
    create: {
      name: 'Standard Intake',
      description: 'Default package intake form',
      status: 'published',
      createdById: admin.id,
      schema: {
        version: 1,
        fields: [
          { id: 'serviceLevel', type: 'select', label: 'Service level', required: true, options: [
            { value: 'standard', label: 'Standard' },
            { value: 'express', label: 'Express' },
            { value: 'overnight', label: 'Overnight' },
          ]},
          { id: 'fragile', type: 'checkbox', label: 'Fragile' },
          { id: 'instructions', type: 'textarea', label: 'Delivery instructions', maxLength: 500 },
          { id: 'maxWeightKg', type: 'number', label: 'Max Weight (kg)', min: 0, max: 100 },
          { id: 'photos', type: 'photo-count', label: 'Photos required', min: 1 },
          { id: 'signature', type: 'signature-toggle', label: 'Signature required', required: true },
        ],
      },
    },
  } as any);

  // Packages
  const now = new Date();
  const packages = await prisma.$transaction([
    prisma.package.upsert({
      where: { barcode: 'PKG-001' },
      update: {},
      create: {
        barcode: 'PKG-001',
        status: PackageStatus.pending,
  recipientName: 'Alice',
  recipientPhone: '111-111',
  recipientEmail: 'alice@example.com',
  recipientAddress: '1 Main St',
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
  recipientName: 'Bob',
  recipientPhone: '222-222',
  recipientEmail: 'bob@example.com',
  recipientAddress: '2 Pine St',
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
  recipientName: 'Carol',
  recipientPhone: '333-333',
  recipientEmail: 'carol@example.com',
  recipientAddress: '3 Oak Ave',
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
