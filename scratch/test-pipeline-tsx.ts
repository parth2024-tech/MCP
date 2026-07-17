import path from 'path';

// Mock heavy services
const mockContainer = {
  resolve: (name: string) => {
    if (name === 'ToolRegistry') return { get: () => null, getSchemas: () => [] };
    if (name === 'ToolSearch') return { findRelevantTools: (_q: string) => [{ name: 'test', description: 'test', relevance_score: 1.0 }] };
    if (name === 'VirtualKeyManager') return { isAuthorized: () => true };
    if (name === 'SpokeManager') return { callTool: () => { throw new Error('no spoke'); } };
    if (name === 'SessionToolCache') return { get: () => null, set: () => {} };
    if (name === 'TokenSecret') return 'test-secret';
    return null;
  }
};

import { Pipeline } from '../src/middleware/Pipeline';
import { ConcurrencyMiddleware } from '../src/middleware/ConcurrencyMiddleware';
import { AuthMiddleware } from '../src/middleware/AuthMiddleware';
import { SpokeProxyMiddleware } from '../src/middleware/SpokeProxyMiddleware';
import { CacheMiddleware } from '../src/middleware/CacheMiddleware';
import { ToolExecutionMiddleware } from '../src/middleware/ToolExecutionMiddleware';
import { MetricsMiddleware } from '../src/middleware/MetricsMiddleware';

const pipeline = new Pipeline()
  .use(new ConcurrencyMiddleware())
  .use(new MetricsMiddleware())
  .use(new AuthMiddleware())
  .use(new SpokeProxyMiddleware())
  .use(new CacheMiddleware())
  .use(new ToolExecutionMiddleware());

const context: any = {
  container: mockContainer,
  reqId: 'test-123',
  name: 'search_tools',
  args: { query: 'openhands' },
  extra: {}
};

console.log('Testing pipeline directly...');
const start = Date.now();
Promise.race([
  pipeline.execute(context),
  new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT after 5s')), 5000))
]).then(result => {
  console.log(`✅ Pipeline responded in ${Date.now() - start}ms`, JSON.stringify(result).substring(0, 200));
  process.exit(0);
}).catch(err => {
  console.log(`❌ Error in ${Date.now() - start}ms: ${err.message}`);
  process.exit(1);
});
