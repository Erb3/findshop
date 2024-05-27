import { PrismaClient } from "@prisma/client";
import { Database } from "bun:sqlite";
import { and, eq, lt } from "drizzle-orm";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { z } from "zod";
import * as schema from "./drizzle/schema";
import { FindShopLogger } from "./logger";
import { websocketMessageSchema } from "./schemas";

type drizzleDbType = BunSQLiteDatabase<typeof schema>;

export class DatabaseManager {
    private prisma: PrismaClient;
    private drizzle: drizzleDbType;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;

        const sqlite = new Database("sqlite.db");
        const db = drizzle(sqlite, { schema });
        this.drizzle = db;

        setInterval(async () => {
            await this.cleanOldShops();
        }, 60000 * 15);
    }

    async cleanOldShops() {
        const deletedRows = await this.drizzle
            .delete(schema.Shop)
            .where(
                lt(schema.Shop.lastSeen, Date.now() - 14 * 24 * 60 * 60 * 1000)
            )
            .returning();

        FindShopLogger.logger.info(`Deleted ${deletedRows.length} old shop(s)`);
    }

    async handlePacket(shopsyncPacket: z.infer<typeof websocketMessageSchema>) {
        const shop = await this.prisma.shop.findFirst({
            where: {
                computerID: shopsyncPacket.info.computerID,
                multiShop: shopsyncPacket.info.multiShop,
            },
        });

        if (!shop) return this.insertShop(shopsyncPacket);
        return this.modifyShop(shop.id, shopsyncPacket);
    }

    async createOrUpdateShop(packet: z.output<typeof websocketMessageSchema>) {
        const shop = await this.drizzle
            .select()
            .from(schema.Shop)
            .where(
                and(
                    eq(schema.Shop.computerID, packet.info.computerID),
                    packet.info.multiShop
                        ? eq(schema.Shop.multiShop, packet.info.multiShop)
                        : undefined
                )
            )
            .limit(1);

        if (!shop) {
            await this.drizzle.transaction(async (tx) => {
                await tx.insert(); // TODO: :(
                await tx.insert(schema.Shop).values(packet.info);
            });
        } else {
            await this.drizzle
                .update(schema.Shop)
                .set(packet.info)
                .where(
                    and(
                        eq(schema.Shop.computerID, packet.info.computerID),
                        packet.info.multiShop
                            ? eq(schema.Shop.multiShop, packet.info.multiShop)
                            : undefined
                    )
                );
        }
    }

    async insertShop(shopsyncPacket: z.infer<typeof websocketMessageSchema>) {
        await this.prisma.shop.create({
            data: {
                name: shopsyncPacket.info.name,
                description: shopsyncPacket.info.description,
                owner: shopsyncPacket.info.owner,
                computerID: shopsyncPacket.info.computerID,
                multiShop: shopsyncPacket.info.multiShop,
                softwareName: shopsyncPacket.info.software?.name,
                softwareVersion: shopsyncPacket.info.software?.version,
                locations: {
                    create: [
                        {
                            main: true,
                            x: shopsyncPacket.info.location?.coordinates?.[0],
                            y: shopsyncPacket.info.location?.coordinates?.[1],
                            z: shopsyncPacket.info.location?.coordinates?.[2],
                            description:
                                shopsyncPacket.info.location?.description,
                            dimension: shopsyncPacket.info.location?.dimension,
                        },
                    ].concat(
                        (shopsyncPacket.info.otherLocations ?? []).map(
                            (loc: any) => ({
                                main: false,
                                x: loc.position?.[0],
                                y: loc.position?.[1],
                                z: loc.position?.[2],
                                description: loc.description,
                                dimension: loc.dimension,
                            })
                        )
                    ),
                },
                items: {
                    // @ts-ignore
                    create: (shopsyncPacket.items ?? []).map((item: any) => ({
                        name: item.item.name,
                        displayName: item.item.displayName,
                        nbtHash: item.item.nbt,
                        description: item.item.description,
                        dynamicPrice: item.dynamicPrice,
                        madeOnDemand: item.madeOnDemand,
                        stock: item.stock,
                        requiresInteraction: item.requiresInteraction,
                        shopBuysItem: item.shopBuysItem,
                        noLimit: item.noLimit,

                        prices: {
                            create: (item.prices ?? []).map((price: any) => ({
                                value: price.value,
                                currency: price.currency,
                                address: price.address,
                                requiredMeta: price.requiredMeta,
                            })),
                        },
                    })),
                },
            },
        });
    }

    async modifyShop(
        id: string,
        shopsyncPacket: z.infer<typeof websocketMessageSchema>
    ) {
        await this.prisma.shop.update({
            where: {
                id: id,
            },
            data: {
                lastSeen: new Date(),
                name: shopsyncPacket.info.name,
                description: shopsyncPacket.info.description,
                owner: shopsyncPacket.info.owner,
                computerID: shopsyncPacket.info.computerID,
                multiShop: shopsyncPacket.info.multiShop,
                softwareName: shopsyncPacket.info.software?.name,
                softwareVersion: shopsyncPacket.info.software?.version,
                locations: {
                    deleteMany: {},
                    create: [
                        {
                            main: true,
                            x: shopsyncPacket.info.location?.coordinates?.[0],
                            y: shopsyncPacket.info.location?.coordinates?.[1],
                            z: shopsyncPacket.info.location?.coordinates?.[2],
                            description:
                                shopsyncPacket.info.location?.description,
                            dimension: shopsyncPacket.info.location?.dimension,
                        },
                    ].concat(
                        (shopsyncPacket.info.otherLocations ?? []).map(
                            (loc: any) => ({
                                main: false,
                                x: loc.position?.[0],
                                y: loc.position?.[1],
                                z: loc.position?.[2],
                                description: loc.description,
                                dimension: loc.dimension,
                            })
                        )
                    ),
                },
                items: {
                    deleteMany: {},
                    // @ts-ignore
                    create: (shopsyncPacket.items ?? []).map((item: any) => ({
                        name: item.item.name,
                        displayName: item.item.displayName,
                        nbtHash: item.item.nbt,
                        description: item.item.description,
                        dynamicPrice: item.dynamicPrice,
                        madeOnDemand: item.madeOnDemand,
                        stock: item.stock,
                        requiresInteraction: item.requiresInteraction,
                        shopBuysItem: item.shopBuysItem,
                        noLimit: item.noLimit,

                        prices: {
                            create: (item.prices ?? []).map((price: any) => ({
                                value: price.value,
                                currency: price.currency,
                                address: price.address,
                                requiredMeta: price.requiredMeta,
                            })),
                        },
                    })),
                },
            },
        });
    }

    async searchItems(query: string, exact: boolean) {
        const exactq = [
            { name: { equals: query } },
            { displayName: { equals: query } },
        ];
        const nonexactq = [
            { name: { contains: query } },
            { displayName: { contains: query } },
        ];

        return this.prisma.item.findMany({
            where: {
                OR: exact ? exactq : nonexactq,
            },
            include: {
                prices: true,
                shop: {
                    include: {
                        locations: true,
                    },
                },
            },
        });
    }

    async getAllShops() {
        return this.prisma.shop.findMany({
            include: {
                locations: true,
            },
        });
    }

    async getShop(computerID: number, multiShop: number | undefined) {
        return this.prisma.shop.findFirst({
            where: {
                computerID: computerID,
                multiShop: multiShop,
            },
            include: { locations: true },
        });
    }

    async getStatistics() {
        return {
            shopCount: await this.prisma.shop.count(),
            itemCount: await this.prisma.item.count(),
            locationCount: await this.prisma.location.count(),
        };
    }
}

export async function connectToDatabase() {
    FindShopLogger.logger.debug("Connecting to database...");

    const prisma = new PrismaClient({
        log: ["error", "info", "warn"],
    });

    await prisma.$connect();
    FindShopLogger.logger.debug("Connected to database!");
    return new DatabaseManager(prisma);
}
