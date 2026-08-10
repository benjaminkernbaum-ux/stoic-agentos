import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AgentOS,
  AgentOSPolicyBlockError,
  AgentOSApprovalRejectedError,
  AgentOSApprovalTimeoutError,
} from './index.js';

/** Build an SDK instance with a stubbed transport (no network). */
function makeSdk(options = {}) {
  const sdk = new AgentOS({ apiKey: 'sk_test_guard', ...options });
  sdk.backgroundQueue.stop(); // don't leave timers running in tests
  sdk._send = vi.fn();
  sdk._fetch = vi.fn();
  return sdk;
}

describe('compliance.guard', () => {
  let sdk;

  beforeEach(() => {
    vi.useFakeTimers();
    sdk = makeSdk();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately on ALLOW', async () => {
    sdk._send.mockResolvedValueOnce({ verdict: 'ALLOW', reason: 'no_policy_matched' });
    const result = await sdk.compliance.guard('read_file');
    expect(result.verdict).toBe('ALLOW');
    expect(sdk._send).toHaveBeenCalledWith('/compliance/shield/evaluate', expect.objectContaining({
      tool_name: 'read_file',
    }));
  });

  it('throws AgentOSPolicyBlockError on BLOCK', async () => {
    sdk._send.mockResolvedValueOnce({
      verdict: 'BLOCK', reason: 'policy_block', policy: { name: 'no-deletes' },
    });
    await expect(sdk.compliance.guard('db_delete')).rejects.toThrow(AgentOSPolicyBlockError);
  });

  it('names the circuit breaker in BLOCK errors', async () => {
    sdk._send.mockResolvedValueOnce({
      verdict: 'BLOCK', reason: 'circuit_breaker_open', block_count: 7,
    });
    await expect(sdk.compliance.guard('any_tool')).rejects.toThrow(/circuit breaker open/);
  });

  it('polls then consumes on APPROVED', async () => {
    sdk._send.mockImplementation(async (path) => {
      if (path === '/compliance/shield/evaluate') {
        return {
          verdict: 'REQUIRE_APPROVAL', approval_id: 'ap_1',
          timeout_at: new Date(Date.now() + 60000).toISOString(), poll_interval_ms: 10,
        };
      }
      if (path === '/compliance/shield/approvals/ap_1/consume') {
        return { success: true, status: 'CONSUMED' };
      }
      throw new Error(`unexpected send: ${path}`);
    });
    sdk._fetch
      .mockResolvedValueOnce({ status: 'PENDING' })
      .mockResolvedValueOnce({ status: 'APPROVED' });

    const promise = sdk.compliance.guard('stripe_refund');
    await vi.advanceTimersByTimeAsync(50);
    const result = await promise;
    expect(result.verdict).toBe('APPROVED');
    expect(result.approvalId).toBe('ap_1');
    expect(sdk._send).toHaveBeenCalledWith('/compliance/shield/approvals/ap_1/consume', {});
  });

  it('throws AgentOSApprovalRejectedError when an admin rejects', async () => {
    sdk._send.mockResolvedValueOnce({
      verdict: 'REQUIRE_APPROVAL', approval_id: 'ap_2',
      timeout_at: new Date(Date.now() + 60000).toISOString(), poll_interval_ms: 10,
    });
    sdk._fetch.mockResolvedValue({ status: 'REJECTED' });

    const promise = sdk.compliance.guard('wire_transfer');
    promise.catch(() => {}); // avoid unhandled rejection while timers advance
    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).rejects.toThrow(AgentOSApprovalRejectedError);
  });

  it('throws AgentOSApprovalTimeoutError when the server reports TIMEOUT', async () => {
    sdk._send.mockResolvedValueOnce({
      verdict: 'REQUIRE_APPROVAL', approval_id: 'ap_3',
      timeout_at: new Date(Date.now() + 60000).toISOString(), poll_interval_ms: 10,
    });
    sdk._fetch.mockResolvedValue({ status: 'TIMEOUT' });

    const promise = sdk.compliance.guard('wire_transfer');
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).rejects.toThrow(AgentOSApprovalTimeoutError);
  });

  it('rejects when the APPROVED ticket was already consumed elsewhere (CAS lost)', async () => {
    sdk._send.mockImplementation(async (path) => {
      if (path === '/compliance/shield/evaluate') {
        return {
          verdict: 'REQUIRE_APPROVAL', approval_id: 'ap_4',
          timeout_at: new Date(Date.now() + 60000).toISOString(), poll_interval_ms: 10,
        };
      }
      if (path === '/compliance/shield/approvals/ap_4/consume') {
        return null; // transport turns the 409 into null
      }
    });
    sdk._fetch.mockResolvedValue({ status: 'APPROVED' });

    const promise = sdk.compliance.guard('stripe_refund');
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).rejects.toThrow(AgentOSApprovalRejectedError);
  });

  it('fails open when evaluation is unreachable (default)', async () => {
    sdk._send.mockRejectedValueOnce(new Error('network down'));
    const result = await sdk.compliance.guard('any_tool');
    expect(result.verdict).toBe('ALLOW');
  });

  it('fails closed when failClosed is set and evaluation is unreachable', async () => {
    const closedSdk = makeSdk({ failClosed: true });
    closedSdk._send.mockRejectedValueOnce(new Error('network down'));
    await expect(closedSdk.compliance.guard('any_tool')).rejects.toThrow(AgentOSPolicyBlockError);
  });
});

