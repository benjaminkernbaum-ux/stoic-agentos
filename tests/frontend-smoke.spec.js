import { test, expect } from '@playwright/test';

test('Frontend mounts successfully with zero console/page errors', async ({ page }) => {
  const errors = [];
  
  // Helper to filter out known benign 404s like Vercel analytics in local development
  const isIgnoredUrl = (url) => {
    return url.includes('/_vercel/insights') || url.includes('/_vercel/speed-insights');
  };

  page.on('console', msg => {
    const text = msg.text();
    // Ignore generic browser network messages in console since we handle them in response/requestfailed events
    if (msg.type() === 'error' && !text.includes('Failed to load resource') && !isIgnoredUrl(text)) {
      errors.push(`Console error: ${text}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page error: ${err.message}\n${err.stack}`);
  });

  page.on('requestfailed', request => {
    const url = request.url();
    if (!isIgnoredUrl(url)) {
      const failure = request.failure();
      errors.push(`Request failed: ${url} (${failure ? failure.errorText : 'Unknown error'})`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    if (response.status() >= 400 && !isIgnoredUrl(url)) {
      errors.push(`Response failed: ${url} (Status ${response.status()})`);
    }
  });

  // Navigate to local preview URL (baseURL configured in playwright.config.js)
  console.log('Navigating to landing page...');
  await page.goto('/', { waitUntil: 'networkidle' });

  // Wait a short duration to capture any post-mount errors
  await page.waitForTimeout(2000);

  // Assert no errors occurred during mount/load
  if (errors.length > 0) {
    console.error('Captured errors during page load:', errors);
  }
  expect(errors).toEqual([]);
});
