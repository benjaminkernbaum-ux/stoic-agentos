#!/usr/bin/env python3
"""
update_m5.py — Atualizacao rapida dos dados M5 do Profit (StoicSentinel)
=======================================================================

Cola os dados M5 copiados do ProfitChart e grava o CSV canonico que o
``sentinel/profit_bridge.py`` consome.

Uso:
    # dados como argumento (entre aspas)
    python tools/update_m5.py "29/05/2026 09:05  138500  138700  138400  138650  1234500"

    # dados do clipboard (precisa de pyperclip: pip install pyperclip)
    python tools/update_m5.py --clipboard

    # dados via stdin (cole e Ctrl-D)
    python tools/update_m5.py < dados.txt

    # gravar para outro simbolo e ja rodar a deteccao + alerta Telegram
    python tools/update_m5.py --symbol WIN --detect "<dados>"

Formato aceito (uma barra por linha), tolerante a:
    - separadores: TAB, ';', virgula ou multiplos espacos;
    - numeros pt-BR (1.234,56) ou en-US (1,234.56) ou simples (138500);
    - data dd/MM/aaaa ou aaaa-MM-dd; hora HH:MM[:SS]; ou so a hora.

A ordem das colunas numericas e Abertura, Maxima, Minima, Fechamento,
Volume (as 4 primeiras = OHLC; a 5a = volume). Maxima/minima sao
recalculadas como extremos do candle, entao eventual troca de coluna
H<->L nao quebra os dados.
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
RTD_DIR = REPO_ROOT / "sentinel" / "data" / "rtd"
CSV_HEADER = ["timestamp", "open", "high", "low", "close", "volume"]

_DATE_BR = re.compile(r"^\d{2}/\d{2}/\d{4}$")
_DATE_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_TIME = re.compile(r"^\d{1,2}:\d{2}(:\d{2})?$")
_SPLIT = re.compile(r"\t|;|\s{2,}|,(?=\s)|\s+")


# --------------------------------------------------------------------------- #
# Parsing
# --------------------------------------------------------------------------- #


def parse_number(token: str) -> float:
    """Converte numero pt-BR/en-US/simples para float."""
    s = token.strip().replace(" ", "")
    if not s:
        raise ValueError("vazio")
    has_dot = "." in s
    has_comma = "," in s
    if has_dot and has_comma:
        if s.rfind(",") > s.rfind("."):          # 1.234,56  -> virgula decimal
            s = s.replace(".", "").replace(",", ".")
        else:                                     # 1,234.56  -> ponto decimal
            s = s.replace(",", "")
    elif has_comma:                               # 138650,5  -> virgula decimal
        s = s.replace(",", ".")
    elif has_dot:
        parts = s.split(".")
        # multiplos pontos OU um ponto com 3 digitos finais => separador de milhar
        if len(parts) > 2 or (len(parts) == 2 and len(parts[1]) == 3):
            s = s.replace(".", "")
        # senao, ponto decimal (ex.: 138.5) -> mantem
    return float(s)


def is_date(tok: str) -> bool:
    return bool(_DATE_BR.match(tok) or _DATE_ISO.match(tok))


def is_time(tok: str) -> bool:
    return bool(_TIME.match(tok))


def parse_date(tok: str) -> datetime:
    if _DATE_BR.match(tok):
        return datetime.strptime(tok, "%d/%m/%Y")
    return datetime.strptime(tok, "%Y-%m-%d")


def build_timestamp(date_tok: str | None, time_tok: str | None) -> str:
    base = parse_date(date_tok) if date_tok else datetime.now()
    hh, mm, ss = 0, 0, 0
    if time_tok:
        bits = time_tok.split(":")
        hh, mm = int(bits[0]), int(bits[1])
        ss = int(bits[2]) if len(bits) > 2 else 0
    return base.replace(hour=hh, minute=mm, second=ss, microsecond=0).strftime(
        "%Y-%m-%d %H:%M:%S"
    )


def parse_rows(raw: str) -> list[dict]:
    """Converte texto colado do Profit em linhas canonicas."""
    rows: list[dict] = []
    for lineno, line in enumerate(raw.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        tokens = [t for t in _SPLIT.split(line) if t != ""]
        date_tok: str | None = None
        time_tok: str | None = None
        nums: list[float] = []
        for t in tokens:
            if is_date(t):
                date_tok = t
            elif is_time(t):
                time_tok = t
            else:
                try:
                    nums.append(parse_number(t))
                except ValueError:
                    continue  # rotulos de cabecalho (Data, Abertura, ...)
        if len(nums) < 4:
            # provavelmente cabecalho ou linha incompleta
            if any(c.isdigit() for c in line):
                print(f"[update_m5] linha {lineno} ignorada (poucos numeros): {line}",
                      file=sys.stderr)
            continue
        o, a, b, c = nums[0], nums[1], nums[2], nums[3]
        volume = nums[4] if len(nums) >= 5 else 0.0
        four = (o, a, b, c)
        rows.append(
            {
                "timestamp": build_timestamp(date_tok, time_tok),
                "open": o,
                "high": max(four),
                "low": min(four),
                "close": c,
                "volume": volume,
            }
        )
    return rows


def format_num(value: float) -> str:
    """Inteiro quando exato (pontos do WIN), senao float."""
    return str(int(value)) if float(value).is_integer() else repr(value)


def write_csv(rows: list[dict], path: Path, append: bool) -> int:
    """Grava/mescla as linhas no CSV canonico, deduplicando por timestamp."""
    path.parent.mkdir(parents=True, exist_ok=True)
    existing: dict[str, dict] = {}
    if append and path.exists():
        import csv as _csv

        with open(path, newline="", encoding="utf-8") as fh:
            for r in _csv.DictReader(fh):
                existing[r["timestamp"]] = r
    for r in rows:
        existing[r["timestamp"]] = {k: format_num(r[k]) if k != "timestamp" else r[k]
                                    for k in CSV_HEADER}
    ordered = sorted(existing.values(), key=lambda r: r["timestamp"])
    with open(path, "w", newline="", encoding="utf-8") as fh:
        import csv as _csv

        writer = _csv.DictWriter(fh, fieldnames=CSV_HEADER)
        writer.writeheader()
        writer.writerows(ordered)
    return len(ordered)


# --------------------------------------------------------------------------- #
# Entrada de dados
# --------------------------------------------------------------------------- #


def read_input(args) -> str:
    if args.data:
        return args.data
    if args.clipboard:
        return read_clipboard()
    if not sys.stdin.isatty():
        data = sys.stdin.read()
        if data.strip():
            return data
    # ultimo recurso: tentar o clipboard automaticamente
    try:
        return read_clipboard()
    except SystemExit:
        raise
    except Exception:  # noqa: BLE001
        print("[update_m5] nenhum dado fornecido. Use um argumento, "
              "--clipboard ou stdin.", file=sys.stderr)
        raise SystemExit(2)


def read_clipboard() -> str:
    try:
        import pyperclip
    except ImportError:
        print("[update_m5] pyperclip nao instalado. Rode: pip install pyperclip\n"
              "  ou passe os dados como argumento entre aspas.", file=sys.stderr)
        raise SystemExit(2)
    text = pyperclip.paste()
    if not text or not text.strip():
        print("[update_m5] clipboard vazio.", file=sys.stderr)
        raise SystemExit(2)
    return text


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Atualiza o CSV M5 a partir de dados do Profit.")
    p.add_argument("data", nargs="?", help="dados colados do Profit (entre aspas)")
    p.add_argument("--symbol", default="WIN", help="simbolo (default: WIN)")
    p.add_argument("--clipboard", action="store_true", help="ler do clipboard (pyperclip)")
    p.add_argument("--append", action="store_true",
                   help="mesclar com o CSV existente (default: sobrescreve)")
    p.add_argument("--detect", action="store_true",
                   help="rodar profit_bridge.run() apos gravar (detecta + alerta)")
    return p


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    raw = read_input(args)

    rows = parse_rows(raw)
    if not rows:
        print("[update_m5] nenhuma linha valida encontrada.", file=sys.stderr)
        return 1

    path = RTD_DIR / f"{args.symbol.upper()}_M5.csv"
    total = write_csv(rows, path, append=args.append)
    print(f"[update_m5] {len(rows)} candle(s) gravado(s) | {total} no total -> {path}")
    print(f"  intervalo: {rows[0]['timestamp']} .. {rows[-1]['timestamp']}")

    if args.detect:
        sys.path.insert(0, str(REPO_ROOT))
        from sentinel import profit_bridge

        print("[update_m5] rodando deteccao...")
        profit_bridge.run(symbol=args.symbol, file=str(path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
