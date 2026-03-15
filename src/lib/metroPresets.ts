import type { MetroPreset } from "@/lib/types";

export const METRO_PRESETS: Record<string, MetroPreset> = {
  dc_metro: {
    label: "Washington DC Metro Area",
    states: ["DC", "VA", "MD"],
    cities: [
      "Washington",
      "Arlington",
      "Alexandria",
      "Vienna",
      "McLean",
      "Tysons",
      "Reston",
      "Fairfax",
      "Herndon",
      "Bethesda",
      "Silver Spring",
      "Rockville",
      "College Park",
    ],
    locationKeywords: [
      "Washington, DC",
      "Arlington, VA",
      "Alexandria, VA",
      "Vienna, VA",
      "McLean, VA",
      "Tysons, VA",
      "Reston, VA",
      "Fairfax, VA",
      "Herndon, VA",
      "Bethesda, MD",
      "Silver Spring, MD",
      "Rockville, MD",
      "College Park, MD",
      "Hybrid in Washington, DC",
      "Remote in Washington, DC Metro",
    ],
  },
};

export const DEFAULT_METRO_KEY = "dc_metro";

export function getMetroPreset(metroKey?: string) {
  return METRO_PRESETS[metroKey ?? DEFAULT_METRO_KEY] ?? METRO_PRESETS[DEFAULT_METRO_KEY];
}
