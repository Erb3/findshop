import fp from "fastify-plugin";
import { ILogObj, Logger } from "tslog";

declare module "fastify" {
  interface FastifyInstance {
    logger: Logger<ILogObj>;
  }
}

export default fp(async (fastify, options) => {
  const logger: Logger<ILogObj> = new Logger({
    name: "FindShop Backend",
    prettyLogTemplate:
      "{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}  {{logLevelName}}\t",
    prettyLogTimeZone: "local",
  });

  fastify.addHook("onResponse", (req, res) => {
    fastify.logger.debug(
      `${req.ip} ${req.method} ${res.statusCode} \t ${req.url}`
    );
  });

  fastify.decorate("logger", logger);
});
