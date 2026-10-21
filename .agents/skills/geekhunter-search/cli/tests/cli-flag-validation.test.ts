import { describe, expect, test } from "bun:test";
import { runCLI } from "./helpers";

// Todos estes casos falham antes de qualquer pedido à rede.
async function expectBadArg(args: string[], code: string, fragment?: string) {
  const r = await runCLI(args);
  expect(r.exitCode).toBe(1);
  expect(r.stdout).toBe("");
  const err = JSON.parse(r.stderr);
  expect(err.code).toBe(code);
  if (fragment) expect(err.error).toContain(fragment);
}

describe("validação de opções", () => {
  test("opção desconhecida nunca é ignorada", async () => {
    await expectBadArg(["search", "-q", "analista", "--cidade", "Recife"], "UNKNOWN_FLAG", "--cidade");
  });

  test("busca sem --query", async () => {
    await expectBadArg(["search", "--page", "2"], "MISSING_QUERY");
  });

  test("--query vazio", async () => {
    await expectBadArg(["search", "-q"], "BAD_ARG", "--query");
  });

  test("--limit acima do máximo do portal", async () => {
    await expectBadArg(["search", "-q", "analista", "--limit", "500"], "BAD_ARG", "--limit");
  });

  test("--jobage fracionado não vira 0 em silêncio", async () => {
    await expectBadArg(["search", "-q", "analista", "--jobage", "0.5"], "BAD_ARG", "--jobage");
  });

  test("--format inválido", async () => {
    await expectBadArg(["search", "-q", "analista", "--format", "csv"], "BAD_ARG", "--format");
  });

  test("detail sem referência", async () => {
    await expectBadArg(["detail"], "NO_ID");
  });

  test("detail com host de outro site", async () => {
    await expectBadArg(["detail", "https://example.com/vaga/1"], "BAD_ID");
  });

  test("comando desconhecido", async () => {
    await expectBadArg(["buscar"], "BAD_CMD");
  });
});
