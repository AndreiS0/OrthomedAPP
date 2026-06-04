import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const fullPerm = await prisma.permission.upsert({
        where: { action: 'FULL_ACCESS' },
        update: {},
        create: { action: 'FULL_ACCESS' },
    });

    const restrictedPerm = await prisma.permission.upsert({
        where: { action: 'RESTRICTED_ACCESS' },
        update: {},
        create: { action: 'RESTRICTED_ACCESS' },
    });


    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            permissions: { connect: [{ id: fullPerm.id }] }
        },
    });

    const userRole = await prisma.role.upsert({
        where: { name: 'Normal User' },
        update: {},
        create: {
            name: 'Normal User',
            permissions: { connect: [{ id: restrictedPerm.id }] }
        },
    });


    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: { username: 'admin', password: 'sal123', roleId: adminRole.id },
    });

    await prisma.user.upsert({
        where: { username: 'doctor' },
        update: {},
        create: { username: 'doctor', password: 'salut123', roleId: userRole.id },
    });

    console.log('✅');
    console.log('👉 Admin: admin / password123');
    console.log('👉 User normal: doctor / password123');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());