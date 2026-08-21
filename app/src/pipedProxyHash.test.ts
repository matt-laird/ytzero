import { describe, expect, test } from "bun:test";
import { computeQHash } from "./pipedProxyHash";

describe("computeQHash", () => {
  const secret = "test_secret";

  test("produces an 8-character hex string", () => {
    const params = new URLSearchParams([["host", "rr5.googlevideo.com"], ["expire", "9999"]]);
    const hash = computeQHash("/videoplayback", params, secret);
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  test("excludes qhash, range and rewrite params from the hash", () => {
    const base = new URLSearchParams([["host", "rr5.googlevideo.com"], ["expire", "9999"]]);
    const withExcluded = new URLSearchParams([
      ["host", "rr5.googlevideo.com"],
      ["expire", "9999"],
      ["qhash", "12345678"],
      ["range", "0-1024"],
      ["rewrite", "false"],
    ]);
    expect(computeQHash("/videoplayback", withExcluded, secret))
      .toBe(computeQHash("/videoplayback", base, secret));
  });

  test("is deterministic for the same inputs", () => {
    const params = new URLSearchParams([["host", "example.com"], ["id", "abc"]]);
    const a = computeQHash("/test", params, secret);
    const b = computeQHash("/test", params, secret);
    expect(a).toBe(b);
  });

  test("differs when the secret changes", () => {
    const params = new URLSearchParams([["host", "rr5.googlevideo.com"]]);
    const a = computeQHash("/videoplayback", params, "secret_a");
    const b = computeQHash("/videoplayback", params, "secret_b");
    expect(a).not.toBe(b);
  });

  test("differs when params change", () => {
    const a = computeQHash("/videoplayback", new URLSearchParams([["host", "a.com"]]), secret);
    const b = computeQHash("/videoplayback", new URLSearchParams([["host", "b.com"]]), secret);
    expect(a).not.toBe(b);
  });

  test("truncates path before /range/ marker", () => {
    const params = new URLSearchParams([["host", "rr5.googlevideo.com"]]);
    const withRange = computeQHash("/videoplayback/range/0-1024", params, secret);
    const withoutRange = computeQHash("/videoplayback/", params, secret);
    expect(withRange).toBe(withoutRange);
  });

  test("uses full path when no /range/ marker", () => {
    const params = new URLSearchParams([["host", "rr5.googlevideo.com"]]);
    const a = computeQHash("/videoplayback", params, secret);
    const b = computeQHash("/other", params, secret);
    expect(a).not.toBe(b);
  });

  test("sorts params by key then value", () => {
    const forward = new URLSearchParams([["a", "1"], ["b", "2"]]);
    const reversed = new URLSearchParams([["b", "2"], ["a", "1"]]);
    expect(computeQHash("/p", forward, secret)).toBe(computeQHash("/p", reversed, secret));
  });
});
