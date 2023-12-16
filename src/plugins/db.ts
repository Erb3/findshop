import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

export class DatabaseManager {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getAllShops() {
    return this.prisma.shop.findMany({
      include: {
        mainLocation: true,
      },
    });
  }

  async searchItems(query: string) {
    return this.prisma.item.findMany({
      where: {
        itemId: {
          contains: query,
          mode: "insensitive",
        },
        OR: [
          {
            displayName: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: {
        price: "desc",
      },
      include: {
        shop: {
          include: {
            mainLocation: true,
          },
        },
      },
    });
  }
}

declare module "fastify" {
  interface FastifyInstance {
    db: DatabaseManager;
  }
}

export default fp(async (fastify, options) => {
  const prisma = new PrismaClient({
    log: ["error", "info", "query", "warn"],
  });
  await prisma.$connect();

  fastify.decorate("db", new DatabaseManager(prisma));
  fastify.addHook("onClose", async (server) => {
    await server.db.prisma.$disconnect();
  });
});
