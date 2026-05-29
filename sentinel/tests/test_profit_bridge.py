#!/usr/bin/env python3
"""
Testes do StoicSentinel (profit_bridge + update_m5).

Roda sem pytest:
    python sentinel/tests/test_profit_bridge.py
Ou com pytest:
    pytest sentinel/tests/test_profit_bridge.py
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from sentinel import profit_bridge as pb  # noqa: E402
from tools import update_m5 as um  # noqa: E402

EXAMPLE_CSV = pb.RTD_DIR / "WIN_M5.example.csv"


# --------------------------------------------------------------------------- #
# update_m5: parsing de numeros e linhas
# --------------------------------------------------------------------------- #


def test_parse_number_formats():
    assert um.parse_number("138500") == 138500.0
    assert um.parse_number("138.500") == 138500.0       # ponto = milhar
    assert um.parse_number("1.234.567") == 1234567.0
    assert um.parse_number("138650,5") == 138650.5      # virgula decimal
    assert um.parse_number("1.234,56") == 1234.56       # pt-BR
    assert um.parse_number("1,234.56") == 1234.56       # en-US
    assert um.parse_number("138.5") == 138.5            # ponto decimal


def test_parse_rows_profit_paste():
    raw = (
        "Data\tHora\tAbertura\tMaximo\tMinimo\tFechamento\tVolume\n"
        "29/05/2026\t09:05\t138.200\t138.400\t138.100\t138.350\t900.000\n"
        "29/05/2026\t09:10\t138.350\t138.600\t138.300\t138.550\t950.000\n"
    )
    rows = um.parse_rows(raw)
    assert len(rows) == 2
    assert rows[0]["timestamp"] == "2026-05-29 09:05:00"
    assert rows[0]["open"] == 138200
    assert rows[0]["high"] == 138400
    assert rows[0]["low"] == 138100
    assert rows[0]["close"] == 138350
    assert rows[0]["volume"] == 900000


def test_parse_rows_high_low_normalised():
    # mesmo com Maxima/Minima trocadas, high/low viram extremos
    raw = "09:05 138200 138100 138400 138350 900000"
    rows = um.parse_rows(raw)
    assert rows[0]["high"] == 138400
    assert rows[0]["low"] == 138100


def test_parse_rows_skips_header_only():
    rows = um.parse_rows("Data Hora Abertura Maxima Minima Fechamento Volume")
    assert rows == []


# --------------------------------------------------------------------------- #
# profit_bridge: indicadores
# --------------------------------------------------------------------------- #


def test_wilder_rsi_bounds():
    closes = [100, 101, 102, 101, 103, 104, 103, 105, 106, 107, 108]
    rsi = pb.wilder_rsi(closes, 5)
    vals = [r for r in rsi if r is not None]
    assert vals, "RSI deveria produzir valores"
    assert all(0.0 <= v <= 100.0 for v in vals)


def test_trailing_mean_warmup():
    assert pb.trailing_mean([10, 20, 30], 2) == [10.0, 15.0, 25.0]


# --------------------------------------------------------------------------- #
# profit_bridge: deteccao de sweeps
# --------------------------------------------------------------------------- #


def _load_example():
    candles = pb.load_candles(EXAMPLE_CSV)
    levels = pb.Levels(symbol="WIN", pdh=139000, pdl=137500, pdc=138200, bias="unknown")
    return candles, levels


def test_detect_sweeps_example():
    candles, levels = _load_example()
    sweeps = pb.detect_sweeps(candles, levels)
    dirs = [(s.timestamp, s.direction, s.level_name) for s in sweeps]
    assert ("2026-05-29 09:20:00", "SELL", "PDH") in dirs
    assert ("2026-05-29 09:40:00", "BUY", "PDL") in dirs
    assert len(sweeps) == 2, dirs


def test_sweep_conviction_scoring():
    candles, levels = _load_example()
    sell = next(s for s in pb.detect_sweeps(candles, levels) if s.direction == "SELL")
    # estrutura (40) + volume (20) + pavio (15); sem vies conhecido e RSI off
    assert sell.conviction == 75, sell.conviction
    assert sell.filters["volume_spike"] is True
    assert sell.filters["wick_dominant"] is True
    assert sell.filters["bias_aligned"] is False


def test_bias_filter_blocks_against_trend():
    candles, _ = _load_example()
    # bias short bloqueia o sweep de COMPRA, mantem o de VENDA
    levels = pb.Levels(symbol="WIN", pdh=139000, pdl=137500, bias="short")
    sweeps = pb.detect_sweeps(candles, levels)
    assert all(s.direction == "SELL" for s in sweeps), [s.direction for s in sweeps]


def test_volume_filter_off_keeps_more():
    candles, levels = _load_example()
    cfg = pb.DetectorConfig(use_volume=False, use_wick=False)
    sweeps = pb.detect_sweeps(candles, levels, cfg)
    assert len(sweeps) >= 2


def test_no_levels_returns_empty():
    candles, _ = _load_example()
    assert pb.detect_sweeps(candles, pb.Levels(symbol="WIN")) == []


def test_format_alert_contains_essentials():
    candles, levels = _load_example()
    sw = pb.detect_sweeps(candles, levels)[0]
    msg = pb.format_alert(sw, "WIN")
    assert "SWEEP" in msg and "WIN" in msg and "Conviccao" in msg


# --------------------------------------------------------------------------- #
# runner standalone
# --------------------------------------------------------------------------- #


def _run_all() -> int:
    tests = [v for k, v in sorted(globals().items())
             if k.startswith("test_") and callable(v)]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
        except AssertionError as exc:
            failed += 1
            print(f"  FAIL  {t.__name__}: {exc}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"  ERROR {t.__name__}: {exc!r}")
    print(f"\n{len(tests) - failed}/{len(tests)} testes passaram.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(_run_all())
