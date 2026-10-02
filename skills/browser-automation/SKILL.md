---
name: browser-automation
description: Browser automation powers web testing, scraping, and AI agent. Use when the task involves browser automation.
  interactions. The difference between a flaky script and a reliable system
  comes down to understanding selectors, waiting strategies, and anti-detection
  patterns.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Browser Automation

Browser automation powers web testing, scraping, and AI agent interactions.
The difference between a flaky script and a reliable system comes down to
understanding selectors, waiting strategies, and anti-detection patterns.

This skill covers Playwright (recommended) and Puppeteer, with patterns for
testing, scraping, and agentic browser control. Key insight: Playwright won
the framework war. Unless you need Puppeteer's stealth ecosystem or are
Chrome-only, Playwright is the better choice in 2025.

Critical distinction: Testing automation (predictable apps you control) vs
scraping/agent automation (unpredictable sites that fight back). Different
problems, different solutions.

## Principles

- Use user-facing locators (getByRole, getByText) over CSS/XPath
- Never add manual waits - Playwright's auto-wait handles it
- Each test/task should be fully isolated with fresh context
- Screenshots and traces are your debugging lifeline
- Headless for CI, headed for debugging
- Anti-detection is cat-and-mouse - stay current or get blocked

## Capabilities

- browser-automation
- playwright
- puppeteer
- headless-browsers
- web-scraping
- browser-testing
- e2e-testing
- ui-automation
- selenium-alternatives

## Scope

- api-testing → backend
- load-testing → performance-thinker
- accessibility-testing → accessibility-specialist
- visual-regression-testing → ui-design

## Tooling

### Frameworks

- Playwright - When: Default choice - cross-browser, auto-waiting, best DX Note: 96% success rate, 4.5s avg execution, Microsoft-backed
- Puppeteer - When: Chrome-only, need stealth plugins, existing codebase Note: 75% success rate at scale, but best stealth ecosystem
- Selenium - When: Legacy systems, specific language bindings Note: Slower, more verbose, but widest browser support

### Stealth_tools

- puppeteer-extra-plugin-stealth - When: Need to bypass bot detection with Puppeteer Note: Gold standard for anti-detection
- playwright-extra - When: Stealth plugins for Playwright Note: Port of puppeteer-extra ecosystem
- undetected-chromedriver - When: Selenium anti-detection Note: Dynamic bypass of detection

### Cloud_browsers

- Browserbase - When: Managed headless infrastructure Note: Built-in stealth mode, session management
- BrowserStack - When: Cross-browser testing at scale Note: Real devices, CI integration

## Patterns

### Test Isolation Pattern

Each test runs in complete isolation with fresh state

**When to use**: Testing, any automation that needs reproducibility

# TEST ISOLATION:

"""
Each test gets its own:
- Browser context (cookies, storage)
- Fresh page
- Clean state
"""

## Playwright Test Example
"""
import { test, expect } from '@playwright/test';

// Each test runs in isolated browser context
test('user can add item to cart', async ({ page }) => {
  // Fresh context - no cookies, no storage from other tests
  await page.goto('/products');
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});

test('user can remove item from cart', async ({ page }) => {
  // Completely isolated - cart is empty
  await page.goto('/cart');
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});
"""

## Shared Authentication Pattern
"""
// Save auth state once, reuse across tests
// setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for auth to complete
  await page.waitForURL('/dashboard');

  // Save authentication state
  await page.context().storageState({
    path: './playwright/.auth/user.json'
  });
});

// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'tests',
      dependencies: ['setup'],
      use: {
        storageState: './playwright/.auth/user.json',
      },
    },
  ],
});
"""

### User-Facing Locator Pattern

Select elements the way users see them

**When to use**: Always - the default approach for selectors

# USER-FACING LOCATORS:

"""
Priority order:
1. getByRole  - Best: matches accessibility tree
2. getByText  - Good: matches visible content
3. getByLabel - Good: matches form labels
4. getByTestId - Fallback: explicit test contracts
5. CSS/XPath - Last resort: fragile, avoid
"""

## Good Examples (User-Facing)
"""
// By role - THE BEST CHOICE
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('link', { name: 'Sign up' }).click();
await page.getByRole('heading', { name: 'Dashboard' }).isVisible();
await page.getByRole('textbox', { name: 'Search' }).fill('query');

// By text content
await page.getByText('Welcome back').isVisible();
await page.getByText(/Order #/d+/).click();  // Regex supported

// By label (forms)
await page.getByLabel('Email address').fill('user@example.com');
await page.getByLabel('Password').fill('secret');

// By placeholder
await page.getByPlaceholder('Search...').fill('query');

// By test ID (when no user-facing option works)
await page.getByTestId('submit-button').click();
"""

## Bad Examples (Fragile)
"""
// DON'T - CSS selectors tied to structure
await page.locator('.btn-primary.submit-form').click();
await page.locator('#header > div > button:nth-child(2)').click();

// DON'T - XPath tied to structure
await page.locator('//div[@class="form"]/button[1]').click();

// DON'T - Auto-generated selectors
await page.locator('[data-v-12345]').click();
"""

