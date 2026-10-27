/**
 * Git post-commit hook installed by `npx stoic-agentos-sdk init-hooks`.
 *
 * The API requires an X-Webhook-Signature header: HMAC-SHA256 of the exact
 * request body, keyed with the API key. The body is built and signed in Node
 * (not interpolated in shell) so commit messages with quotes or newlines
 * still produce valid JSON, and the signed bytes are the bytes sent.
 *
 * API URL: `api_url` in .agentos.json, else AGENTOS_API_URL, else production.
 */

const HOOK_NODE_SCRIPT = [
  'const fs = require("fs"), path = require("path"), crypto = require("crypto"), cp = require("child_process");',
  'let cfg; try { cfg = JSON.parse(fs.readFileSync(".agentos.json", "utf8")); } catch { process.exit(0); }',
  'const key = cfg.api_key; if (!key) process.exit(0);',
  'const git = (args) => cp.execFileSync("git", args, { encoding: "utf8" }).trim();',
  'const base = (cfg.api_url || process.env.AGENTOS_API_URL || "https://api.stoicagentos.com/api/v1").replace(/\\/+$/, "");',
  'const body = JSON.stringify({',
  '  api_key: key,',
  '  repo: path.basename(git(["rev-parse", "--show-toplevel"])),',
  '  branch: git(["branch", "--show-current"]),',
  '  commit_hash: git(["rev-parse", "HEAD"]),',
  '  commit_message: git(["log", "-1", "--pretty=%B"]),',
  '  author: git(["log", "-1", "--pretty=%an"]),',
  '});',
  'const signature = "sha256=" + crypto.createHmac("sha256", key).update(body, "utf8").digest("hex");',
  'fetch(base + "/webhooks/git", { method: "POST", headers: { "Content-Type": "application/json", "X-Webhook-Signature": signature }, body }).catch(() => {});',
].join('\n');

export const POST_COMMIT_HOOK = `#!/bin/sh
# AgentOS — Auto-capture git commits
# Installed by: npx stoic-agentos-sdk init-hooks

[ -f .agentos.json ] || exit 0
command -v node >/dev/null 2>&1 || exit 0

node -e '${HOOK_NODE_SCRIPT}' > /dev/null 2>&1 &
`;
