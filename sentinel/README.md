# ⚔️ StoicSentinel — Liquidity Sweeps no ProfitChart (NTSL) + Telegram

Detecção de **liquidity sweeps** (varreduras de máxima/mínima do dia anterior com
rejeição) em dois componentes que se complementam:

```
┌──────────────────────────────────────────────────────────────────────┐
│  COMPONENTE 1 — NTSL (tempo real, dentro do Profit)                    │
│  StoicSweep_Levels  → níveis no gráfico (PDH/PDL/PDC, VWAP, EMAs, sem.) │
│  StoicSweep_Detector→ pinta o candle de sweep + seta + ConsoleLog      │
│  StoicSweep_Screener→ scanner com conviccão 0..100 + alarme sonoro     │
├──────────────────────────────────────────────────────────────────────┤
│  COMPONENTE 2 — Python (alertas fora do Profit)                        │
│  Profit (export M5) → sentinel/data/rtd/WIN_M5.csv                     │
│                     → profit_bridge.detect_sweeps() (MESMA lógica NTSL)│
│                     → Telegram                                         │
└──────────────────────────────────────────────────────────────────────┘
```

> **Por quê?** O bot Python dependia do `yfinance`, que não entrega intraday de
> hoje do `^BVSP`. O Profit tem dado LIVE tick a tick com volume real. A NTSL
> roda **dentro** do Profit; o Python recebe o export e dispara os alertas.

A regra de detecção é idêntica nos dois lados:

| Sweep | Estrutura |
|-------|-----------|
| **VENDA** | pavio **acima** do PDH (`HighD(1)`) **e** fechamento **abaixo** do PDH |
| **COMPRA** | pavio **abaixo** do PDL (`LowD(1)`) **e** fechamento **acima** do PDL |

Filtros (opcionais, somam conviccão): viés diário (EMA9×EMA21 sobre fechamentos
diários), spike de volume (`Volume > Media(20)·1.5`), RSI nos extremos, razão de
pavio (`pavio/range > 0.5`).

---

## 1. Componente 1 — Indicadores NTSL

Arquivos em [`sentinel/ntsl/`](./ntsl):

| Arquivo | Tipo no Profit | Função |
|---------|----------------|--------|
| `StoicSweep_Levels.src` | Indicador | Plota PDH/PDL/PDC, VWAP diário, EMA 9/21/200 e máx/mín da semana |
| `StoicSweep_Detector.src` | Indicador | Marca (PaintBar + seta) cada candle de sweep, com os filtros |
| `StoicSweep_Screener.src` | Estratégia/Screening | Direção, Nível, Preço e **Conviccão 0..100** + `Alert()` sonoro |

### Como carregar
1. No Profit: **Editor de Estratégias** (módulo NTSL) → **Nova**.
2. Cole o conteúdo do `.src`, **Compilar** (deve compilar sem erros — escrito
   para o **Manual NTSL v4.3**).
3. Arraste o indicador para o gráfico do **WINFUT** em **M5** (ou M15).
4. Para o screener: módulo **Screening**, ativo `WINFUT`, periodicidade `M5`.
   Cada `Plot` vira uma coluna: `Direção (+1/-1)`, `Nível`, `Preço`, `Conviccão`.

### Parâmetros (inputs) principais do Detector
| Input | Default | Descrição |
|-------|---------|-----------|
| `UsarViesD1` | `true` | só alerta a favor do viés diário (EMA9×EMA21 dos fechamentos D-1..D-N) |
| `UsarVolume` / `FatorVolume` | `true` / `1.5` | exige `Volume > Media(20)·1.5` |
| `UsarRSI` | `false` | exige RSI<30 (compra) / RSI>70 (venda) |
| `UsarPavio` / `RazaoPavio` | `true` / `0.5` | exige pavio dominante |
| `AlertaSonoro` | `false` | dispara `Alert()` ao detectar |

> **Repintagem:** o candle ao vivo é reavaliado a cada trade — o sinal só é
> definitivo após o fechamento da barra. Barras passadas não repintam.

