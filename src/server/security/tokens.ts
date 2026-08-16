import { createHash, randomBytes } from "node:crypto";

export function gerarTokenSeguro(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
