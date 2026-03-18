import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hexToBytes } from "./auth.ts";

Deno.test("hexToBytes: valid hex string", () => {
  const result = hexToBytes("48656c6c6f");
  assertEquals(result, new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
});

Deno.test("hexToBytes: uppercase hex", () => {
  const result = hexToBytes("FF00AB");
  assertEquals(result, new Uint8Array([0xff, 0x00, 0xab]));
});

Deno.test("hexToBytes: mixed case hex", () => {
  const result = hexToBytes("aAbBcC");
  assertEquals(result, new Uint8Array([0xaa, 0xbb, 0xcc]));
});

Deno.test("hexToBytes: empty string returns empty array", () => {
  const result = hexToBytes("");
  assertEquals(result, null);
});

Deno.test("hexToBytes: odd length returns null", () => {
  const result = hexToBytes("abc");
  assertEquals(result, null);
});

Deno.test("hexToBytes: non-hex characters returns null", () => {
  const result = hexToBytes("gg1122");
  assertEquals(result, null);
});

Deno.test("hexToBytes: single byte", () => {
  const result = hexToBytes("ff");
  assertEquals(result, new Uint8Array([255]));
});