---

## 2. Componente 2 — Python (CSV → Telegram)

Sem dependências externas obrigatórias (só biblioteca padrão). `pyperclip` é
opcional (clipboard).

### a) Exportar M5 do Profit
Copie a tabela de dados do gráfico M5 (Data/Hora, Abertura, Máxima, Mínima,
Fechamento, Volume). O parser aceita TAB/`;`/vírgula/espaços e números pt-BR
(`138.500`, `1.234.567`) ou en-US.

### b) Gravar o CSV canônico
```bash
# colar como argumento (entre aspas)
python tools/update_m5.py "29/05/2026 09:05 138.500 138.700 138.400 138.650 1.234.500"

# do clipboard
python tools/update_m5.py --clipboard           # requer: pip install pyperclip

# de um arquivo
python tools/update_m5.py < dados.txt

# mesclar com o que já existe (em vez de sobrescrever)
python tools/update_m5.py --append "<dados>"
```
Gera `sentinel/data/rtd/WIN_M5.csv` no formato:
```
timestamp,open,high,low,close,volume
2026-05-29 09:05:00,138500,138700,138400,138650,1234500
```

### c) Níveis de referência (`levels.json`)
Leia **PDH/PDL/PDC** do indicador `StoicSweep_Levels` e salve em
`sentinel/data/rtd/levels.json` (modelo em `levels.example.json`):
```json
{ "symbol": "WIN", "pdh": 139000, "pdl": 137500, "pdc": 138200, "bias": "short" }
```
`bias` (`long`/`short`/`neutral`/`unknown`) vem do cruzamento EMA9×EMA21 D1.
Sem `levels.json`, se o CSV tiver **mais de um dia**, o bridge usa a 1ª sessão
como "dia anterior" automaticamente.

### d) Detectar e alertar
```bash
# detecta no CSV e envia ao Telegram os sweeps NOVOS (dedupe por estado)
python -m sentinel.profit_bridge --symbol WIN

# atalho: grava o CSV e já detecta/alerta
python tools/update_m5.py --detect "<dados>"

# saída JSON limpa (para integrações)
python sentinel/profit_bridge.py --symbol WIN --json

# re-alertar tudo, sem Telegram (debug)
python sentinel/profit_bridge.py --symbol WIN --all --no-telegram
```

### e) Telegram
```bash
cp sentinel/.env.example sentinel/.env   # preencha TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID
export $(grep -v '^#' sentinel/.env | xargs)   # ou use seu carregador de .env
```
Sem credenciais, o bridge apenas imprime o alerta (não quebra).

---

## 3. Teste rápido

```bash
python sentinel/tests/test_profit_bridge.py        # 12 testes, sem pytest
# ou: pytest sentinel/tests/test_profit_bridge.py
```

Demo com os dados de exemplo (2 sweeps: VENDA 09:20 @ PDH, COMPRA 09:40 @ PDL):
```bash
cp sentinel/data/rtd/levels.example.json sentinel/data/rtd/levels.json
python sentinel/profit_bridge.py --file sentinel/data/rtd/WIN_M5.example.csv --no-telegram --all
```

---

## 4. Funções NTSL utilizadas (Manual v4.3)

`HighD/LowD/CloseD/OpenD(DaysAgo)` · `VWAP(1)` (diário) · `Media(per,série)` ·
`MediaExp(per,série)` · `RSI(per,0)` · `Volume` · `Max/Min(a,b)` ·
`Plot/Plot2..PlotN` · `SetPlotColor/Style/Width` · `PaintBar(cor)` ·
`PlotText(txt,cor,pos,fonte,preço)` · `RGB(r,g,b)` · `Alert(cor)` ·
`LastBarOnChart()` · `ConsoleLog(str)` · `FloatToString(v,díg)`.

**Limitações NTSL:** sem I/O de arquivo (usa o export nativo do Profit), sem
HTTP, e variáveis globais não são acessíveis dentro de `Function`s — por isso
toda a lógica fica no bloco `begin..end`.