describe('compliance.protectTool', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only invokes the wrapped function when the guard allows', async () => {
    const sdk = makeSdk();
    sdk._send.mockResolvedValue({ verdict: 'ALLOW' });
    const fn = vi.fn().mockResolvedValue('done');
    const protectedFn = sdk.compliance.protectTool('send_email', fn);
    await expect(protectedFn({ to: 'a@b.c' })).resolves.toBe('done');
    expect(fn).toHaveBeenCalledWith({ to: 'a@b.c' });
  });

  it('never invokes the wrapped function on BLOCK', async () => {
    const sdk = makeSdk();
    sdk._send.mockResolvedValue({ verdict: 'BLOCK', reason: 'policy_block', policy: { name: 'p' } });
    const fn = vi.fn();
    const protectedFn = sdk.compliance.protectTool('drop_database', fn);
    await expect(protectedFn()).rejects.toThrow(AgentOSPolicyBlockError);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('compliance.enforce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns {allowed:true} for ALLOW verdicts', async () => {
    const sdk = makeSdk();
    sdk._send.mockResolvedValue({ verdict: 'ALLOW' });
    await expect(sdk.compliance.enforce('read_file')).resolves.toEqual({ allowed: true, reason: 'allowed' });
  });

  it('returns {allowed:false} instead of throwing on BLOCK', async () => {
    const sdk = makeSdk();
    sdk._send.mockResolvedValue({ verdict: 'BLOCK', reason: 'policy_block', policy: { name: 'p' } });
    const decision = await sdk.compliance.enforce('drop_database');
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('POLICY_BLOCKED');
  });

  it('forceEscalate uses the suspend path and consumes on approval', async () => {
    const sdk = makeSdk();
    sdk._send.mockImplementation(async (path) => {
      if (path === '/compliance/shield/suspend') return { success: true, approval_id: 'ap_9' };
      if (path === '/compliance/shield/approvals/ap_9/consume') return { success: true };
      throw new Error(`unexpected send: ${path}`);
    });
    sdk._fetch.mockResolvedValue({ status: 'APPROVED' });

    const promise = sdk.compliance.enforce('critical_tool', { forceEscalate: true });
    await vi.advanceTimersByTimeAsync(2500);
    await expect(promise).resolves.toEqual({ allowed: true, reason: 'approved' });
    expect(sdk._send).toHaveBeenCalledWith('/compliance/shield/suspend', expect.objectContaining({
      tool_name: 'critical_tool',
    }));
  });
});
