import { z } from "zod";
import { FindShopLogger } from "./logger";

export const configSchema = z.object({
  CHATBOX_TOKEN: z.string().uuid(),
  CHATBOX_NAME: z.string().default("&6&lFindShop"),
  ALIASES: z.array(z.string()).default(["fs", "findshop", "fs2"]),
  RESULTS_PER_AGE: z.number().default(7),
  GITHUB_LINK: z.string().default("https://github.com/Pixium/findshop"),
  CHAT_WIDTH: z.number().default(49),
  WEBSOCKET_TOKEN: z.string(),
});

export async function parseConfig() {
  const config = await configSchema.safeParseAsync(Bun.env);

  if (!config.success) {
    FindShopLogger.logger.error(
      `Failed to read environment variables. Provided error: ${config.error}`
    );
    process.exit(1);
  } else {
    return config.data;
  }
}
