# K6 Load Testing — Code Reference

## ### Quick Start

```javascript
// simple-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('https://httpbin.test.k6.io/get');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```


## ### Common Options

```javascript
export const options = {
  // Virtual Users (concurrent users)
  vus: 100,
  
  // Test duration
  duration: '5m',
  
  // Or use stages for ramp-up/ramp-down
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m', target: 100 },  // Stay at 100
    { duration: '30s', target: 0 },    // Ramp down
  ],
  
  // Thresholds (SLA)
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],     // Error rate < 1%
  },
  
  // Load zones (distributed testing)
  ext: {
    loadimpact: {
      name: 'My Load Test',
      distribution: {
        'amazon:us:ashburn': { weight: 50 },
        'amazon:eu: Dublin': { weight: 50 },
      },
    },
  },
};
```


## ### Basic Requests

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  // GET request
  const getRes = http.get('https://api.example.com/users');
  
  check(getRes, {
    'GET succeeded': (r) => r.status === 200,
    'has users': (r) => r.json('data.length') > 0,
  });

  // POST request with JSON body
  const postRes = http.post('https://api.example.com/users', 
    JSON.stringify({ name: 'Test User', email: 'test@example.com' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + __ENV.API_TOKEN,
      },
    }
  );
  
  check(postRes, {
    'POST succeeded': (r) => r.status === 201,
    'user created': (r) => r.json('id') !== undefined,
  });

  sleep(1);
}
```


## ### Request Chaining

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  // Login and extract token
  const loginRes = http.post('https://api.example.com/login', 
    JSON.stringify({ email: 'test@example.com', password: 'password123' })
  );
  
  const token = loginRes.json('access_token');
  
  // Use token in subsequent requests
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const profileRes = http.get('https://api.example.com/profile', {
    headers: headers,
  });
  
  check(profileRes, {
    'profile loaded': (r) => r.status === 200,
  });
}
```


## ## Browser Testing (k6 Browser)

```javascript
import { browser } from 'k6/browser';

export const options = {
  scenarios: {
    browser_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      browser: {
        type: 'chromium',
      },
    },
  },
};

export default async function () {
  const page = await browser.newPage();
  
  try {
    await page.goto('https://example.com');
    
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Click and interact
    await page.click('button[data-testid="submit"]');
    
    // Wait for response
    await page.waitForSelector('.success-message');
    
  } finally {
    await page.close();
  }
}
```


## ## WebSocket Testing

```javascript
import ws from 'k6/ws';
import { check } from 'k6';

export default function () {
  const url = 'wss://echo.websocket.org';
  
  ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');
      socket.send('Hello WebSocket');
    });
    
    socket.on('message', (data) => {
      console.log(`Received: ${data}`);
      check(data, {
        'echo received': (d) => d.includes('Hello'),
      });
    });
    
    socket.on('close', () => {
      console.log('WebSocket closed');
    });
    
    // Send periodic messages
    socket.setInterval(function () {
      socket.send('ping');
    }, 1000);
    
    // Close after 5 seconds
    socket.setTimeout(function () {
      socket.close();
    }, 5000);
  });
}
```


## ### CSV Data Source

```javascript
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

// Option 1: Load once, shared across VUs
const users = new SharedArray('users', function () {
  return open('./users.csv').split('/n').slice(1).map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
});

export default function () {
  const user = users[__VU % users.length];
  
  const res = http.post('https://api.example.com/login',
    JSON.stringify({ email: user.email, password: user.password })
  );
  
  check(res, { 'login successful': (r) => r.status === 200 });
}
```


## ### Counters

```javascript
import http from 'k6/http';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// Define custom metrics
const myCounter = new Counter('api_calls_total');
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');
const activeUsers = new Gauge('active_users');

export default function () {
  const res = http.get('https://api.example.com/data');
  
  // Increment counter
  myCounter.add(1);
  
  // Add to trend (for percentiles)
  responseTime.add(res.timings.duration);
  
  // Track error rate
  errorRate.add(res.status !== 200);
  
  // Set gauge value
  activeUsers.add(__VU);
  
  // Tagged metrics
  const taggedRes = http.get('https://api.example.com/users', {
    tags: { endpoint: 'users', env: 'prod' },
  });
}
```


## ### GitHub Actions

```yaml
# .github/workflows/load-test.yml
name: Load Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup k6
        uses: grafana/k6-action@v0.2.0
        
      - name: Run load test
        env:
          API_TOKEN: ${{ secrets.API_TOKEN }}
        run: k6 run --out json=results.json load-test.js
        
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: results.json
          
      - name: Check thresholds
        if: failure()
        run: |
          echo "Load test failed thresholds!"
          exit 1
```


## ### Example 1: Basic API Load Test

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/users');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```


## ### Example 2: Test with Authentication and Data Parameterization

```javascript
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));
});

export default function () {
  const user = users[__VU % users.length];
  
  const loginRes = http.post('https://api.example.com/login',
    JSON.stringify({ email: user.email, password: user.password })
  );
  
  const token = loginRes.json('access_token');
  
  const headers = { 'Authorization': `Bearer ${token}` };
  const res = http.get('https://api.example.com/profile', { headers });
  
  check(res, { 'profile loaded': (r) => r.status === 200 });
}
```


