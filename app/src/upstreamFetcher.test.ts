import { describe, expect, test } from "bun:test";
import { computeQHash } from "./ytProxyHash";

describe("YT proxy URL rewriting", () => {
  const secret = "test_secret";
  const proxyBase = "https://proxy.example.com";

  function rewriteUrl(originalUrl: string): string {
    const parsed = new URL(originalUrl);
    const host = parsed.hostname;
    const path = parsed.pathname;
    const params = new URLSearchParams(parsed.search);
    params.set("host", host);
    const qhash = computeQHash(path, params, secret);
    params.set("qhash", qhash);
    return `${proxyBase}${path}?${params.toString()}`;
  }

  test("rewrites a googlevideo.com URL to the proxy origin", () => {
    const original = "https://rr5---sn-xxx.googlevideo.com/videoplayback?expire=9999&ei=abc";
    const result = rewriteUrl(original);
    const parsed = new URL(result);
    expect(parsed.origin).toBe(proxyBase);
    expect(parsed.pathname).toBe("/videoplayback");
    expect(parsed.searchParams.get("host")).toBe("rr5---sn-xxx.googlevideo.com");
    expect(parsed.searchParams.get("qhash")).toMatch(/^[0-9a-f]{8}$/);
    expect(parsed.searchParams.get("expire")).toBe("9999");
    expect(parsed.searchParams.get("ei")).toBe("abc");
  });

  test("rewrites a ytimg.com thumbnail URL", () => {
    const original = "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg";
    const result = rewriteUrl(original);
    const parsed = new URL(result);
    expect(parsed.origin).toBe(proxyBase);
    expect(parsed.pathname).toBe("/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(parsed.searchParams.get("host")).toBe("i.ytimg.com");
    expect(parsed.searchParams.get("qhash")).toMatch(/^[0-9a-f]{8}$/);
  });

  test("rewrites a ggpht.com avatar URL", () => {
    const original = "https://yt3.ggpht.com/some-avatar-path";
    const result = rewriteUrl(original);
    const parsed = new URL(result);
    expect(parsed.origin).toBe(proxyBase);
    expect(parsed.searchParams.get("host")).toBe("yt3.ggpht.com");
  });

  test("qhash is valid for the rewritten URL", () => {
    const original = "https://rr5.googlevideo.com/videoplayback?expire=9999&id=xyz";
    const rewritten = new URL(rewriteUrl(original));
    const qhash = rewritten.searchParams.get("qhash")!;

    const verifyParams = new URLSearchParams(rewritten.search);
    const expected = computeQHash(rewritten.pathname, verifyParams, secret);
    expect(qhash).toBe(expected);
  });

  test("preserves all original query params", () => {
    const original = "https://rr5.googlevideo.com/videoplayback?expire=9999&ei=abc&ip=1.2.3.4&id=o-test";
    const result = new URL(rewriteUrl(original));
    expect(result.searchParams.get("expire")).toBe("9999");
    expect(result.searchParams.get("ei")).toBe("abc");
    expect(result.searchParams.get("ip")).toBe("1.2.3.4");
    expect(result.searchParams.get("id")).toBe("o-test");
  });
});
