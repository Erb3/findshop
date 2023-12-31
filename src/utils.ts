import { Location } from "@prisma/client";
import { z as zod } from "zod";

const urlValidator = zod.union([zod.string().ip(), zod.string().url()]);

export function formatLocation({ x, y, z, description, dimension }: Location) {
  if (urlValidator.parse(description)) {
    return description;
  }
}
