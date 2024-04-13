import { Logger } from "tslog";

export class FindShopLogger {
    static logger = new Logger({
        name: "FindShop Backend",
        prettyLogTemplate:
            "{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}  {{logLevelName}}\t",
        prettyLogTimeZone: "local",
    });
}
