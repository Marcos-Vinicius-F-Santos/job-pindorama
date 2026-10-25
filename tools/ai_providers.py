#!/usr/bin/env python3
"""Provedores de IA do job-pindorama: Gemini, OpenAI/ChatGPT e Claude, à escolha da pessoa.

Cada provedor roda por uma de duas vias, e a pessoa escolhe a que quiser:

  * API (chave no `.env`): Google AI Studio, OpenAI (ou qualquer servidor compatível,
    como Ollama ou OpenRouter, pelo OPENAI_BASE_URL) e Anthropic Messages;
  * CLI já instalada e logada no computador: Antigravity (`agy`), Codex (`codex`) ou
    Claude Code (`claude`), sem chave nenhuma.

A configuração mora no `.env` (fora do git) e é editada pela aba "Configurações" do
painel (`save_settings`). Ordem de leitura de cada variável: `.env`, depois o ambiente
do sistema. Assim, o que a pessoa salva na tela vale de imediato.

Só biblioteca padrão: o painel não pode depender de `pip install`.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"

AUTO = "auto"
OPENAI_DEFAULT_BASE = "https://api.openai.com/v1"
MAX_OUTPUT_TOKENS = 8192
RETRY_DELAYS = (2, 6)  # segundos antes da 2ª e da 3ª tentativa (429 e 5xx)
# O `agy` recebe o pedido na linha de comando; o Windows corta em ~32 mil caracteres.
MAX_ARGV_CHARS = 28_000 if os.name == "nt" else 120_000

SPECS: dict[str, dict[str, Any]] = {
    "openai": {
        "label": "OpenAI (ChatGPT)", "short": "ChatGPT", "aliases": ("gpt", "codex", "chatgpt"),
        "key_var": "OPENAI_API_KEY", "model_var": "OPENAI_MODEL", "default_model": "gpt-4o-mini",
        "base_var": "OPENAI_BASE_URL",
        "suggested": ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "o3-mini"],
        "cli": "Codex (codex)", "key_url": "https://platform.openai.com/api-keys",
    },
    "gemini": {
        "label": "Google Gemini", "short": "Gemini", "aliases": ("google",),
        "key_var": "GEMINI_API_KEY", "model_var": "GEMINI_MODEL", "default_model": "gemini-3.8-flash",
        "suggested": ["gemini-3.8-flash", "gemini-3.8-pro", "gemini-3.8-flash-lite", "gemini-2.5-flash"],
        "cli": "Antigravity (agy)", "key_url": "https://aistudio.google.com/app/apikey",
    },
    "claude": {
        "label": "Anthropic Claude", "short": "Claude", "aliases": ("anthropic",),
        "key_var": "ANTHROPIC_API_KEY", "model_var": "ANTHROPIC_MODEL", "default_model": "claude-haiku-4-5",
        "suggested": ["claude-haiku-4-5", "claude-sonnet-4-5", "claude-opus-4-1"],
        "cli": "Claude Code (claude)", "key_url": "https://console.anthropic.com/settings/keys",
    },
}
PROVIDER_IDS = tuple(SPECS)

MODEL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,99}$")
KEY_RE = re.compile(r"^[A-Za-z0-9_\-.=+/]{8,400}$")


class ProviderError(RuntimeError):
    """Falha ao falar com o provedor; a mensagem já é segura para mostrar na tela."""


# ---------------------------------------------------------------------------
# .env
# ---------------------------------------------------------------------------

def load_env_file(path: Path | None = None) -> dict[str, str]:
    """Lê as variáveis do .env (sem tocar no ambiente do sistema)."""
    path = path or ENV_PATH
    config: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            if line.startswith("export "):
                line = line[7:]
            k, v = line.split("=", 1)
            config[k.strip()] = v.strip().strip("\"'")
    return config


def _setting(env: dict[str, str], name: str, default: str = "") -> str:
    return (env.get(name) or os.environ.get(name) or default).strip()


def _write_env(updates: dict[str, str | None], path: Path) -> None:
    """Grava `updates` no .env sem mexer nas outras linhas; None apaga o valor.

    Escrita atômica e, onde o sistema permite, só o dono lê o arquivo.
    """
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines() if path.exists() else []
    pending = dict(updates)
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        name = stripped.split("=", 1)[0].strip() if "=" in stripped and not stripped.startswith("#") else None
        if name in pending:
            value = pending.pop(name)
            out.append(f"{name}={value or ''}")
        else:
            out.append(line)
    if pending:
        if out and out[-1].strip():
            out.append("")
        if not lines:
            out.append("# Configurações de IA do painel (editadas pela aba Configurações). Este arquivo nunca vai para o git.")
        for name, value in pending.items():
            out.append(f"{name}={value or ''}")
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text("\n".join(out) + "\n", encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    os.replace(tmp, path)


# ---------------------------------------------------------------------------
# Provedores
# ---------------------------------------------------------------------------

def _scrub(text: str, *secrets: str) -> str:
    for s in secrets:
        if s and len(s) >= 6:
            text = text.replace(s, "***")
    return text


def _post_json(url: str, headers: dict[str, str], payload: dict, timeout: int, secrets: tuple[str, ...] = ()) -> dict:
    """POST JSON com nova tentativa em 429/5xx. Nunca deixa a chave aparecer na mensagem de erro."""
    data = json.dumps(payload).encode("utf-8")
    last = "sem resposta"
    for attempt in range(len(RETRY_DELAYS) + 1):
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **headers}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - URL fixa ou definida pela própria pessoa
                return json.loads(resp.read().decode("utf-8", errors="replace"))
        except urllib.error.HTTPError as exc:
            body = _scrub(exc.read().decode("utf-8", errors="replace")[-500:], *secrets)
            last = f"HTTP {exc.code}: {body}"
            if exc.code not in (429, 500, 502, 503, 504):
                raise ProviderError(last) from None
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last = _scrub(str(getattr(exc, "reason", exc)), *secrets)
        except json.JSONDecodeError:
            raise ProviderError("o provedor devolveu uma resposta que não é JSON") from None
        if attempt < len(RETRY_DELAYS):
            time.sleep(RETRY_DELAYS[attempt])
    raise ProviderError(f"falha ao falar com o provedor após novas tentativas ({last})")


class UnconfiguredProvider:
    """Representa a ausência de um provedor de IA configurado."""

    name = "none"
    model = "none"
    mode = "none"
    api_key = ""
    base_url = ""
    cli_bin = None
    custom_endpoint = False

    def __init__(self, env: dict[str, str] | None = None) -> None:
        self.env = env or {}
        self.spec = {
            "label": "Nenhuma IA configurada",
            "short": "Nenhum",
            "cli": "nenhum",
            "key_var": "",
            "model_var": "",
            "default_model": "none",
            "suggested": [],
            "key_url": "",
        }

    def is_available(self) -> bool:
        return False

    def get_info(self) -> dict[str, str]:
        return {
            "provider": "none",
            "name": "Nenhum",
            "mode": "none",
            "model": "none",
            "label": "Nenhuma IA configurada",
        }

    def generate(self, prompt: str, system_instruction: str | None = None,
                 temperature: float = 0.2, timeout: int = 120) -> str:
        raise ProviderError(
            "Nenhum provedor de IA configurado: copie .env.example para .env e informe suas credenciais, "
            "ou configure o provedor na aba Configurações."
        )


class Provider:
    """Um provedor de IA: API com chave, ou CLI local quando não há chave."""

    def __init__(self, provider_id: str, env: dict[str, str] | None = None) -> None:
        if provider_id not in SPECS:
            raise ValueError(f"provedor desconhecido: {provider_id}")
        self.name = provider_id
        self.spec = SPECS[provider_id]
        self.env = load_env_file() if env is None else env
        self.api_key = _setting(self.env, self.spec["key_var"])
        self.model = _setting(self.env, self.spec["model_var"], self.spec["default_model"])
        base_var = self.spec.get("base_var")
        self.base_url = (_setting(self.env, base_var) or OPENAI_DEFAULT_BASE).rstrip("/") if base_var else ""
        self.cli_bin = self._find_cli()

    # -- descoberta ---------------------------------------------------------

    def _find_cli(self) -> str | None:
        bin_names = {"openai": "codex", "claude": "claude", "gemini": "agy"}
        cmd = bin_names.get(self.name)
        return shutil.which(cmd) if cmd else None

    @property
    def custom_endpoint(self) -> bool:
        return bool(self.base_url) and self.base_url != OPENAI_DEFAULT_BASE

    @property
    def mode(self) -> str:
        if len(self.api_key) > 5 or self.custom_endpoint:
            return "api_key"
        return "cli" if self.cli_bin else "none"

    def is_available(self) -> bool:
        return self.mode != "none"

    def get_info(self) -> dict[str, str]:
        mode = self.mode
        short = self.spec["short"]
        if mode == "api_key":
            via = "API própria" if self.custom_endpoint else "API"
            label, model = f"{self.spec['label']} ({self.model} via {via})", self.model
        elif mode == "cli":
            label, model = f"{self.spec['label']} ({self.spec['cli']})", "cli"
        else:
            label, model = f"{self.spec['label']} (não configurado)", "none"
        return {"provider": self.name, "name": short, "mode": mode, "model": model, "label": label}

    # -- geração ------------------------------------------------------------

    def generate(self, prompt: str, system_instruction: str | None = None,
                 temperature: float = 0.2, timeout: int = 120) -> str:
        mode = self.mode
        if mode == "none":
            raise ProviderError(
                f"{self.spec['label']} não está configurado: abra a aba Configurações e informe a chave de API, "
                f"ou instale e entre no {self.spec['cli']}.")
        if mode == "cli":
            return self._generate_cli(prompt, system_instruction, timeout)
        if not MODEL_RE.match(self.model):
            raise ProviderError(f"nome de modelo inválido: {self.model!r}")
        if self.name == "gemini":
            return self._generate_gemini(prompt, system_instruction, temperature, timeout)
        if self.name == "openai":
            return self._generate_openai(prompt, system_instruction, temperature, timeout)
        return self._generate_claude(prompt, system_instruction, temperature, timeout)

    def _generate_cli(self, prompt: str, system: str | None, timeout: int) -> str:
        full = (f"{system}\n\n" if system else "") + prompt
        stdin: bytes | None = full.encode("utf-8")
        if self.name == "gemini":
            if len(full) > MAX_ARGV_CHARS:
                raise ProviderError(
                    "o pedido é grande demais para o Antigravity CLI (ele só aceita texto na linha de comando); "
                    "informe uma GEMINI_API_KEY em Configurações para usar a API")
            cmd, stdin = [self.cli_bin, f"--print={full}"], None
        elif self.name == "openai":
            cmd = [self.cli_bin, "exec", "--skip-git-repo-check", "-"]
        else:
            cmd = [self.cli_bin, "-p"]
        # Pasta vazia: o agente não enxerga nem herda as permissões deste projeto. O pedido
        # contém texto de terceiros (a vaga) e não pode virar uma instrução com acesso aos arquivos.
        with tempfile.TemporaryDirectory(prefix="pindorama_ia_") as cwd:
            try:
                proc = subprocess.run(cmd, input=stdin, capture_output=True, cwd=cwd, timeout=timeout,
                                      env={**os.environ, "PYTHONIOENCODING": "utf-8"})
            except subprocess.TimeoutExpired:
                raise ProviderError(f"o {self.spec['cli']} passou do tempo limite ({timeout}s)") from None
            except OSError as exc:
                raise ProviderError(f"não consegui executar o {self.spec['cli']}: {exc}") from None
        out = proc.stdout.decode("utf-8", errors="replace").strip()
        if proc.returncode == 0 and out:
            return out
        err = proc.stderr.decode("utf-8", errors="replace").strip() or out or f"código {proc.returncode}"
        raise ProviderError(f"erro no {self.spec['cli']}: {err[-500:]}")

    def _generate_gemini(self, prompt: str, system: str | None, temperature: float, timeout: int) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        payload: dict[str, Any] = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": MAX_OUTPUT_TOKENS},
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}
        # A chave vai no cabeçalho: na URL ela cairia em logs e mensagens de erro.
        data = _post_json(url, {"x-goog-api-key": self.api_key}, payload, timeout, (self.api_key,))
        candidates = data.get("candidates") or []
        if not candidates:
            reason = (data.get("promptFeedback") or {}).get("blockReason")
            raise ProviderError(f"o Gemini não devolveu resposta{f' (bloqueado: {reason})' if reason else ''}")
        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
        if not text:
            raise ProviderError("a resposta do Gemini veio vazia")
        return text

    def _generate_openai(self, prompt: str, system: str | None, temperature: float, timeout: int) -> str:
        if not re.match(r"^https://|^http://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(/|$)", self.base_url):
            raise ProviderError("OPENAI_BASE_URL precisa ser https:// (ou http:// só para localhost)")
        messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
        payload: dict[str, Any] = {"model": self.model, "messages": messages}
        # Modelos de raciocínio (o1/o3, gpt-5) só aceitam a temperatura padrão e `max_completion_tokens`.
        if not re.match(r"^(o\d|gpt-5)", self.model):
            payload["temperature"] = temperature
        payload["max_completion_tokens" if not self.custom_endpoint else "max_tokens"] = MAX_OUTPUT_TOKENS
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        data = _post_json(f"{self.base_url}/chat/completions", headers, payload, timeout, (self.api_key,))
        choices = data.get("choices") or []
        content = (choices[0].get("message") or {}).get("content") if choices else None
        if isinstance(content, list):
            content = "".join(c.get("text", "") for c in content if isinstance(c, dict))
        if not content or not str(content).strip():
            raise ProviderError("a resposta da OpenAI veio vazia")
        return str(content).strip()

    def _generate_claude(self, prompt: str, system: str | None, temperature: float, timeout: int) -> str:
        payload: dict[str, Any] = {
            "model": self.model, "max_tokens": MAX_OUTPUT_TOKENS, "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            payload["system"] = system
        headers = {"x-api-key": self.api_key, "anthropic-version": "2023-06-01"}
        data = _post_json("https://api.anthropic.com/v1/messages", headers, payload, timeout, (self.api_key,))
        text = "".join(b.get("text", "") for b in data.get("content") or [] if isinstance(b, dict)).strip()
        if not text:
            raise ProviderError("a resposta do Claude veio vazia")
        return text


# ---------------------------------------------------------------------------
# Escolha do provedor ativo
# ---------------------------------------------------------------------------

def normalize_provider(value: str | None) -> str:
    """'gemini' | 'openai' | 'claude' | 'auto' (vazio ou desconhecido = auto)."""
    v = (value or "").strip().lower()
    for pid, spec in SPECS.items():
        if v == pid or v in spec["aliases"]:
            return pid
    return AUTO


def get_ai_provider(env: dict[str, str] | None = None) -> Provider | UnconfiguredProvider:
    """O provedor escolhido em Configurações; no automático, o primeiro com chave, depois com CLI."""
    env = load_env_file() if env is None else env
    providers = {pid: Provider(pid, env) for pid in PROVIDER_IDS}
    requested = normalize_provider(_setting(env, "AI_PROVIDER"))
    if requested != AUTO:
        return providers[requested]
    for pid in PROVIDER_IDS:
        if providers[pid].mode == "api_key":
            return providers[pid]
    for pid in PROVIDER_IDS:
        if providers[pid].is_available():
            return providers[pid]
    return UnconfiguredProvider(env)


# ---------------------------------------------------------------------------
# Tela de configurações
# ---------------------------------------------------------------------------

def _hint(key: str) -> str:
    return ("••••" + key[-4:]) if len(key) >= 12 else ("••••" if key else "")


def public_settings(env: dict[str, str] | None = None) -> dict:
    """O que a tela pode ver: nunca a chave inteira, só se existe e os 4 últimos caracteres."""
    env = load_env_file() if env is None else env
    active = get_ai_provider(env)
    rows = []
    for pid in PROVIDER_IDS:
        p = Provider(pid, env)
        rows.append({
            "id": pid, "label": p.spec["label"], "short": p.spec["short"], "model": p.model,
            "default_model": p.spec["default_model"], "suggested_models": p.spec["suggested"],
            "has_key": bool(p.api_key), "key_hint": _hint(p.api_key), "key_url": p.spec["key_url"],
            "cli_name": p.spec["cli"], "cli_found": bool(p.cli_bin), "mode": p.mode,
            "base_url": p.base_url if p.custom_endpoint else "",
            "supports_base_url": "base_var" in p.spec,
        })
    return {
        "provider": normalize_provider(_setting(env, "AI_PROVIDER")),
        "consent": _setting(env, "AI_DATA_CONSENT").lower() in ("1", "true", "yes", "sim"),
        "active": active.get_info(),
        "providers": rows,
    }


def has_consent(env: dict[str, str] | None = None) -> bool:
    return public_settings(env)["consent"]


def save_settings(data: dict, path: Path | None = None) -> dict:
    """Valida e grava as escolhas da tela no .env; devolve `public_settings`.

    `data`: {"provider": "auto|gemini|openai|claude", "consent": bool,
             "providers": {"gemini": {"model": str, "api_key": str, "clear_key": bool, "base_url": str}}}
    Chave vazia mantém a que já está salva; `clear_key` apaga.
    """
    path = path or ENV_PATH
    updates: dict[str, str | None] = {}
    if "provider" in data:
        choice = str(data["provider"]).strip().lower()
        if choice != AUTO and normalize_provider(choice) == AUTO:
            raise ValueError(f"provedor desconhecido: {choice}")
        updates["AI_PROVIDER"] = choice
    if "consent" in data:
        updates["AI_DATA_CONSENT"] = "yes" if data["consent"] is True else ""
    per = data.get("providers") or {}
    if not isinstance(per, dict):
        raise ValueError("formato inválido em providers")
    for pid, cfg in per.items():
        if pid not in SPECS or not isinstance(cfg, dict):
            raise ValueError(f"provedor desconhecido: {pid}")
        spec = SPECS[pid]
        model = str(cfg.get("model") or "").strip()
        if model:
            if not MODEL_RE.match(model):
                raise ValueError(f"nome de modelo inválido para {spec['label']}")
            updates[spec["model_var"]] = model
        key = str(cfg.get("api_key") or "").strip()
        if cfg.get("clear_key") is True:
            updates[spec["key_var"]] = None
        elif key:
            if not KEY_RE.match(key):
                raise ValueError(f"a chave de {spec['label']} tem caracteres inválidos ou tamanho estranho")
            updates[spec["key_var"]] = key
        if "base_var" in spec and "base_url" in cfg:
            base = str(cfg.get("base_url") or "").strip().rstrip("/")
            if base and not re.match(r"^https://[^\s\"'#]+$|^http://(localhost|127\.0\.0\.1)(:\d+)?(/[^\s\"'#]*)?$", base):
                raise ValueError("o endereço da API precisa começar com https:// (ou http://localhost)")
            updates[spec["base_var"]] = base
    if updates:
        _write_env(updates, path)
    return public_settings(load_env_file(path))


def check_connection(provider_id: str | None = None, env: dict[str, str] | None = None) -> dict:
    """Manda um pedido mínimo para ver se o provedor responde. Gasta uns poucos tokens."""
    env = load_env_file() if env is None else env
    provider = Provider(normalize_provider(provider_id), env) if normalize_provider(provider_id) != AUTO \
        else get_ai_provider(env)
    started = time.time()
    try:
        reply = provider.generate("Responda apenas com a palavra OK.", temperature=0.0, timeout=45)
    except (ProviderError, ValueError) as exc:
        return {"ok": False, "message": str(exc), "info": provider.get_info()}
    return {"ok": True, "message": f"Respondeu em {time.time() - started:.1f}s: {reply[:60]}", "info": provider.get_info()}
