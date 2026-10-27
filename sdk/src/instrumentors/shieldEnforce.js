/**
 * Stoic AgentOS SDK — Server-side Policy Enforcement (Active Shield L1–L3)
 *
 * Bridges the instrumentors to the server policy engine at /shield/evaluate.
 * evaluate() returns a graduated verdict; REQUIRE_APPROVAL is resolved through
 * the same CAS-backed poll → consume loop as the static critical-tool HITL flow,
 * so an approved ticket is claimed exactly once before the tool runs.
 *
 * Returns a plain decision — the caller (instrumentor) owns how a block is
 * surfaced (throw vs. refused result) so provider-specific shapes stay local.
 */

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // ~5 min, matched to the server timeout sweep

/**
 * Wait for a pending approval to resolve, then atomically consume it.
 * @returns {Promise<boolean>} true only if APPROVED and successfully consumed.
 */
export async function waitForApproval(sdk, approvalId) {
  for (let attempts = 0; attempts < MAX_POLL_ATTEMPTS; attempts++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const statusRes = await sdk.compliance.checkApprovalStatus(approvalId);
      const status = statusRes && statusRes.status;
      if (status === 'APPROVED') {
        try {
          const consumeRes = await sdk.compliance.consumeApproval(approvalId);
          return !!(consumeRes && consumeRes.success);
        } catch (consumeErr) {
          if (sdk.debug) console.warn('[AgentOS Shield] consume failed:', consumeErr.message);
          return false; // lost the CAS race — do NOT execute
        }
      }
      if (status === 'REJECTED' || status === 'TIMEOUT' || status === 'CONSUMED') return false;
    } catch (pollErr) {
      if (sdk.debug) console.warn('[AgentOS Shield] poll error (will retry):', pollErr.message);
    }
  }
  return false; // client-side give-up; server sweep finalizes the ticket as TIMEOUT
}

/**
 * Evaluate one tool call against the server policy engine and resolve any
 * required approval. Throws on transport errors so the instrumentor can apply
 * its failClosed policy.
 * @returns {Promise<{ allowed: boolean, verdict: string }>}
 */
export async function enforceToolPolicy(sdk, toolName, toolArgs, ctx = {}) {
  const res = await sdk.compliance.evaluate(toolName, toolArgs, ctx);
  const verdict = (res && res.verdict) || 'ALLOW';
  if (verdict === 'ALLOW') return { allowed: true, verdict };
  if (verdict === 'BLOCK') return { allowed: false, verdict };
  if (verdict === 'REQUIRE_APPROVAL' && res.approval_id) {
    const approved = await waitForApproval(sdk, res.approval_id);
    return { allowed: approved, verdict };
  }
  // Unknown verdict with no actionable ticket — treat as allowed (server already logged).
  return { allowed: true, verdict };
}
