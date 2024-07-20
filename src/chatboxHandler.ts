import { Client, User } from "switchchat";
import { z } from "zod";
import { configSchema } from "./config";
import { DatabaseManager, Statistics } from "./db";
import { FindShopLogger } from "./logger";
import { formatLocation, paginate, sliceArgs } from "./utils";

export async function initChatbox(
    config: z.infer<typeof configSchema>,
    db: DatabaseManager
) {
    const chatbox = new Client(config.CHATBOX_TOKEN);
    const chatboxHandler = new ChatboxHandler(chatbox, db, config);

    chatbox.defaultName = config.CHATBOX_NAME;
    chatbox.defaultFormattingMode = "markdown";

    chatbox.on("command", async (cmd) => {
        if (!config.ALIASES.includes(cmd.command)) return;
        FindShopLogger.logger.debug(
            `${cmd.user.name}: ${cmd.command} ${cmd.args.join(" ")}`
        );

        cmd.args = sliceArgs(cmd.args.join(" "));

        switch (cmd.args[0]) {
            case null:
            case undefined:
            case "help":
                chatboxHandler.sendHelp(cmd.user, cmd.command);
                break;

            case "stats":
                await chatboxHandler.sendStats(cmd.user);
                break;

            case "list":
            case "l":
            case "ls": {
                await chatboxHandler.sendShopList(
                    cmd.user,
                    parseInt(cmd.args[1])
                );
                break;
            }

            case "sell":
            case "sl":
            case "s": {
                chatboxHandler.sendItemSearch({
                    user: cmd.user,
                    searchQuery: cmd.args[1],
                    page: parseInt(cmd.args[2]) || 1,
                    shopBuysItemOnly: true,
                });
                break;
            }

            case "shop":
            case "sh":
                chatboxHandler.getShopInfo(cmd.user, cmd.args[1]);
                break;

            case "buy":
            case "b": {
                chatboxHandler.sendItemSearch({
                    user: cmd.user,
                    searchQuery: cmd.args[1],
                    page: parseInt(cmd.args[2]) || 1,
                    shopBuysItemOnly: false,
                });
                break;
            }

            default: {
                chatboxHandler.sendItemSearch({
                    user: cmd.user,
                    searchQuery: cmd.args[0],
                    page: parseInt(cmd.args[1]) || 1,
                    shopBuysItemOnly: false,
                });
                break;
            }
        }
    });

    chatbox.on("ready", () => {
        FindShopLogger.logger.debug("Connected to chatbox!");
    });

    FindShopLogger.logger.debug("Connecting to chatbox...");
    chatbox.connect();
}

export class ChatboxHandler {
    chatbox: Client;
    db: DatabaseManager;
    config: z.infer<typeof configSchema>;

    constructor(
        chatbox: Client,
        db: DatabaseManager,
        config: z.infer<typeof configSchema>
    ) {
        this.chatbox = chatbox;
        this.db = db;
        this.config = config;
    }

    async sendHelp(user: User, cmd: string) {
        await this.chatbox.tell(
            user.uuid,
            `FindShop helps locate ShopSync-compatible shops buying or selling an item.
      \`\\${cmd} list\` - List detected shops
      \`\\${cmd} stats\` - Statistics - currently only basic
      \`\\${cmd} buy [item]\` - Finds shops selling *[item]*
      \`\\${cmd} sell [item]\` - Finds shops buying *[item]*
      \`\\${cmd} shop [id]\` - Finds shop based on computer *[id]* and their info
      For more information, check [the GitHub repository](${this.config.GITHUB_LINK})`
        );
    }

