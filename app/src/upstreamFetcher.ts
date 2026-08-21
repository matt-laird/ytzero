import { computeQHash } from "./pipedProxyHash";
import { log } from "./logger";

export interface UpstreamFetcher {
  fetch(url: string, init?: RequestInit): Promise<Response>;
  /** Rewrite a YouTube-domain URL to the upstream target (identity for direct, proxy URL for piped). */
  rewriteUrl(url: string): string;
  readonly mode: "direct" | "piped_proxy";
}

function createDirectFetcher(): UpstreamFetcher {
  return {
    mode: "direct",
    fetch: (url, init) => globalThis.fetch(url, init),
    rewriteUrl: (url) => url,
  };
}

function createPipedProxyFetcher(proxyBaseUrl: string, secret: string): UpstreamFetcher {
  const base = proxyBaseUrl.replace(/\/+$/, "");

  function rewriteUrl(originalUrl: string): string {
    const parsed = new URL(originalUrl);
    const host = parsed.hostname;
    const path = parsed.pathname;

    const params = new URLSearchParams(parsed.search);
    params.set("host", host);

    const qhash = computeQHash(path, params, secret);
    params.set("qhash", qhash);

    return `${base}${path}?${params.toString()}`;
  }

  return {
    mode: "piped_proxy",
    rewriteUrl,
    async fetch(url: string, init?: RequestInit): Promise<Response> {
      const rewritten = rewriteUrl(url);
      return globalThis.fetch(rewritten, init);
    },
  };
}

let singleton: UpstreamFetcher | null = null;

export function initUpstreamFetcher(): UpstreamFetcher {
  const proxyUrl = process.env.PIPED_PROXY_URL?.trim();
  if (!proxyUrl) {
    singleton = createDirectFetcher();
    log.info("upstream.mode", { mode: "direct" });
    return singleton;
  }

  const secret = process.env.PIPED_PROXY_SECRET?.trim();
  if (!secret) {
    log.error("upstream.missing_secret", {
      message: "PIPED_PROXY_URL is set but PIPED_PROXY_SECRET is missing — cannot start",
    });
    process.exit(1);
  }

  singleton = createPipedProxyFetcher(proxyUrl, secret);
  log.info("upstream.mode", { mode: "piped_proxy", proxyUrl });
  return singleton;
}

export function getUpstreamFetcher(): UpstreamFetcher {
  if (!singleton) return initUpstreamFetcher();
  return singleton;
}
