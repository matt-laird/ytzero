import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const EXCLUDED_PARAMS = new Set(["qhash", "range", "rewrite"]);
const RANGE_MARKER = "/range/";

export function computeQHash(path: string, params: URLSearchParams, secret: string): string {
  const sorted: [string, string][] = [];
  for (const [key, value] of params) {
    if (!EXCLUDED_PARAMS.has(key)) sorted.push([key, value]);
  }
  sorted.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  for (const [key, value] of sorted) {
    parts.push(encoder.encode(key));
    parts.push(encoder.encode(value));
  }

  const rangeIndex = path.indexOf(RANGE_MARKER);
  const hashPath = rangeIndex !== -1 ? path.slice(0, rangeIndex + 1) : path;
  parts.push(encoder.encode(hashPath));
  parts.push(encoder.encode(secret));

  const hasher = blake3.create({});
  for (const part of parts) hasher.update(part);
  return bytesToHex(hasher.digest()).slice(0, 8);
}
