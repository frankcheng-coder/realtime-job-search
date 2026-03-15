import type { Adapter } from "@/lib/types";

export const bloombergAdapter: Adapter = async () => {
  throw new Error(
    "Bloomberg's public careers site is currently serving a robot check instead of job results in this app environment.",
  );
};
