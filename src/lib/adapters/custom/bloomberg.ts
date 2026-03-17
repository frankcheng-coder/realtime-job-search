import type { Adapter } from "@/lib/types";

export const bloombergAdapter: Adapter = async () => {
  throw new Error(
    "Bloomberg's official Avature board is reachable, but its current public listings do not expose reliable posting dates, so Bloomberg cannot yet support the past X days filter honestly.",
  );
};
