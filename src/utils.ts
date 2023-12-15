import { Location } from "@prisma/client";

export function formatLocation(loc: Location) {
  return `${loc.x} ${loc.y} ${loc.z}`;
}
