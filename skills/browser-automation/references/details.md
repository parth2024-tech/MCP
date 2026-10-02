# Browser Automation — Extended Reference

const browser = await chromium.launch();

const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];

// Create multiple contexts - each is isolated
const results = await Promise.all(
  urls.map(async (url) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url);
      const data = await extractData(page);
      return { url, data, success: true };
    } catch (error) {
      return { url, error: error.message, success: false };
    } finally {
      await context.close();
    }
  })
);

await browser.close();
"""

## Rate-Limited Parallel Processing
"""
import pLimit from 'p-limit';

const limit = pLimit(5);  // Max 5 concurrent

const results = await Promise.all(
  urls.map(url => limit(async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Random delay between requests
    await new Promise(r => setTimeout(r, Math.random() * 2000));

    try {
      return await scrapePage(page, url);
    } finally {
      await context.close();
    }
  }))
);
"""

### Network Interception Pattern

Mock, block, or modify network requests

**When to use**: Testing, blocking ads/analytics, modifying responses

# NETWORK INTERCEPTION:

## Block Unnecessary Resources
"""
await page.route('**/*', (route) => {
  const url = route.request().url();
  const resourceType = route.request().resourceType();

  // Block images, fonts, analytics for faster scraping
  if (['image', 'font', 'media'].includes(resourceType)) {
    return route.abort();
  }

  // Block tracking/analytics
  if (url.includes('google-analytics') ||
      url.includes('facebook.com/tr')) {
    return route.abort();
  }

  return route.continue();
});
"""

## Mock API Responses (Testing)
"""
await page.route('**/api/products', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { id: 1, name: 'Mock Product', price: 99.99 },
    ]),
  });
});

// Now page will receive mocked data
await page.goto('/products');
"""

## Capture API Responses
"""
const apiResponses: any[] = [];

page.on('response', async (response) => {
  if (response.url().includes('/api/')) {
    const data = await response.json().catch(() => null);
    apiResponses.push({
      url: response.url(),
      status: response.status(),
      data,
    });
  }
});

