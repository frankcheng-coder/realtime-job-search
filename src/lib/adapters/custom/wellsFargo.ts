import type { Adapter } from "@/lib/types";

export const wellsFargoAdapter: Adapter = async () => {
  throw new Error(
    "Wells Fargo's public careers site is currently blocking automated access from this app environment.",
  );
};
