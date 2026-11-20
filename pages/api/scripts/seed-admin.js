// Usage: node scripts/seed-admin.js <FIREBASE_UID>
// 1) Firebase Console -> Authentication -> Add user: admin@ub.edu.ph / admin123
// 2) Kopyahin ang User UID, tapos patakbuhin ang script na ito.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/seed-admin.js <aOSrWHC0RpcQwvQl2nf4l4XyMB02>');
  process.exit(1);
}

(async () => {
  const admin = await prisma.user.upsert({
    where: { uid },
    update: { role: 'admin' },
    create: {
      uid,
      name: 'System Admin',
      email: 'admin@ub.edu.ph',
      role: 'admin',
      avatar: 'SA',
    },
  });
  console.log('Admin ready:', admin.email, admin.role);
  await prisma.$disconnect();
})();