import { Client, User } from "switchchat";
import { z } from "zod";
import { formatLocation, paginate } from "./utils";
import { configSchema } from "./config";
import { DatabaseManager } from "./db";
import { FindShopLogger } from "./logger";
import { Prisma } from "@prisma/client";

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
        FindShopLogger.logger.debug(`${cmd.user.name}: ${cmd.args.join(" ")}`);

        switch (cmd.args[0]) {
            case null:
            case undefined:
            case "help":
                chatboxHandler.sendHelp(cmd.user);
                break;

            case "stats":
                await chatboxHandler.sendStats(cmd.user);
                break;

            case "list":
            case "l":
            case "ls": {
                await chatboxHandler.sendShopList(cmd.user, cmd.args, parseInt(cmd.args[1]));
                break;
            }

            case "sell":
            case "sl":
            case "s": {
                chatboxHandler.sendItemSearch(
                    cmd.user,
                    cmd.args[1],
                    parseInt(cmd.args[2]),
                    true
                );
                break;
            }

            case "shop":
            case "sh":
                chatboxHandler.sendDisabledFeature(cmd.user);
                break;

            case "buy":
            case "b": {
                chatboxHandler.sendItemSearch(
                    cmd.user,
                    cmd.args[1],
                    parseInt(cmd.args[2]),
                    false
                );
                break;
            }

            default: {
                chatboxHandler.sendItemSearch(
                    cmd.user,
                    cmd.args[0],
                    parseInt(cmd.args[1]),
                    false
                );
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

    async sendHelp(user: User) {
        await this.chatbox.tell(
            user.uuid,
            `FindShop helps locate ShopSync-compatible shops buying or selling an item.
      \`\\fs list\` - List detected shops
      \`\\fs stats\` - Statistics - currently only basic
      \`\\fs buy [item]\` - Finds shops selling *[item]*
      \`\\fs sell [item]\` - Finds shops buying *[item]*
      \`\\fs shop [name]\` - Finds shops named *[name]* and their info
      For more information, check [the GitHub repository](${this.config.GITHUB_LINK})`
        );
    }

    async sendDisabledFeature(user: User) {
        await this.chatbox.tell(
            user.uuid,
            `This feature is currently ~~unimplemented~~ disabled, check back later!`
        );
    }

    async sendItemSearch(user: User, query: string, page: number | undefined, sell: boolean) {
        const items = await this.db.searchItems(query);
        const output: any = [];

        items.forEach((item) => {
            console.log(item)
            if (item.shopBuysItem && !sell) return; // were looking for shops selling items, shop is buying
            if (!item.shopBuysItem && sell) return; // were looking for shops buying items, shop is selling

            let prices = item.prices.reduce((acc: any, price) => {acc[price.currency] = price; return acc}, {})
            let kstPrice = prices["KST"]
            
            if (!kstPrice) return; // other currencies wip

            let mainLocation = item.shop.locations.find(loc => loc.main === true) ?? {}

            const price = `k${kstPrice.value}`;

            output.push({
                price: kstPrice.value,
                stock: item.stock,
                text: `${price} (${item.stock ?? "-"}) \`${item.name}\` at **${item.shop.name}** (${formatLocation(
                    mainLocation as Prisma.LocationCreateInput
                )})`
            });
        });

        output.sort((a: any, b: any) => {
            let stockA = a.stock === 0 ? 0 : 1;
            let stockB = b.stock === 0 ? 0 : 1;
          
            if (stockA !== stockB) {
                return stockB - stockA;
            }
        
            return a.price - b.price;
        });

        const content: string[] = output.map((v: any) => v.text);

        this.chatbox.tell(
            user.uuid,
            paginate({
                content: content,
                page: page || 1,
                args: (sell ? "sell " : "buy ") + query,
            })
        );
    }

    
    async sendShopList(user: User, args: string[], page: number) {
      const shops = await this.db.getAllShops();
      const output: string[] = [];
  
      shops.forEach((shop) => {
        let mainLocation: any = shop.locations.find(loc => loc.main === true) ?? {}
        
        output.push(`${shop.name} at ${formatLocation(mainLocation)}`);
      });
  
      console.log(page)
      this.chatbox.tell(
        user.uuid,
        paginate({
          content: output,
          page: page || 1,
          args: "list ",
        })
      );
    }

    async sendStats(user: User) {
        let stats = await this.db.getStatistics();

        this.chatbox.tell(user.uuid,`Stats:\nShop count: \`${stats.shopCount}\`Location count: \`${stats.locationCount}\`\nTotal item count: \`${stats.itemCount}\`\nMore stats will be added soon!`);
    }
}