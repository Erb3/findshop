import { array, z } from "zod";

const dimensions: any = {
    overworld: 0,
    nether: -1,
    end: 1
}

const arrayifyObjectSchema = z.object({}).strict().transform(_=> [])

export const websocketMessageLocationSchema = z.object({
    coordinates: z.union([z.array(z.number()), arrayifyObjectSchema]).transform(v => v.length==3 ? v : undefined).optional(),
    description: z.string().optional(),
    dimension: z.string().toLowerCase().transform(v => dimensions[v] ?? undefined).optional(),
})

export const websocketMessageSchema = z.object({
    type: z.literal("ShopSync"),
    version: z.literal(1).or(z.undefined()).or(z.null()),
    info: z.object({
        name: z.string(),
        description: z.string().optional(),
        owner: z.string().optional(),
        computerID: z.number().int(),
        multiShop: z.number().int().optional(),
        software: z.object({
            name: z.string().optional(),
            version: z.string().optional()
        }).optional(),
        location: websocketMessageLocationSchema.optional(),
        otherLocations: z.union([z.array(websocketMessageLocationSchema), arrayifyObjectSchema]).optional(),
    }),
    items: z.union([z.array(z.object({
        prices: z.union([z.array(z.object({
            value: z.number(),
            currency: z.string().toUpperCase(),
            address: z.string(),
            requiredMeta: z.string().optional()
        })), arrayifyObjectSchema]),
        item: z.object({
            name: z.string(),
            nbt: z.string().optional(),
            displayName: z.string(),
            description: z.string().optional()
        }),
        dynamicPrice: z.boolean().default(false),
        stock: z.number().int().optional(), // this is optional with madeOnDemand!!!!
        madeOnDemand: z.boolean().default(false),
        requiresInteraction: z.boolean().default(false),
        shopBuysItem: z.boolean().default(false),
        noLimit: z.boolean().default(false),
    })), arrayifyObjectSchema]).refine(
        d => d.length>0 ? (!d.every((v) => {return v.stock == undefined && !v.madeOnDemand})) : true,
        "Stock is not optional when madeOnDemand is false"
    )
})