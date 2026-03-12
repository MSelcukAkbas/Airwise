import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./auth";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@airwise.com";
  const adminPassword = "adminpassword123";
  const adminUsername = "admin";

  console.log("Checking for existing admin user...");
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("Admin user already exists.");
    return;
  }

  const hashedPassword = await hashPassword(adminPassword);

  console.log("Creating default admin user...");
  await prisma.user.create({
    data: {
      email: adminEmail,
      username: adminUsername,
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("-----------------------------------------");
  console.log("Admin user created successfully!");
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
