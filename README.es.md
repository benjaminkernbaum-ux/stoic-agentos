<p align="center">
  <h1 align="center">⚡ Stoic AgentOS</h1>
  <p align="center"><strong>El Sistema Operativo para Flotas de Agentes IA</strong></p>
  <p align="center">Monitorea, orquesta y persiste conocimiento a través de tus agentes IA — desde un solo panel de control.</p>
</p>

<p align="center">
  <a href="./README.md"><img alt="English" src="https://img.shields.io/badge/English-d9d9d9"></a>
  <a href="./README.cn.md"><img alt="简体中文" src="https://img.shields.io/badge/简体中文-d9d9d9"></a>
  <a href="./README.ja.md"><img alt="日本語" src="https://img.shields.io/badge/日本語-d9d9d9"></a>
  <a href="./README.kr.md"><img alt="한국어" src="https://img.shields.io/badge/한국어-d9d9d9"></a>
  <a href="./README.es.md"><img alt="Español" src="https://img.shields.io/badge/Español-d9d9d9"></a>
  <a href="./README.pt.md"><img alt="Português" src="https://img.shields.io/badge/Português-d9d9d9"></a>
</p>

<p align="center">
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/stargazers"><img src="https://img.shields.io/github/stars/benjaminkernbaum-ux/stoic-agentos?style=social" alt="GitHub Stars" /></a>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/network/members"><img src="https://img.shields.io/github/forks/benjaminkernbaum-ux/stoic-agentos?style=social" alt="GitHub Forks" /></a>
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk"><img src="https://img.shields.io/npm/v/stoic-agentos-sdk?color=blue&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk"><img src="https://img.shields.io/npm/dm/stoic-agentos-sdk?color=green" alt="npm downloads" /></a>
  <a href="https://stoicagentos.com"><img src="https://img.shields.io/badge/dashboard-live-brightgreen" alt="Dashboard" /></a>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple" alt="License" /></a>
</p>

<p align="center">
  <a href="https://stoicagentos.com">Dashboard</a> · 
  <a href="https://stoicagentos.com/docs">Docs</a> · 
  <a href="https://stoicagentos.com/signup">Comenzar Gratis</a> · 
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk">npm</a> · 
  <a href="#inicio-rápido">Inicio Rápido</a>
</p>

<p align="center">
  <strong>⭐ ¿Te gusta este proyecto? Dale una estrella — ¡cada estrella nos ayuda a llegar a más desarrolladores que construyen con agentes IA!</strong><br/>
  <sub>Si AgentOS te ahorra tiempo depurando agentes, una estrella es la mejor forma de decir gracias 🙏</sub>
</p>

<p align="center">
  <!-- TODO: Replace with actual demo GIF recording of the dashboard -->
  <img src="launch-assets/01_hero.png" alt="Panel de Stoic AgentOS" width="800" />
</p>

---

## El Problema

Estás ejecutando agentes IA en producción — asistentes de código, pipelines de datos, bots de soporte al cliente, bots de trading, generadores de contenido. Cada uno toma decisiones autónomas, pero:

- **Sin visibilidad** → El agente falla a las 3 AM, te enteras el lunes
- **Sin memoria** → El mismo agente redescubre el mismo bug en cada sesión
- **Sin coordinación** → 5 agentes, 5 silos, cero conocimiento compartido

## La Solución

AgentOS le da a tu flota de IA un **centro de comando** — monitoreo en tiempo real, conocimiento persistente que sobrevive entre sesiones, y facturación basada en uso que escala contigo.

```
Tu Flota de Agentes           →  AgentOS SDK  →  Dashboard
├── Asistente de Código            3 líneas       📊 Estado en tiempo real
├── Pipeline de Datos              de código      🧠 Conocimiento compartido
├── Bot de Soporte                                📈 Analíticas de uso
└── Generador de Contenido                        🔑 Gestión de API keys
```

## Inicio Rápido

### 1. Instalar

```bash
npm install stoic-agentos-sdk
```

### 2. Obtén Tu API Key

