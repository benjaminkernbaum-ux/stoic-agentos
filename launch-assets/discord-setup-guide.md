# 💬 Discord Server Setup Guide — Stoic AgentOS

> **Time required:** 30-45 minutes  
> **Goal:** A welcoming, professional community server ready for launch day

---

## Step 1: Create the Server

1. Open Discord → Click the **+** button (Add a Server)
2. Select **"Create My Own"** → **"For a club or community"**
3. Server name: **Stoic AgentOS**
4. Upload server icon: Use the logo from `public/favicon.svg` or generate a 512x512 version
5. Click **Create**

---

## Step 2: Server Settings

### General
- **Description:** "The open-source command center for AI agent fleets. Real-time monitoring, persistent memory, and compliance audit."
- **Community:** Enable **Community** in Server Settings (unlocks Announcement channels and Discovery)

### Roles
| Role | Color | Permissions |
|------|-------|-------------|
| **@Core Team** | `#9b59ff` (brand purple) | Admin |
| **@Contributor** | `#4ade80` (green) | Send messages, react, threads |
| **@Early Adopter** | `#ffd700` (gold) | Badge only (auto-assign for first 100 members) |

---

## Step 3: Channel Structure

### 📢 Information (Read-only)
```
#welcome          — Welcome message + rules
#announcements    — Product updates, releases, launches
#roadmap          — Link to ROADMAP.md + monthly updates
```

### 💬 Community
```
#general          — Main chat
#introductions    — New members introduce themselves
#showcase         — Share what you built with AgentOS
#help             — Support questions
```

### 🛠️ Development
```
#sdk-typescript   — TS/JS SDK questions
#sdk-python       — Python SDK questions
#self-hosting     — Docker, deployment, infrastructure
#contributing     — Contributor coordination
#bug-reports      — Quick bug reports (redirect to GitHub Issues for tracking)
```

### 🧠 Ideas & Feedback
```
#feature-requests — Feature discussions
#feedback         — General product feedback
```

---

## Step 4: Welcome Message (#welcome)

Paste this in the #welcome channel:

```
# ⚡ Welcome to Stoic AgentOS

**The open-source command center for AI agent fleets.**

---

## What is AgentOS?

Stoic AgentOS gives your AI agents a unified nervous system:
🤖 **Real-time fleet monitoring** — heartbeats, status, errors
🧠 **Persistent memory** — agents remember decisions across sessions
🔒 **Compliance audit** — immutable logs of every decision
⚡ **3-line SDK** — `npm install stoic-agentos-sdk`, wrap your function, done

---

## Quick Links

🔗 **GitHub:** https://github.com/benjaminkernbaum-ux/stoic-agentos
🔗 **Dashboard:** https://stoicagentos.com
🔗 **Docs:** https://stoicagentos.com/docs
🔗 **npm:** `npm install stoic-agentos-sdk`

---

## Rules

1. **Be respectful.** We follow the [Contributor Covenant](https://github.com/benjaminkernbaum-ux/stoic-agentos/blob/master/CODE_OF_CONDUCT.md).
2. **Stay on topic.** AI agents, observability, developer tools.
3. **No spam.** Self-promotion only in #showcase.
4. **Help each other.** If you know the answer, share it.
5. **Report bugs on GitHub.** Use #bug-reports for quick notes, but file Issues for tracking.

---

⭐ **Star us on GitHub** to help us reach more developers!
```

---

## Step 5: Announcement Post (#announcements)

```
# 🚀 Stoic AgentOS is Live!

We're thrilled to launch the Stoic AgentOS community! Here's what's happening:

**What's new:**
✅ SDK v3.0 published on npm
✅ Python SDK on PyPI
✅ Self-hosting via Docker Compose
✅ Claude-powered AI diagnostics (BYOK)
✅ Multi-language READMEs (6 languages)

**What's coming (Q3 2026):**
🔨 OpenTelemetry trace export
🔨 Langfuse integration adapter
🔨 Agent evaluation framework
🔨 Prompt management with A/B testing

**How to get involved:**
🐛 Check our `good first issue` labels on GitHub
💬 Introduce yourself in #introductions
🎯 Share feature ideas in #feature-requests

Let's build the future of agent operations together! ⚡
```

---

## Step 6: Generate Invite Link

1. Server Settings → Invites → Create Invite
2. Set to **Never expire**, **No max uses**
3. Copy the link — you'll add this to:
   - README.md (Community section)
   - LinkedIn post
   - X/Twitter thread (tweet 12)
   - Newsletter pitch
   - GitHub Discussions welcome post

---

## Step 7: Add the Discord Link to README

Once you have the invite link, add a Discord badge to the README badge section (line ~54):

```html
<a href="YOUR_DISCORD_INVITE_LINK"><img src="https://img.shields.io/badge/Discord-5865F2?style=flat&logo=discord&logoColor=white" alt="Discord"></a>
```

And add to the Community section (line ~366):
```markdown
- 💬 [Discord](YOUR_DISCORD_INVITE_LINK) — Real-time chat, support, and community
```
