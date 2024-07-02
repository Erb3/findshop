import { z } from "zod";
import { FindShopLogger } from "./logger";

export const configSchema = z.object({
    LISTEN_HOSTNAME: z.string().ip().default("127.0.0.1"),
    LISTEN_PORT: z.coerce.number().int().gte(0).lte(65535).default(8080),
    CHATBOX_TOKEN: z.string().uuid(),
    WEBSOCKET_TOKEN: z.string(),
    DATABASE_URL: z.string(),
    CHATBOX_NAME: z.string().default("&6&lFindShop"),
    ALIASES: z.preprocess(
        (v) => (typeof v === "string" ? v.split(",") : v),
        z.array(z.string()).default(["fs", "findshop"])
    ),
    RESULTS_PER_PAGE: z.number().default(7),
    GITHUB_LINK: z.string().default("https://github.com/Erb3/findshop"),
    CHAT_WIDTH: z.number().default(49),
});

export async function parseConfig() {
    const config = await configSchema.safeParseAsync(Bun.env);

    if (!config.success) {
        FindShopLogger.logger.error(
            `Failed to read environment variables. Provided error: ${config.error}`
        );

        throw config.error;
    }

    return config.data;
}
