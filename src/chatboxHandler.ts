import { Client, User } from "switchchat";
import { z } from "zod";
import { formatLocation, makeResponse } from "./utils";
import { configSchema } from "./config";
import { DatabaseManager } from "./db";
import { FindShopLogger } from "./logger";

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
    console.debug(`${cmd.user.name}: ${cmd.args.join(" ")}`);

    switch (cmd.args[0]) {
      case null:
      case undefined:
      case "help":
        chatboxHandler.sendHelp(cmd.user);
        break;

      case "stats":
        chatboxHandler.sendDisabledFeature(cmd.user);
        break;

      case "list":
      case "l":
      case "ls":
        chatboxHandler.sendShopsList(cmd.user);
        break;

      case "sell":
      case "sl":
      case "s":
        chatboxHandler.sendDisabledFeature(cmd.user);
        break;

      case "shop":
      case "sh":
        chatboxHandler.sendDisabledFeature(cmd.user);
        break;

      case "buy":
      case "b":
        let items = await chatboxHandler.searchItems(cmd.args[1]);
        let page = parseInt(cmd.args[2]) 
        if (isNaN(page)) page = 1;
        chatboxHandler.chatbox.tell(
          cmd.user.uuid,
          makeResponse({
            content: items,
            page: page,
            args: "buy " + cmd.args[1],
          })
        );
        console.log(cmd.args[0])
        break;

      default:
        {
          let items = await chatboxHandler.searchItems(cmd.args[0]);
          let page = parseInt(cmd.args[1]) 
          if (isNaN(page)) page = 1;
          chatboxHandler.chatbox.tell(
            cmd.user.uuid,
            makeResponse({
              content: items,
              page: page,
              args: cmd.args[0],
            })
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

const short: string[] = ["l", "i", "t", "[", "]", " "];

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

  generateLine(text?: string) {
    if (text) {
      let length = this.config.CHAT_WIDTH - 5;

      text
        .replace("`", "")
        .split("")
        .forEach((char) => {
          if (short.includes(char)) {
            length -= 0.4;
          } else {
            length--;
          }
        });

      const toRepeat = Math.round(length / 2);

      return `${"=".repeat(toRepeat)} ${text} ${"=".repeat(toRepeat)}`;
    } else {
      return "=".repeat(this.config.CHAT_WIDTH);
    }
  }

  async sendHelp(user: User) {
    await this.chatbox.tell(
      user.uuid,
      `FindShop helps locate ShopSync-compatible shops buying or selling an item.
      \`\\fs list\` - List detected shops
      \`\\fs stats\` - Statistics (currently only shop count)
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

  async sendShopsList(user: User) {
    return this.sendDisabledFeature(user);

    /*
    const shops = await this.db.getAllShops();
    const lines = shops.map((shop) => `**${shop.name}** at ${formatLocation(shop)}`);

    this.chatbox.tell(
      user.uuid,
      makeResponse({
        content: lines,
        args: "1"
      })
    );
    */
  }

  async searchItems(query: string) {
    const items = await this.db.searchItems(query);
    let output: string[] = [];

    for (let i=0;i<items.length;i++) {
      let v = items[i]
      if (!v.shop.mainLocation) {
        //throw new Error("Missing location!");
      } else {
        let priceStr
        if (v.kstPrice) {
          priceStr = `k${v.kstPrice}`

          output.push(
            `${priceStr} \`${v.itemID}\` at **${v.shop.name}** (${formatLocation(v.shop.mainLocation)})\n`
          );
        }
        
        /* TODO: tenebra
        if (v.tstPrice) {
          if (v.kstPrice) {
            priceStr = priceStr + " "
          }
          priceStr = priceStr + `t${v.tstPrice}`
        }
        */
      }
    }

    console.log(output)

    return output;
  }
}
