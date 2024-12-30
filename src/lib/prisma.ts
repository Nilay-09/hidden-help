import { PrismaClient } from "@prisma/client";

// Declare global variable for PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient | undefined;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;