## Filtering and Chaining
"""
// Filter by containing text
await page.getByRole('listitem')
  .filter({ hasText: 'Product A' })
  .getByRole('button', { name: 'Add to cart' })
  .click();

// Filter by NOT containing
await page.getByRole('listitem')
  .filter({ hasNotText: 'Sold out' })
  .first()
  .click();

// Chain locators
const row = page.getByRole('row', { name: 'John Doe' });
await row.getByRole('button', { name: 'Edit' }).click();
"""

### Auto-Wait Pattern

Let Playwright wait automatically, never add manual waits

**When to use**: Always with Playwright

# AUTO-WAIT PATTERN:

"""
Playwright waits automatically for:
- Element to be attached to DOM
- Element to be visible
- Element to be stable (not animating)
- Element to receive events
- Element to be enabled

NEVER add manual waits!
"""

## Wrong - Manual Waits
"""
// DON'T DO THIS
await page.goto('/dashboard');
await page.waitForTimeout(2000);  // NO! Arbitrary wait
await page.click('.submit-button');

// DON'T DO THIS
await page.waitForSelector('.loading-spinner', { state: 'hidden' });
await page.waitForTimeout(500);  // "Just to be safe" - NO!
"""

## Correct - Let Auto-Wait Work
"""
// Auto-waits for button to be clickable
await page.getByRole('button', { name: 'Submit' }).click();

// Auto-waits for text to appear
await expect(page.getByText('Success!')).toBeVisible();

// Auto-waits for navigation to complete
await page.goto('/dashboard');
// Page is ready - no manual wait needed
"""

## When You DO Need to Wait
"""
// Wait for specific network request
const responsePromise = page.waitForResponse(
  response => response.url().includes('/api/data')
);
await page.getByRole('button', { name: 'Load' }).click();
const response = await responsePromise;

// Wait for URL change
await Promise.all([
  page.waitForURL('**/dashboard'),
  page.getByRole('button', { name: 'Login' }).click(),
]);

// Wait for download
const downloadPromise = page.waitForEvent('download');
await page.getByText('Export CSV').click();
const download = await downloadPromise;
"""

### Stealth Browser Pattern

Avoid bot detection for scraping

**When to use**: Scraping sites with anti-bot protection

# STEALTH BROWSER PATTERN:

"""
Bot detection checks for:
- navigator.webdriver property
- Chrome DevTools protocol artifacts
- Browser fingerprint inconsistencies
- Behavioral patterns (perfect timing, no mouse movement)
- Headless indicators
"""

## Puppeteer Stealth (Best Anti-Detection)
"""
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
  ],
});

const page = await browser.newPage();

// Set realistic viewport
await page.setViewport({ width: 1920, height: 1080 });

// Realistic user agent
await page.setUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
);

// Navigate with human-like behavior
await page.goto('https://target-site.com', {
  waitUntil: 'networkidle0',
});
"""

## Playwright Stealth
"""
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 ...',
  locale: 'en-US',
  timezoneId: 'America/New_York',
});
"""

## Human-Like Behavior
"""
// Random delays between actions
const randomDelay = (min: number, max: number) =>
  new Promise(r => setTimeout(r, Math.random() * (max - min) + min));

await page.goto(url);
await randomDelay(500, 1500);

// Mouse movement before click
const button = await page.$('button.submit');
const box = await button.boundingBox();
await page.mouse.move(
  box.x + box.width / 2,
  box.y + box.height / 2,
  { steps: 10 }  // Move in steps like a human
);
await randomDelay(100, 300);
await button.click();

// Scroll naturally
await page.evaluate(() => {
  window.scrollBy({
    top: 300 + Math.random() * 200,
    behavior: 'smooth'
  });
});
"""

### Error Recovery Pattern

Handle failures gracefully with screenshots and retries

**When to use**: Any production automation

# ERROR RECOVERY PATTERN:

## Automatic Screenshot on Failure
"""
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  retries: 2,  // Retry failed tests
});
"""

## Try-Catch with Debug Info
"""
async function scrapeProduct(page: Page, url: string) {
  try {
    await page.goto(url, { timeout: 30000 });

    const title = await page.getByRole('heading', { level: 1 }).textContent();
    const price = await page.getByTestId('price').textContent();

    return { title, price, success: true };

  } catch (error) {
    // Capture debug info
    const screenshot = await page.screenshot({
      path: `errors/${Date.now()}-error.png`,
      fullPage: true
    });

    const html = await page.content();
    await fs.writeFile(`errors/${Date.now()}-page.html`, html);

    console.error({
      url,
      error: error.message,
      currentUrl: page.url(),
    });

    return { success: false, error: error.message };
  }
}
"""

## Retry with Exponential Backoff
"""
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = delay * 0.1 * Math.random();
        await new Promise(r => setTimeout(r, delay + jitter));
      }
    }
  }

  throw lastError;
}

// Usage
const result = await withRetry(
  () => scrapeProduct(page, url),
  3,
  2000
);
"""

### Parallel Execution Pattern

Run tests/tasks in parallel for speed

**When to use**: Multiple independent pages or tests

# PARALLEL EXECUTION:

## Playwright Test Parallelization
"""
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,  // CI: 4 workers, local: CPU-based

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
"""

## Browser Contexts for Parallel Scraping
"""


> See [references/details.md](references/details.md) for extended content.
