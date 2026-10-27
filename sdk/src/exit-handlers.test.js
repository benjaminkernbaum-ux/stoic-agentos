import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SDK = fileURLToPath(new URL('./index.js', import.meta.url));

/** Run a child script that imports the SDK; optionally send SIGINT once it reports ready. */
function runChild(body, { sigint = false } = {}) {
  const script = `
    import { AgentOS } from ${JSON.stringify(SDK)};
    ${body}
    console.log('READY');
  `;
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
      if (sigint && stdout.includes('READY')) { sigint = false; child.kill('SIGINT'); }
    });
    child.stderr.on('data', (d) => { stderr += d; });
    const killer = setTimeout(() => child.kill('SIGKILL'), 8000);
    child.on('exit', (code, signal) => { clearTimeout(killer); resolve({ code, signal, stdout, stderr }); });
  });
}

const NEW = `new AgentOS({ apiKey: 'sk_test_x', apiUrl: 'http://127.0.0.1:9' })`;

describe('process exit handling', () => {
  it('registers one SIGINT/beforeExit listener no matter how many instances', async () => {
    const r = await runChild(`
      for (let i = 0; i < 20; i++) ${NEW};
      console.log('LISTENERS', process.listenerCount('SIGINT'), process.listenerCount('beforeExit'));
    `);
    expect(r.stdout).toContain('LISTENERS 1 1');
    expect(r.stderr).not.toContain('MaxListenersExceededWarning');
  });

  it("does not take over the app's own SIGINT handling", async () => {
    const r = await runChild(`
      ${NEW};
      process.on('SIGINT', () => { console.log('APP_HANDLER'); setTimeout(() => process.exit(7), 50); });
      setInterval(() => {}, 1000);
    `, { sigint: true });
    expect(r.stdout).toContain('APP_HANDLER');
    expect(r.code).toBe(7);
  });

  it('without an app handler, SIGINT still terminates the process by signal (not exit 0)', async () => {
    const r = await runChild(`
      ${NEW};
      setInterval(() => {}, 1000);
    `, { sigint: true });
    expect(r.signal).toBe('SIGINT');
  });

  it('does not keep an otherwise-finished process alive', async () => {
    const r = await runChild(`${NEW};`);
    expect(r.code).toBe(0);
    expect(r.signal).toBeNull();
  });

  it('handleSignals: false registers nothing', async () => {
    const r = await runChild(`
      new AgentOS({ apiKey: 'sk_test_x', handleSignals: false });
      console.log('LISTENERS', process.listenerCount('SIGINT'), process.listenerCount('beforeExit'));
    `);
    expect(r.stdout).toContain('LISTENERS 0 0');
  });
});
