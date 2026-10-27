import { describe, it, expect, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { POST_COMMIT_HOOK } from './git-hook.js';

let server;
let dir;
afterEach(() => {
  server?.close();
  // The hook's background node process may still hold the dir briefly (Windows)
  try { if (dir) rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch { /* temp dir */ }
});

describe('git post-commit hook', () => {
  it('sends a signed, valid-JSON body even when the commit message has quotes and newlines', async () => {
    const apiKey = 'sk_test_hook_key';
    const received = new Promise((resolve) => {
      server = createServer((req, res) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          res.writeHead(201).end('{}');
          resolve({ url: req.url, headers: req.headers, raw: Buffer.concat(chunks).toString('utf8') });
        });
      }).listen(0);
    });
    await new Promise((r) => server.once('listening', r));
    const apiUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

    dir = mkdtempSync(join(tmpdir(), 'agentos-hook-'));
    const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
    git('init', '-q', '-b', 'main');
    git('config', 'user.name', 'Ana "T" Tester');
    git('config', 'user.email', 'ana@example.com');
    writeFileSync(join(dir, '.agentos.json'), JSON.stringify({ api_key: apiKey, api_url: apiUrl }));
    writeFileSync(join(dir, '.git', 'hooks', 'post-commit'), POST_COMMIT_HOOK, { mode: 0o755 });
    writeFileSync(join(dir, 'a.txt'), 'x');
    git('add', 'a.txt');
    const message = 'fix: handle "quoted" input\n\nsecond line with \'single\' quotes';
    git('commit', '-q', '-m', message);

    const req = await Promise.race([
      received,
      new Promise((_, rej) => setTimeout(() => rej(new Error('hook never called the API')), 10000)),
    ]);

    expect(req.url).toBe('/api/v1/webhooks/git');
    const expected = 'sha256=' + createHmac('sha256', apiKey).update(req.raw, 'utf8').digest('hex');
    expect(req.headers['x-webhook-signature']).toBe(expected);
    const body = JSON.parse(req.raw);
    expect(body).toMatchObject({ api_key: apiKey, branch: 'main', author: 'Ana "T" Tester', commit_message: message });
    expect(body.commit_hash).toMatch(/^[0-9a-f]{40}$/);
  }, 20000);
});
