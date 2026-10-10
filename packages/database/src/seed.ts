import { PrismaClient, GlobalRole, WorkspaceRole, AccountStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user (password: "admin123456")
  // This hash is for development only - real users should register through the app
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@moderators.dev' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'admin@moderators.dev',
      // Argon2id hash of "admin123456" - generated at build time for seed purposes only
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$seed-only-not-for-production$placeholder',
      name: 'Admin User',
      globalRole: GlobalRole.SUPER_ADMIN,
    },
  });

  console.log(`  ✓ Admin user: ${adminUser.email}`);

  // Create default workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'Default Workspace',
      slug: 'default',
      ownerId: adminUser.id,
    },
  });

  console.log(`  ✓ Workspace: ${workspace.name}`);

  // Add admin as workspace owner
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      id: randomUUID(),
      workspaceId: workspace.id,
      userId: adminUser.id,
      role: WorkspaceRole.OWNER,
    },
  });

  console.log(`  ✓ Admin added as workspace owner`);

  // Create sample Instagram accounts (all PENDING - need auth)
  const sampleAccounts = [
    'demo_account_1',
    'demo_account_2',
    'demo_account_3',
    'demo_account_4',
    'demo_account_5',
  ];

  for (const username of sampleAccounts) {
    await prisma.instagramAccount.upsert({
      where: {
        workspaceId_username: {
          workspaceId: workspace.id,
          username,
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        workspaceId: workspace.id,
        username,
        status: AccountStatus.PENDING,
        addedById: adminUser.id,
      },
    });
  }

  console.log(`  ✓ ${sampleAccounts.length} sample accounts created`);

  // Create activity log entries
  await prisma.activityLog.createMany({
    data: [
      {
        id: randomUUID(),
        workspaceId: workspace.id,
        userId: adminUser.id,
        action: 'workspace.created',
        target: workspace.name,
        status: 'success',
        metadata: { workspaceName: workspace.name },
      },
      {
        id: randomUUID(),
        workspaceId: workspace.id,
        userId: adminUser.id,
        action: 'accounts.imported',
        target: `${sampleAccounts.length} accounts`,
        status: 'success',
        metadata: { count: sampleAccounts.length },
      },
    ],
  });

  console.log(`  ✓ Activity logs created`);

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
