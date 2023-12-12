import { Client, User } from "switchchat";
import { DatabaseManager } from "./db";
import { configSchema } from "./types";
import { z } from "zod";

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
    \`\\fs stats\` - Statistics (currently only shop count)
    \`\\fs buy [item]\` - Finds shops selling *[item]*
    \`\\fs sell [item]\` - Finds shops buying *[item]*
    \`\\fs shop [name]\` - Finds shops named *[name]* and their info
    For more information, check [the GitHub](${this.config.GITHUB_LINK})`
    );
  }

  async sendDisabledFeature(user: User) {
    await this.chatbox.tell(
      user.uuid,
      `This feature is currently ~~unimplemented~~ disabled, check back later!`
    );
  }

  async sendList(user: User) {
    const shops = await this.db.getAllShops();
    let output: string[] = [];

    output.push("=".repeat(this.config.CHAT_WIDTH));
    shops.forEach((v) =>
      output.push(
        `  **${v.name}** at ${
          v.mainLocation?.description ||
          `\`${v.mainLocation.x} ${v.mainLocation.y} ${v.mainLocation.z}\``
        }`
      )
    );
    output.push("=".repeat(this.config.CHAT_WIDTH));

    this.chatbox.tell(user.uuid, output.join("\n"));
  }
}
