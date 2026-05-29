#!/usr/bin/env python3
"""
profit_bridge.py — Ponte ProfitChart -> Python -> Telegram (StoicSentinel)
==========================================================================

Componente 2 da arquitetura hibrida. Enquanto os indicadores NTSL
(StoicSweep_*) mostram os sweeps AO VIVO dentro do Profit, este modulo
le os dados M5 exportados pelo Profit (CSV em ``sentinel/data/rtd/``),
roda EXATAMENTE a mesma logica de deteccao de sweeps e dispara alertas
no Telegram.

Fluxo:
    Profit (export M5)  ->  sentinel/data/rtd/<SYMBOL>_M5.csv
                        ->  profit_bridge.detect_sweeps()
                        ->  Telegram

A logica de deteccao espelha ``sentinel/ntsl/StoicSweep_Detector.src``:

    SWEEP VENDA : High > PDH  e  Close < PDH
    SWEEP COMPRA: Low  < PDL  e  Close > PDL

com os mesmos filtros (vies D1, spike de volume, RSI, razao de pavio) e
o mesmo placar de conviccao (0..100) do StoicSweep_Screener.

Sem dependencias externas (somente biblioteca padrao).

Uso:
    python -m sentinel.profit_bridge --symbol WIN
    python sentinel/profit_bridge.py --file sentinel/data/rtd/WIN_M5.csv --all
    python sentinel/profit_bridge.py --symbol WIN --json
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional

# --------------------------------------------------------------------------- #
# Caminhos
# --------------------------------------------------------------------------- #

RTD_DIR = Path(__file__).resolve().parent / "data" / "rtd"
STATE_FILE = RTD_DIR / ".alert_state.json"
LEVELS_FILE = RTD_DIR / "levels.json"

CSV_HEADER = ["timestamp", "open", "high", "low", "close", "volume"]


# --------------------------------------------------------------------------- #
# Modelos
# --------------------------------------------------------------------------- #


@dataclass
class Candle:
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass
class Levels:
    """Niveis de referencia do dia anterior (lidos do indicador de niveis)."""

    symbol: str = ""
    pdh: Optional[float] = None  # Previous Day High
    pdl: Optional[float] = None  # Previous Day Low
    pdc: Optional[float] = None  # Previous Day Close
    bias: str = "unknown"        # "long" | "short" | "neutral" | "unknown"


@dataclass
class DetectorConfig:
    """Mesmos defaults do StoicSweep_Detector.src."""

    use_bias: bool = True
    use_volume: bool = True
    volume_period: int = 20
    volume_factor: float = 1.5
    use_rsi: bool = False
    rsi_period: int = 9
    rsi_oversold: float = 30.0
    rsi_overbought: float = 70.0
    use_wick: bool = True
    wick_ratio: float = 0.5


@dataclass
class Sweep:
    index: int
    timestamp: str
    direction: str          # "BUY" | "SELL"
    level_name: str         # "PDL" | "PDH"
    level: float
    price: float            # fechamento do candle
    conviction: int         # 0..100
    filters: dict = field(default_factory=dict)

    @property
    def key(self) -> str:
        return f"{self.timestamp}|{self.direction}|{self.level_name}"


# --------------------------------------------------------------------------- #
# Indicadores (espelham as funcoes NTSL)
# --------------------------------------------------------------------------- #


def wilder_rsi(closes: list[float], period: int) -> list[Optional[float]]:
    """RSI classico (Wilder) — equivalente a RSI(period, 0) no NTSL."""
    n = len(closes)
    rsi: list[Optional[float]] = [None] * n
    if n <= period:
        return rsi

    gains = 0.0
    losses = 0.0
    for i in range(1, period + 1):
        delta = closes[i] - closes[i - 1]
        gains += max(delta, 0.0)
        losses += max(-delta, 0.0)
    avg_gain = gains / period
    avg_loss = losses / period
    rsi[period] = _rsi_from_avg(avg_gain, avg_loss)

    for i in range(period + 1, n):
        delta = closes[i] - closes[i - 1]
        gain = max(delta, 0.0)
        loss = max(-delta, 0.0)
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        rsi[i] = _rsi_from_avg(avg_gain, avg_loss)
    return rsi


def _rsi_from_avg(avg_gain: float, avg_loss: float) -> float:
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def trailing_mean(values: list[float], period: int) -> list[float]:
    """Media movel simples 'ate o candle' — equivalente a Media(period, serie).

    Antes de haver ``period`` amostras, usa a media das amostras disponiveis
    (mesmo comportamento pragmatico do warm-up de uma media no Profit).
    """
    out: list[float] = []
    acc = 0.0
    window: list[float] = []
    for v in values:
        window.append(v)
        acc += v
        if len(window) > period:
            acc -= window.pop(0)
        out.append(acc / len(window))
    return out


# --------------------------------------------------------------------------- #
# Leitura de dados
# --------------------------------------------------------------------------- #


def load_candles(path: Path) -> list[Candle]:
    """Le um CSV canonico (timestamp,open,high,low,close,volume)."""
    candles: list[Candle] = []
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        missing = [c for c in CSV_HEADER if c not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(
                f"CSV {path} sem as colunas {missing}. "
                f"Esperado: {','.join(CSV_HEADER)}"
            )
        for row in reader:
            try:
                candles.append(
                    Candle(
                        timestamp=row["timestamp"].strip(),
                        open=float(row["open"]),
                        high=float(row["high"]),
                        low=float(row["low"]),
                        close=float(row["close"]),
                        volume=float(row["volume"] or 0),
                    )
                )
            except (ValueError, KeyError) as exc:
                print(f"[profit_bridge] linha ignorada ({exc}): {row}", file=sys.stderr)
    candles.sort(key=lambda c: c.timestamp)
    return candles


def default_csv_for(symbol: str) -> Path:
    return RTD_DIR / f"{symbol.upper()}_M5.csv"


def load_levels(symbol: str) -> Levels:
    """Le ``levels.json`` (gerado a partir do StoicSweep_Levels). Se ausente,
    retorna niveis vazios — a deteccao cai para a derivacao automatica."""
    if not LEVELS_FILE.exists():
        return Levels(symbol=symbol.upper())
    try:
        data = json.loads(LEVELS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"[profit_bridge] levels.json invalido: {exc}", file=sys.stderr)
        return Levels(symbol=symbol.upper())
    return Levels(
        symbol=str(data.get("symbol", symbol)).upper(),
        pdh=_as_float(data.get("pdh")),
        pdl=_as_float(data.get("pdl")),
        pdc=_as_float(data.get("pdc")),
        bias=str(data.get("bias", "unknown")).lower(),
    )


def _as_float(value) -> Optional[float]:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def derive_levels_from_first_session(candles: list[Candle]) -> Optional[Levels]:
    """Fallback: se nao houver levels.json e o CSV contiver mais de uma data,
    usa a primeira data como 'dia anterior' (PDH/PDL/PDC)."""
    by_day: dict[str, list[Candle]] = {}
    for c in candles:
        day = c.timestamp[:10]
        by_day.setdefault(day, []).append(c)
    if len(by_day) < 2:
        return None
    first_day = sorted(by_day)[0]
    bars = by_day[first_day]
    return Levels(
        symbol="",
        pdh=max(b.high for b in bars),
        pdl=min(b.low for b in bars),
        pdc=bars[-1].close,
        bias="unknown",
    )


def session_candles(candles: list[Candle]) -> list[Candle]:
    """Retorna apenas os candles da ultima data presente no CSV (sessao atual)."""
    if not candles:
        return []
    last_day = candles[-1].timestamp[:10]
    return [c for c in candles if c.timestamp[:10] == last_day]


# --------------------------------------------------------------------------- #
# Deteccao de sweeps (espelha StoicSweep_Detector.src)
# --------------------------------------------------------------------------- #


def detect_sweeps(
    candles: list[Candle],
    levels: Levels,
    config: Optional[DetectorConfig] = None,
) -> list[Sweep]:
    config = config or DetectorConfig()
    if levels.pdh is None or levels.pdl is None:
        return []

    pdh, pdl = levels.pdh, levels.pdl
    closes = [c.close for c in candles]
    volumes = [c.volume for c in candles]
    vol_avg = trailing_mean(volumes, config.volume_period)
    rsi = wilder_rsi(closes, config.rsi_period)

    bias_long = levels.bias == "long"
    bias_short = levels.bias == "short"
    bias_known = levels.bias in ("long", "short")

    sweeps: list[Sweep] = []
    for i, c in enumerate(candles):
        rng = c.high - c.low
        body_top = max(c.open, c.close)
        body_bot = min(c.open, c.close)
        wick_up = (c.high - body_top) / rng if rng > 0 else 0.0
        wick_dn = (body_bot - c.low) / rng if rng > 0 else 0.0

        spike = c.volume > vol_avg[i] * config.volume_factor
        vol_ok = (not config.use_volume) or spike
        cur_rsi = rsi[i]

        # --- SWEEP VENDA -------------------------------------------------- #
        if c.high > pdh and c.close < pdh:
            bias_ok = (not config.use_bias) or (not bias_known) or bias_short
            wick_ok = (not config.use_wick) or (wick_up > config.wick_ratio)
            rsi_ok = (
                (not config.use_rsi)
                or (cur_rsi is not None and cur_rsi > config.rsi_overbought)
            )
            if bias_ok and vol_ok and wick_ok and rsi_ok:
                sweeps.append(
                    _build_sweep(
                        i, c, "SELL", "PDH", pdh, spike, bias_known and bias_short,
                        wick_up > config.wick_ratio, cur_rsi, config, "overbought",
                    )
                )
                continue

        # --- SWEEP COMPRA ------------------------------------------------- #
        if c.low < pdl and c.close > pdl:
            bias_ok = (not config.use_bias) or (not bias_known) or bias_long
            wick_ok = (not config.use_wick) or (wick_dn > config.wick_ratio)
            rsi_ok = (
                (not config.use_rsi)
                or (cur_rsi is not None and cur_rsi < config.rsi_oversold)
            )
            if bias_ok and vol_ok and wick_ok and rsi_ok:
                sweeps.append(
                    _build_sweep(
                        i, c, "BUY", "PDL", pdl, spike, bias_known and bias_long,
                        wick_dn > config.wick_ratio, cur_rsi, config, "oversold",
                    )
                )
    return sweeps


def _build_sweep(
    index, candle, direction, level_name, level,
    spike, bias_aligned, wick_dom, cur_rsi, config, rsi_kind,
) -> Sweep:
    """Monta o Sweep e calcula a conviccao (mesmos pesos do Screener)."""
    rsi_extreme = (
        cur_rsi is not None
        and (
            (rsi_kind == "overbought" and cur_rsi > config.rsi_overbought)
            or (rsi_kind == "oversold" and cur_rsi < config.rsi_oversold)
        )
    )
    conviction = 40
    conviction += 15 if bias_aligned else 0
    conviction += 20 if spike else 0
    conviction += 15 if wick_dom else 0
    conviction += 10 if rsi_extreme else 0
    return Sweep(
        index=index,
        timestamp=candle.timestamp,
        direction=direction,
        level_name=level_name,
        level=round(level, 2),
        price=round(candle.close, 2),
        conviction=min(conviction, 100),
        filters={
            "bias_aligned": bias_aligned,
            "volume_spike": spike,
            "wick_dominant": wick_dom,
            "rsi_extreme": rsi_extreme,
            "rsi": round(cur_rsi, 1) if cur_rsi is not None else None,
        },
    )


# --------------------------------------------------------------------------- #
# Alertas (Telegram)
# --------------------------------------------------------------------------- #


def format_alert(sweep: Sweep, symbol: str) -> str:
    arrow = "🔻" if sweep.direction == "SELL" else "🔺"
    side = "VENDA" if sweep.direction == "SELL" else "COMPRA"
    flags = sweep.filters
    checks = []
    if flags.get("bias_aligned"):
        checks.append("vies✓")
    if flags.get("volume_spike"):
        checks.append("volume✓")
    if flags.get("wick_dominant"):
        checks.append("pavio✓")
    if flags.get("rsi_extreme"):
        checks.append("RSI✓")
    extras = (" | " + " ".join(checks)) if checks else ""
    return (
        f"{arrow} SWEEP {side} — {symbol}\n"
        f"Nivel {sweep.level_name}: {sweep.level:g}\n"
        f"Preco: {sweep.price:g}\n"
        f"Conviccao: {sweep.conviction}/100{extras}\n"
        f"{sweep.timestamp}"
    )


def send_telegram(text: str) -> tuple[bool, str]:
    """Envia ``text`` via Bot API. Requer TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.
    Se nao configurado, retorna (False, motivo) sem levantar excecao."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat_id:
        return False, "TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID nao configurados"

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = urllib.parse.urlencode({"chat_id": chat_id, "text": text}).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            ok = 200 <= resp.status < 300
            return ok, "enviado" if ok else f"HTTP {resp.status}"
    except Exception as exc:  # noqa: BLE001 - reportar qualquer falha de rede
        return False, f"erro de rede: {exc}"


