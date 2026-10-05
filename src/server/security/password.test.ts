import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("Verificação de senha", () => {
  it("aceita senha correta e rejeita senha incorreta", async () => {
    const hash = await hashPassword("SenhaForte123");
    expect(await verifyPassword("SenhaForte123", hash)).toBe(true);
    expect(await verifyPassword("OutraSenha123", hash)).toBe(false);
  });
  it.each(["invalido", "scrypt$NaN$8$1$salt$key", "scrypt$1073741824$8$1$salt$key", "scrypt$16384$8$1$salt$a", "scrypt$16384$8$0$salt$key"])("hash corrompido falha sem derrubar login: %s", async (hash) => {
    await expect(verifyPassword("SenhaForte123", hash)).resolves.toBe(false);
  });
});
