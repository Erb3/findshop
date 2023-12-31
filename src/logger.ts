import { Logger } from "tslog";

export class FindShopLogger {
  static logger = new Logger({
    name: "FindShop Backend",
    prettyLogTemplate:
      "{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}  {{logLevelName}}\t",
    prettyLogTimeZone: "local",
  });
}

// export default fp(async (fastify, options) => {
//   const logger: Logger<ILogObj> = fastify.addHook("onResponse", (req, res) => {
//     fastify.logger.debug(
//       `${req.ip} ${req.method} ${res.statusCode} \t ${req.url}`
//     );
//   });
// });
