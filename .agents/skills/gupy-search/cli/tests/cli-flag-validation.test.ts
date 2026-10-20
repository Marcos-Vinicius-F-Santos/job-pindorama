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
    await expectBadArg(["search", "--state", "SP"], "MISSING_QUERY");
  });

  test("--query vazio", async () => {
    await expectBadArg(["search", "-q"], "BAD_ARG", "--query");
  });

  test("estado inexistente", async () => {
    await expectBadArg(["search", "-q", "analista", "--state", "XX"], "BAD_ARG", "não é um estado");
  });

  test("lista em --type é recusada (a Gupy ignoraria o filtro)", async () => {
    await expectBadArg(["search", "-q", "analista", "--type", "clt,pj"], "BAD_ARG", "um valor só");
  });

  test("regime desconhecido", async () => {
    await expectBadArg(["search", "-q", "analista", "--type", "cooperado"], "BAD_ARG", "desconhecido");
  });

  test("lista em --remote é recusada", async () => {
    await expectBadArg(["search", "-q", "analista", "--remote", "remoto,hibrido"], "BAD_ARG", "um valor só");
  });

  test("modo de trabalho desconhecido", async () => {
    await expectBadArg(["search", "-q", "analista", "--remote", "nuvem"], "BAD_ARG", "remoto|hibrido|presencial");
  });

  test("--limit acima de 100", async () => {
    await expectBadArg(["search", "-q", "analista", "--limit", "500"], "BAD_ARG", "entre 1 e 100");
  });

  test("--jobage fracionado não vira 0 em silêncio", async () => {
    await expectBadArg(["search", "-q", "analista", "--jobage", "0.5"], "BAD_ARG", "--jobage");
  });

  test("--format inválido", async () => {
    await expectBadArg(["search", "-q", "analista", "--format", "csv"], "BAD_ARG", "--format");
  });

  test("detail sem URL", async () => {
    await expectBadArg(["detail"], "NO_ID");
  });

  test("detail com host de fora da Gupy", async () => {
    await expectBadArg(["detail", "https://example.com/jobs/1"], "BAD_ID");
  });

  test("comando desconhecido", async () => {
    await expectBadArg(["buscar"], "BAD_CMD");
  });
});
