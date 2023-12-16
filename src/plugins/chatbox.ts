import fp from "fastify-plugin";
import { Client } from "switchchat";
import { ChatboxHandler } from "../chatboxHandler";

export default fp(async (fastify, options) => {
  const chatbox = new Client(fastify.config.CHATBOX_TOKEN);

  const chatboxHandler = new ChatboxHandler(
    chatbox,
    fastify.db,
    fastify.config
  );

  chatbox.defaultName = fastify.config.CHATBOX_NAME;
  chatbox.defaultFormattingMode = "markdown";

  chatbox.on("command", async (cmd) => {
    if (!fastify.config.ALIASES.includes(cmd.command)) return;
    console.debug(`${cmd.user.name}: ${cmd.args.join(" ")}`);

    switch (cmd.args[0]) {
      case null:
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

      default:
      case "buy":
      case "b":
        chatboxHandler.searchItems(cmd.args.join(" "), cmd.user);
        break;
    }
  });

  chatbox.on("ready", () => {
    console.log("Successfully connected to chatbox!");
  });

  chatbox.connect();
});
