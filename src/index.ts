import Fastify from "fastify";
import loggerPlugin from "./plugins/logger";
import configPlugin from "./plugins/config";
import dbPlugin from "./plugins/db";
import chatboxPlugin from "./plugins/chatbox";

const fastify = Fastify({});
fastify.register(loggerPlugin);
fastify.register(configPlugin);
fastify.register(dbPlugin);
fastify.register(chatboxPlugin);

fastify.listen(
  { port: 8080, host: "0.0.0.0", ipv6Only: false },
  (err, addr) => {
    console.log(`FindShop backend running on ${addr}`);
  }
);
