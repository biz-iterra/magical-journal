import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyLineSignature } from "../signature.js";

const SECRET = "test-channel-secret";

/** テスト用に正しい署名(Base64 HMAC-SHA256)を作る。 */
function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

describe("verifyLineSignature", () => {
  const body = JSON.stringify({ events: [{ type: "message" }] });

  it("正しい署名を accept する", () => {
    const sig = sign(SECRET, body);
    expect(verifyLineSignature(SECRET, body, sig)).toBe(true);
  });

  it("ボディ改竄を reject する", () => {
    const sig = sign(SECRET, body);
    const tampered = `${body} `;
    expect(verifyLineSignature(SECRET, tampered, sig)).toBe(false);
  });

  it("別シークレットで作った署名を reject する", () => {
    const sig = sign("wrong-secret", body);
    expect(verifyLineSignature(SECRET, body, sig)).toBe(false);
  });

  it("署名ヘッダが無ければ reject する", () => {
    expect(verifyLineSignature(SECRET, body, undefined)).toBe(false);
    expect(verifyLineSignature(SECRET, body, null)).toBe(false);
  });

  it("シークレット未設定なら reject する", () => {
    const sig = sign(SECRET, body);
    expect(verifyLineSignature("", body, sig)).toBe(false);
  });

  it("長さの異なる署名でも例外を投げずに reject する", () => {
    expect(verifyLineSignature(SECRET, body, "short")).toBe(false);
  });
});
