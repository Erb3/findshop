import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "file:./findshop.db",
  },
  driver: "libsql",
} satisfies Config;
