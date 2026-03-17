import { fetch, type RequestInit } from "undici";

const USER_AGENT =
  "RealtimeJobSearchBot/1.0 (+https://localhost; public-access-only; contact: local-dev)";

export async function fetchTextWithRetry(url: string, options?: RequestInit) {
  return fetchWithRetry(url, {
    ...options,
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      ...(options?.headers ?? {}),
    },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.text();
  });
}

export async function fetchJsonWithRetry<T>(url: string, options?: RequestInit) {
  return fetchWithRetry(url, {
    ...options,
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/json,text/plain;q=0.8,*/*;q=0.7",
      "content-type": "application/json",
      ...(options?.headers ?? {}),
    },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return (await response.json()) as T;
  });
}

async function fetchWithRetry(url: string, options?: RequestInit) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt === 1 || (error instanceof Error && error.name === "AbortError")) {
        break;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Request failed for ${url}`);
}