# --------------------------------------------------------------------------- #
# Estado (dedupe de alertas)
# --------------------------------------------------------------------------- #


def load_state() -> set[str]:
    if not STATE_FILE.exists():
        return set()
    try:
        return set(json.loads(STATE_FILE.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, ValueError):
        return set()


def save_state(keys: Iterable[str]) -> None:
    RTD_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(sorted(set(keys))), encoding="utf-8")


# --------------------------------------------------------------------------- #
# Orquestracao
# --------------------------------------------------------------------------- #


def run(
    symbol: str = "WIN",
    file: Optional[str] = None,
    use_telegram: bool = True,
    alert_all: bool = False,
    config: Optional[DetectorConfig] = None,
    quiet: bool = False,
) -> list[Sweep]:
    """Le o CSV, detecta sweeps e dispara alertas (apenas dos novos).

    ``quiet=True`` suprime o resumo no stdout (usado com ``--json``);
    avisos continuam indo para stderr.
    """

    def log(msg: str) -> None:
        if not quiet:
            print(msg)

    path = Path(file) if file else default_csv_for(symbol)
    if not path.exists():
        print(f"[profit_bridge] CSV nao encontrado: {path}", file=sys.stderr)
        print("  Gere com: python tools/update_m5.py \"<dados do Profit>\"", file=sys.stderr)
        return []

    candles = load_candles(path)
    if not candles:
        print(f"[profit_bridge] sem candles em {path}", file=sys.stderr)
        return []

    levels = load_levels(symbol)
    if levels.pdh is None or levels.pdl is None:
        derived = derive_levels_from_first_session(candles)
        if derived:
            derived.symbol = symbol.upper()
            if levels.bias != "unknown":
                derived.bias = levels.bias
            levels = derived
            candles = session_candles(candles)  # detecta apenas na sessao atual
            print(
                f"[profit_bridge] levels.json ausente — usando 1a sessao do CSV: "
                f"PDH={levels.pdh:g} PDL={levels.pdl:g}",
                file=sys.stderr,
            )
        else:
            print(
                "[profit_bridge] sem niveis de referencia. Crie "
                f"{LEVELS_FILE} com pdh/pdl/pdc (leia do indicador StoicSweep_Levels).",
                file=sys.stderr,
            )
            return []

    sweeps = detect_sweeps(candles, levels, config)
    log(f"[profit_bridge] {len(sweeps)} sweep(s) detectado(s) em {path.name}")

    seen = set() if alert_all else load_state()
    new_keys: list[str] = list(seen)
    for sw in sweeps:
        is_new = sw.key not in seen
        text = format_alert(sw, levels.symbol or symbol.upper())
        marker = "NOVO" if is_new else "ja alertado"
        log(f"  - [{marker}] {text.splitlines()[0]} (conv {sw.conviction})")
        if is_new:
            new_keys.append(sw.key)
            if use_telegram:
                ok, reason = send_telegram(text)
                log(f"      telegram: {reason}")

    save_state(new_keys)
    return sweeps


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Le CSV M5 do Profit, detecta sweeps e alerta no Telegram."
    )
    p.add_argument("--symbol", default="WIN", help="simbolo (default: WIN)")
    p.add_argument("--file", help="caminho do CSV (default: data/rtd/<SYMBOL>_M5.csv)")
    p.add_argument("--no-telegram", action="store_true", help="nao enviar Telegram")
    p.add_argument("--all", action="store_true", help="re-alertar todos os sweeps")
    p.add_argument("--json", action="store_true", help="imprimir sweeps em JSON")
    return p


def main(argv: Optional[list[str]] = None) -> int:
    args = _build_parser().parse_args(argv)
    sweeps = run(
        symbol=args.symbol,
        file=args.file,
        use_telegram=not args.no_telegram,
        alert_all=args.all,
        quiet=args.json,
    )
    if args.json:
        print(json.dumps([asdict(s) for s in sweeps], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