Regístrate en [stoicagentos.com](https://stoicagentos.com/signup) → Dashboard → Settings → Generate Key

### 3. Monitorea Tu Primer Agente

```javascript
import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({
  apiKey: 'sk_live_your_key_here',
  workspace: 'my-project',
});

// Envuelve cualquier función → captura automáticamente inicio, éxito y errores
const myAgent = os.wrapAgent('invoice-processor', async (input) => {
  const result = await processInvoice(input);
  return result;
});

// Ejecútalo — AgentOS rastrea todo
await myAgent({ invoiceId: 'INV-001' });
```

### 4. Captura Decisiones y Conocimiento

```javascript
// Captura observaciones importantes
os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini for summarization',
  content: 'Reduced cost by 40% with no quality loss on BLEU benchmark',
});

// Persiste conocimiento entre sesiones
os.capture({
  type: 'architecture',
  title: 'Payment service uses idempotency keys',
  content: 'Always include X-Idempotency-Key header to prevent double charges',
});
```

## Características

| Característica | Descripción |
|---------|-------------|
| 🤖 **Monitoreo de Agentes** | Estado en tiempo real, heartbeats, seguimiento de errores para toda tu flota |
| 🧠 **Persistencia de Conocimiento** | Los agentes recuerdan decisiones entre sesiones — sin más re-aprendizaje |
| 📊 **Analíticas de Uso** | Observaciones/mes, ejecuciones de agentes, tasas de error de un vistazo |
| 📦 **Multi-Workspace** | Agrupa agentes por proyecto, repositorio o equipo |
| ⚡ **Auto-Captura** | `wrapAgent()` registra inicio, éxito y errores automáticamente |
| 🔑 **Gestión de API Keys** | Genera, lista y revoca keys desde el dashboard |
| 💳 **Facturación por Uso** | Nivel gratuito con límites reales, actualiza cuando necesites más |
| 🔒 **Seguridad a Nivel de Fila** | RLS completo en Supabase — tus datos están aislados por organización |
| 🧠 **Insights con Claude** | Auto-resumen de actividad (Haiku 4.5) y diagnóstico de agentes fallidos (Sonnet 4.6 + thinking) |
| 🔐 **BYOK** | Trae tu propia key de Anthropic — almacenada encriptada en Supabase Vault, nunca en texto plano |

## ¿Por Qué AgentOS?

| | **Stoic AgentOS** | Langfuse | AgentOps | CrewAI |
|---|---|---|---|---|
| **Monitoreo de agentes** | ✅ | ✅ | ✅ | ⚠️ Solo orquestación |
| **Persistencia de conocimiento** | ✅ | ❌ | ❌ | ❌ |
| **SDK con auto-captura** | ✅ 3 líneas | ⚠️ Basado en decoradores | ✅ | ❌ |
| **Multi-workspace** | ✅ | ⚠️ Proyectos | ❌ | ❌ |
| **Dashboard autoservicio** | ✅ | ✅ | ✅ | ❌ |
| **Límites de uso + facturación** | ✅ Integrado | ✅ | ❌ | ❌ |
| **Core open-source** | ✅ MIT | ✅ MIT | Parcial | ✅ |
| **Tiempo de configuración** | 3 min | 10 min | 5 min | 30 min |

## Precios

| | Gratis | Pro — $29/mes | Team — $79/mes | Enterprise |
|---|------|-------------|----------------|------------|
| Workspaces | 2 | 10 | Ilimitados | Ilimitados |
| Agentes | 5 | 25 | 100 | Ilimitados |
| Observaciones/mes | 10,000 | 100,000 | Ilimitadas | Ilimitadas |
| Elementos de conocimiento | 5 | 25 | Ilimitados | Ilimitados |
| Miembros | 1 | 5 | 15 | Ilimitados |

[**Comenzar Gratis →**](https://stoicagentos.com/signup)

## Arquitectura

```
┌────────────────────────────────┐
│  Tu Aplicación                 │
│  ├── Agente 1                  │
│  ├── Agente 2                  │─── stoic-agentos-sdk (npm)
│  └── Agente N                  │         │
└────────────────────────────────┘         │
                                           ▼
┌──────────────────────────────────────────────────┐
│  AgentOS API (Railway)                            │
│  ├── Auth (Supabase JWT + API Keys)               │
│  ├── Observations → /api/v1/observations          │
│  ├── Agents → /api/v1/agents                      │
│  ├── Knowledge → /api/v1/knowledge-items          │
│  ├── Billing → /api/v1/billing (Stripe)           │
│  └── Webhooks → /webhooks/stripe, /webhooks/git   │
└──────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────┐    ┌─────────────────┐
│  Supabase   │    │  Stripe         │
│  (Postgres) │    │  (Billing)      │
│  8 tablas   │    │  Checkout +     │
│  RLS en     │    │  Portal +       │
│  todas      │    │  Webhooks       │
└─────────────┘    └─────────────────┘
```

## Referencia de API

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `POST` | `/api/v1/observations` | API Key | Crear observación |
| `GET` | `/api/v1/observations` | API Key | Listar observaciones |
| `POST` | `/api/v1/agents` | API Key | Registrar agente |
| `GET` | `/api/v1/agents` | API Key | Listar agentes |
| `POST` | `/api/v1/agents/heartbeat` | API Key | Heartbeat de agente (upsert) |
| `POST` | `/api/v1/knowledge-items` | API Key | Crear elemento de conocimiento |
| `POST` | `/api/v1/workspaces` | API Key | Crear workspace |
| `GET` | `/api/v1/stats` | API Key | Estadísticas del dashboard |
| `POST` | `/api/v1/api-keys` | JWT | Generar API key |
| `DELETE` | `/api/v1/api-keys/:id` | JWT | Revocar API key |
| `POST` | `/api/v1/billing/checkout` | JWT | Iniciar checkout de Stripe |
| `POST` | `/api/v1/billing/portal` | JWT | Abrir portal del cliente |

## Referencia del SDK

```javascript
import { AgentOS } from 'stoic-agentos-sdk';

// Inicializar
const os = new AgentOS({ apiKey: 'sk_live_xxx', workspace: 'my-app' });

// Métodos principales
os.capture({ type, title, content, metadata })     // Registrar observación
os.wrapAgent(name, fn)                              // Auto-monitorear función
os.getObservations({ limit, type })                 // Consultar observaciones
os.getStats()                                       // Estadísticas del dashboard

// Insights con Claude (v2.1+)
await os.summarize({ hours: 168 })                 // Resumen IA de actividad reciente
await os.analyzeAgent(agentId)                     // Diagnosticar la salud de un agente
await os.ask('Why did the email-agent fail?')      // Preguntas y respuestas libres
```

## Integración con Claude

AgentOS utiliza Anthropic Claude para insights potenciados por IA — resumiendo observaciones, diagnosticando fallos de agentes, respondiendo preguntas libres sobre tu flota.

**Modelos:** Haiku 4.5 para resúmenes rápidos, Sonnet 4 con thinking adaptativo para diagnósticos profundos.

**Tres superficies:**
- **API**: `POST /insights/{summarize,analyze-agent,ask}` — ver Referencia de API
- **SDK**: `os.summarize()`, `os.analyzeAgent(id)`, `os.ask(q)` (arriba)
- **MCP server**: herramientas `agentos_summarize_observations`, `agentos_analyze_agent`, `agentos_ask`

**BYOK (Bring Your Own Key):** Los clientes pueden enrutar la inferencia a través de su propia cuenta de Anthropic desde Settings → Anthropic API Key. Las keys se almacenan encriptadas en Supabase Vault (`vault.secrets`, pgsodium en reposo) y solo son accedidas por el rol de servicio de la API. Cuando no se configura una key por organización, la plataforma utiliza la variable de entorno `ANTHROPIC_API_KEY` como respaldo.

**Seguimiento de costos:** Cada llamada a Claude se registra en `anthropic_usage` con conteos de tokens y cache hits. La pestaña Settings muestra el conteo de llamadas, uso de tokens y costo estimado en ventanas de 7/30/90 días.

**Caché:** Todas las solicitudes usan `cache_control: { type: 'ephemeral' }` para que los system prompts repetidos utilicen el caché de prefijo a ~10% del costo de entrada.

## 🌍 Usado Por

Stoic AgentOS es confiado por equipos de ingeniería modernos para monitorear, persistir y orquestar sus sistemas autónomos.

<p align="center">
  <img src="https://img.shields.io/badge/Fleet-Coding%20Copilots-blueviolet?style=for-the-badge&logo=github" alt="Coding Copilots" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Orchestrator-Customer%20Support-00BFFF?style=for-the-badge&logo=intercom" alt="Customer Support" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Pipeline-Autonomous%20Trading-FFD700?style=for-the-badge&logo=stripe" alt="Autonomous Trading" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Worker-Data%20Extraction-FF8C00?style=for-the-badge&logo=python" alt="Data Extraction" />
</p>

- **DevOps Autónomo:** Auto-monitoreo de agentes de triaje CI/CD ejecutándose 24/7.
- **Flotas de Soporte Enterprise:** Coordinando flujos de soporte multi-agente a través de 10k+ observaciones dinámicas/mes.
- **Pipelines de Contenido Dinámico:** Rastreando preservación de memoria para generación de video creativo de larga duración.

---

## Contribuir

¡Las contribuciones son bienvenidas! Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para las guías.

```bash
# Clonar el repositorio
git clone https://github.com/benjaminkernbaum-ux/stoic-agentos.git
cd stoic-agentos

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## Licencia

MIT © 2026 [Benjamin Kernbaum](https://github.com/benjaminkernbaum-ux)

---

## 📈 Historial de Estrellas

[![Star History Chart](https://api.star-history.com/svg?repos=benjaminkernbaum-ux/stoic-agentos&type=Date)](https://star-history.com/#benjaminkernbaum-ux/stoic-agentos)

---

## 🌍 Comunidad

- 💬 [Discusiones](https://github.com/benjaminkernbaum-ux/stoic-agentos/discussions) — Haz preguntas, comparte ideas
- 🐛 [Issues](https://github.com/benjaminkernbaum-ux/stoic-agentos/issues) — Reporta bugs, solicita funcionalidades
- ⭐ [Dale estrella a este repo](https://github.com/benjaminkernbaum-ux/stoic-agentos) — Ayúdanos a llegar a más desarrolladores
- 📋 [Contribuir](CONTRIBUTING.md) — Ayúdanos a construir AgentOS

---

<p align="center">
  <strong>Construido con convicción.</strong><br/>
  <a href="https://stoicagentos.com">stoicagentos.com</a><br/><br/>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/stargazers"><img src="https://img.shields.io/github/stars/benjaminkernbaum-ux/stoic-agentos?style=for-the-badge&logo=github&label=Star%20on%20GitHub&color=9b59ff" alt="Star en GitHub" /></a>
</p>