    async sendItemSearch({
        user,
        searchQuery,
        page,
        shopBuysItemOnly,
    }: {
        user: User;
        searchQuery: string;
        page: number;
        shopBuysItemOnly: boolean;
    }) {
        if (!searchQuery)
            return this.chatbox.tell(user.uuid, "&c&lError: &cMissing query");

        const exact = searchQuery.charAt(0) === "=";
        if (exact) searchQuery = searchQuery.substring(1);

        const items = await this.db.searchItems({
            query: searchQuery,
            includeFullShop: true,
            exact,
            inStock: false,
            shopMustBuyItem: shopBuysItemOnly,
        });

        const output: {
            price: number;
            stock: number;
            text: string;
        }[] = [];

        items.forEach((item) => {
            // Map array of prices to a map
            const prices = new Map<string, number>();
            item.prices.forEach((price) => {
                FindShopLogger.logger.debug(
                    `Item ${item.name} has currency ${price.currency} with value ${price.value}`
                );
                prices.set(price.currency, price.value);
            });

            // TODO: other currencies
            const kstPrice = prices.get("KST");
            if (kstPrice === undefined) {
                FindShopLogger.logger.debug(
                    `Item ${item.name} from ${item.shop.name} does not have a krist price.`
                );
                return;
            }

            const mainLocation =
                item.shop.locations.find((loc) => loc.main === true) ?? {};

            output.push({
                price: kstPrice,
                stock: item.stock || 0,
                text: `k${kstPrice} (${item.stock ?? "-"}) \`${
                    item.name
                }\` at **${item.shop.name}** (id=\`${item.shop.computerID}${
                    item.shop.multiShop ? ";" : ""
                }${item.shop.multiShop ?? ""}\`) (${formatLocation(
                    mainLocation
                )})`,
            });
        });

        // Sorts based on stock, and price.
        // If shop buys items, it is sorted after highest price.
        output.sort((a, b) => {
            // Check if one doesn't have stock
            const stockA = a.stock === 0 ? 0 : 1;
            const stockB = b.stock === 0 ? 0 : 1;

            if (stockA !== stockB) {
                return stockB - stockA;
            }

            return shopBuysItemOnly ? b.price - a.price : a.price - b.price;
        });

        // TODO: args is ugly
        this.chatbox.tell(
            user.uuid,
            paginate({
                content: output.map((v) => v.text),
                page,
                args:
                    (shopBuysItemOnly ? "sell " : "buy ") +
                    ((searchQuery.indexOf(" ") === -1 && searchQuery) ||
                        `"${searchQuery}"`),
            })
        );
    }

    async sendShopList(user: User, page: number) {
        const shops = await this.db.getAllShops();
        const output: string[] = [];

        shops.forEach((shop) => {
            const mainLocation: any =
                shop.locations.find((loc) => loc.main === true) ?? {};

            output.push(
                `${shop.name} (id=\`${shop.computerID}${
                    shop.multiShop ? ";" : ""
                }${shop.multiShop ?? ""}\`) at ${formatLocation(mainLocation)}`
            );
        });

        this.chatbox.tell(
            user.uuid,
            paginate({
                content: output,
                page: page || 1,
                args: "list ",
            })
        );
    }

    async getShopInfo(user: User, query: string) {
        if (!query) return this.chatbox.tell(user.uuid, "Shop not found");
        const id = query.split(":");
        if (id.length > 2)
            return this.chatbox.tell(user.uuid, "Invalid shop id");
        const cid = parseInt(id[0]);
        const multishop = parseInt(id[1]);

        if (isNaN(cid) || (isNaN(multishop) && id[1]))
            return this.chatbox.tell(user.uuid, "Invalid shop id");

        const shop = await this.db.getShop(cid, multishop || undefined, false);
        if (!shop) return this.chatbox.tell(user.uuid, "Shop not found");

        const mainLocation: any =
            shop.locations.find((loc) => loc.main === true) ?? {};

        // TODO: limit length of desc
        // sorry
        const mainLocationPos = mainLocation
            ? mainLocation.x && mainLocation.y && mainLocation.z
                ? `${mainLocation.x} ${mainLocation.y} ${mainLocation.z}`
                : "null"
            : "null";
        const mainLocationDim = mainLocation
            ? mainLocation.dimension ?? "null"
            : "null";
        const mainLocationDesc = mainLocation
            ? mainLocation.description ?? "null"
            : "null";

        const shopInfo: any = [
            ["name", shop.name],
            ["owner", shop.owner],
            ["description", shop.description],
            ["mainLocationPos", mainLocationPos],
            ["mainLocationDim", mainLocationDim],
            ["mainLocationDesc", mainLocationDesc],
            ["fmainLocation", formatLocation(mainLocation)],
            ["softwareName", shop.softwareName],
            ["softwareVersion", shop.softwareVersion],
            ["lastSeen", shop.lastSeen.toISOString()],
        ];
        this.chatbox.tell(
            user.uuid,
            shopInfo.reduce((acc: any, v: any) => {
                return `${acc}\n${v[0]}: \`${v[1] ?? "null"}\``;
            }, `Info for shop \`${query}\``)
        );
    }

    async sendStats(user: User) {
        const dbStats = await this.db.getStatistics();

        this.chatbox.tell(
            user.uuid,
            (Object.keys(dbStats) as (keyof Statistics)[])
                .map((key) => {
                    const stat = dbStats[key];
                    return `${
                        stat.friendlyName
                    }: \`${stat.value?.toString()}\``;
                })
                .join("\n")
        );
    }
}