await page.goto('/dashboard');
// apiResponses now contains all API calls
"""

## Sharp Edges

### Using waitForTimeout Instead of Proper Waits

Severity: CRITICAL

Situation: Waiting for elements or page state

Symptoms:
Tests pass locally, fail in CI. Pass 9 times, fail on the 10th.
"Element not found" errors that seem random. Tests take 30+ seconds
when they should take 3.

Why this breaks:
waitForTimeout is a fixed delay. If the page loads in 500ms, you wait
2000ms anyway. If the page takes 2100ms (CI is slower), you fail.
There's no correct value - it's always either too short or too long.

Recommended fix:

# REMOVE all waitForTimeout calls

# WRONG:
await page.goto('/dashboard');
await page.waitForTimeout(2000);  # Arbitrary!
await page.click('.submit');

# CORRECT - Auto-wait handles it:
await page.goto('/dashboard');
await page.getByRole('button', { name: 'Submit' }).click();

# If you need to wait for specific condition:
await expect(page.getByText('Dashboard')).toBeVisible();
await page.waitForURL('**/dashboard');
await page.waitForResponse(resp => resp.url().includes('/api/data'));

# For animations, wait for element to be stable:
await page.getByRole('button').click();  # Auto-waits for stable

# NEVER use setTimeout or waitForTimeout in production code

### CSS Selectors Tied to Styling Classes

Severity: HIGH

Situation: Selecting elements for interaction

Symptoms:
Tests break after CSS refactoring. Selectors like .btn-primary stop
working. Frontend redesign breaks all tests without changing behavior.

Why this breaks:
CSS class names are implementation details for styling, not semantic
meaning. When designers change from .btn-primary to .button--primary,
your tests break even though behavior is identical.

Recommended fix:

# Use user-facing locators instead:

# WRONG - Tied to CSS:
await page.locator('.btn-primary.submit-form').click();
await page.locator('#sidebar > div.menu > ul > li:nth-child(3)').click();

# CORRECT - User-facing:
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('menuitem', { name: 'Settings' }).click();

# If you must use CSS, use data-testid:
<button data-testid="submit-order">Submit</button>

await page.getByTestId('submit-order').click();

# Locator priority:
# 1. getByRole - matches accessibility
# 2. getByText - matches visible content
# 3. getByLabel - matches form labels
# 4. getByTestId - explicit test contract
# 5. CSS/XPath - last resort only

### navigator.webdriver Exposes Automation

Severity: HIGH

Situation: Scraping sites with bot detection

Symptoms:
Immediate 403 errors. CAPTCHA challenges. Empty pages. "Access Denied"
messages. Works for 1 request, then gets blocked.

Why this breaks:
By default, headless browsers set navigator.webdriver = true. This is
the first thing bot detection checks. It's a bright red flag that
says "I'm automated."

Recommended fix:

# Use stealth plugins:

### Puppeteer Stealth (best option):
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--disable-blink-features=AutomationControlled'],
});

### Playwright Stealth:
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

### Manual (partial):
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });
});

# Note: This is cat-and-mouse. Detection evolves.
# For serious scraping, consider managed solutions like Browserbase.

### Tests Share State and Affect Each Other

Severity: HIGH

Situation: Running multiple tests in sequence

Symptoms:
Tests pass individually but fail when run together. Order matters -
test B fails if test A runs first. Random failures that "fix themselves"
on rerun.

Why this breaks:
Shared browser context means shared cookies, localStorage, and session
state. Test A logs in, test B expects logged-out state. Test A adds
item to cart, test B's cart count is wrong.

Recommended fix:

# Each test must be fully isolated:

### Playwright Test (automatic isolation):
test('first test', async ({ page }) => {
  // Fresh context, fresh page
});

test('second test', async ({ page }) => {
  // Completely isolated from first test
});

### Manual isolation:
const context = await browser.newContext();  // Fresh context
const page = await context.newPage();
// ... test code ...
await context.close();  // Clean up

## Shared authentication (the right way):
// 1. Save auth state to file
await context.storageState({ path: './auth.json' });

// 2. Reuse in other tests
const context = await browser.newContext({
  storageState: './auth.json'
});

# Never modify global state in tests
# Never rely on previous test's actions

### No Trace Capture for CI Failures

Severity: MEDIUM

Situation: Debugging test failures in CI

Symptoms:
"Test failed in CI" with no useful information. Can't reproduce
locally. Screenshot shows page but not what went wrong. Guessing
at root cause.

Why this breaks:
CI runs headless on different hardware. Timing is different. Network
is different. Without traces, you can't see what actually happened -
the sequence of actions, network requests, console logs.

Recommended fix:

# Enable traces for failures:

### playwright.config.ts:
export default defineConfig({
  use: {
    trace: 'retain-on-failure',    # Keep trace on failure
    screenshot: 'only-on-failure', # Screenshot on failure
    video: 'retain-on-failure',    # Video on failure
  },
  outputDir: './test-results',
});

### View trace locally:
npx playwright show-trace test-results/path/to/trace.zip

### In CI, upload test-results as artifact:
# GitHub Actions:
- uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: playwright-traces
    path: test-results/

# Trace shows:
# - Timeline of actions
# - Screenshots at each step
# - Network requests and responses
# - Console logs
# - DOM snapshots

### Tests Pass Headed but Fail Headless

Severity: MEDIUM

Situation: Running tests in headless mode for CI

Symptoms:
Works perfectly when you watch it. Fails mysteriously in CI.
"Element not visible" in headless but visible in headed mode.

Why this breaks:
Headless browsers have no display, which affects some CSS (visibility
calculations), viewport sizing, and font rendering. Some animations
behave differently. Popup windows may not work.

Recommended fix:

# Set consistent viewport:
const browser = await chromium.launch({
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});

# Or in config:
export default defineConfig({
  use: {
    viewport: { width: 1280, height: 720 },
  },
});

# Debug headless failures:
# 1. Run with headed mode locally
npx playwright test --headed

# 2. Slow down to watch
npx playwright test --headed --slowmo 100

# 3. Use trace viewer for CI failures
npx playwright show-trace trace.zip

# 4. For stubborn issues, screenshot at failure point:
await page.screenshot({ path: 'debug.png', fullPage: true });

### Getting Blocked by Rate Limiting

Severity: HIGH

Situation: Scraping multiple pages quickly

Symptoms:
Works for first 50 pages, then 429 errors. Suddenly all requests fail.
IP gets blocked. CAPTCHA starts appearing after successful requests.

Why this breaks:
Sites monitor request patterns. 100 requests per second from one IP
is obviously automated. Rate limits protect servers and catch scrapers.

Recommended fix:

# Add delays between requests:

const randomDelay = () =>
  new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

for (const url of urls) {
  await randomDelay();  // 1-3 second delay
  await page.goto(url);
  // ... scrape ...
}

# Use rotating proxies:
const proxies = ['http://proxy1:8080', 'http://proxy2:8080'];
let proxyIndex = 0;

const getNextProxy = () => proxies[proxyIndex++ % proxies.length];

const context = await browser.newContext({
  proxy: { server: getNextProxy() },
});

# Limit concurrent requests:
import pLimit from 'p-limit';
const limit = pLimit(3);  // Max 3 concurrent

await Promise.all(
  urls.map(url => limit(() => scrapePage(url)))
);

# Rotate user agents:
const userAgents = [
  'Mozilla/5.0 (Windows...',
  'Mozilla/5.0 (Macintosh...',
];

await page.setExtraHTTPHeaders({
  'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)]
});

### New Windows/Popups Not Handled

Severity: MEDIUM

Situation: Clicking links that open new windows

Symptoms:
Click button, nothing happens. Test hangs. "Window not found" errors.
Actions succeed but verification fails because you're on wrong page.

Why this breaks:
target="_blank" links open new windows. Your page reference still
points to the original page. The new window exists but you're not
listening for it.

Recommended fix:

# Wait for popup BEFORE triggering it:

### New window/tab:
const pagePromise = context.waitForEvent('page');
await page.getByRole('link', { name: 'Open in new tab' }).click();
const newPage = await pagePromise;
await newPage.waitForLoadState();

// Now interact with new page
await expect(newPage.getByRole('heading')).toBeVisible();

// Close when done
await newPage.close();

### Popup windows:
const popupPromise = page.waitForEvent('popup');
await page.getByRole('button', { name: 'Open popup' }).click();
const popup = await popupPromise;
await popup.waitForLoadState();

### Multiple windows:
const pages = context.pages();  // Get all open pages

### Can't Interact with Elements in iframes

Severity: MEDIUM

Situation: Page contains embedded iframes

Symptoms:
Element clearly visible but "not found". Selector works in DevTools
but not in Playwright. Parent page selectors work, iframe content
doesn't.

Why this breaks:
iframes are separate documents. page.locator only searches the main
frame. You need to explicitly get the iframe's frame to interact
with its contents.

Recommended fix:

# Get frame by name or selector:

### By frame name:
const frame = page.frame('payment-iframe');
await frame.getByRole('textbox', { name: 'Card number' }).fill('4242...');

## By selector:
const frame = page.frameLocator('iframe#payment');
await frame.getByRole('textbox', { name: 'Card number' }).fill('4242...');

### Nested iframes:
const outer = page.frameLocator('iframe#outer');
const inner = outer.frameLocator('iframe#inner');
await inner.getByRole('button').click();

### Wait for iframe to load:
await page.waitForSelector('iframe#payment');
const frame = page.frameLocator('iframe#payment');
await frame.getByText('Secure Payment').waitFor();

## Validation Checks

### Using waitForTimeout

Severity: ERROR

waitForTimeout causes flaky tests and slow execution

Message: Using waitForTimeout - remove it. Playwright auto-waits for elements. Use waitForResponse, waitForURL, or assertions instead.

### Using setTimeout in Test Code

Severity: WARNING

setTimeout is unreliable for timing in tests

Message: Using setTimeout instead of Playwright waits. Replace with await expect(...).toBeVisible() or page.waitFor*.

### Custom Sleep Function

Severity: WARNING

Sleep functions indicate improper waiting strategy

Message: Custom sleep function detected. Use Playwright's built-in waiting mechanisms instead.

### CSS Class Selector Used

Severity: WARNING

CSS class selectors are fragile

Message: Using CSS class selector. Prefer getByRole, getByText, getByLabel, or getByTestId for more stable selectors.

### nth-child CSS Selector

Severity: WARNING

Position-based selectors are very fragile

Message: Using position-based selector. These break when DOM order changes. Use user-facing locators instead.

### XPath Selector Used

Severity: INFO

XPath should be last resort

Message: Using XPath selector. Consider getByRole, getByText first. XPath should be last resort for complex DOM traversal.

### Auto-Generated Selector

Severity: WARNING

Framework-generated selectors are extremely fragile

Message: Using auto-generated selector. These change on every build. Use data-testid instead.

### Puppeteer Without Stealth Plugin

Severity: INFO

Scraping without stealth is easily detected

Message: Using Puppeteer without stealth plugin. Consider puppeteer-extra-plugin-stealth for anti-detection.

### navigator.webdriver Not Hidden

Severity: INFO

navigator.webdriver exposes automation

Message: Launching browser without hiding automation flags. For scraping, add stealth measures.

### Scraping Loop Without Error Handling

Severity: WARNING

One failure shouldn't crash entire scrape

Message: Scraping loop without try/catch. One page failure will crash the entire scrape. Add error handling.

## Collaboration

### Delegation Triggers

- user needs full desktop control beyond browser -> computer-use-agents (Desktop automation for non-browser apps)
- user needs API testing alongside browser tests -> backend (API integration and testing patterns)
- user needs testing strategy -> test-architect (Overall test architecture decisions)
- user needs visual regression testing -> ui-design (Visual comparison and design validation)
- user needs browser automation in workflows -> workflow-automation (Durable execution for browser tasks)
- user building browser tools for agents -> agent-tool-builder (Tool design patterns for LLM agents)

## Related Skills

Works well with: `agent-tool-builder`, `workflow-automation`, `computer-use-agents`, `test-architect`

## When to Use
- User mentions or implies: playwright
- User mentions or implies: puppeteer
- User mentions or implies: browser automation
- User mentions or implies: headless
- User mentions or implies: web scraping
- User mentions or implies: e2e test
- User mentions or implies: end-to-end
- User mentions or implies: selenium
- User mentions or implies: chromium
- User mentions or implies: browser test
- User mentions or implies: page.click
- User mentions or implies: locator

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
