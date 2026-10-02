# Fp Refactor — Code Reference

## #### Before (Imperative)

```typescript
function parseJSON(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`);
  }
}

function validateUser(data: unknown): User {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Data must be an object');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj.name !== 'string') {
      throw new Error('Name is required');
    }
    if (typeof obj.age !== 'number') {
      throw new Error('Age must be a number');
    }
    return { name: obj.name, age: obj.age };
  } catch (error) {
    throw error;
  }
}

// Usage with nested try-catch
function processUserInput(input: string): User | null {
  try {
    const data = parseJSON(input);
    const user = validateUser(data);
    return user;
  } catch (error) {
    console.error('Failed to process user:', error);
    return null;
  }
}
```


```typescript
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    return validateUser(data);
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error}`);
  }
}

async function fetchUserPosts(userId: string): Promise<Post[]> {
  try {
    const response = await fetch(`/api/users/${userId}/posts`);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch posts: ${error}`);
  }
}

// Complex orchestration with try-catch
async function getUserWithPosts(id: string): Promise<{ user: User; posts: Post[] } | null> {
  try {
    const user = await fetchUser(id);
    const posts = await fetchUserPosts(id);
    return { user, posts };
  } catch (error) {
    console.error(error);
    return null;
  }
}
```


```typescript
interface Config {
  database?: {
    host?: string;
    port?: number;
    credentials?: {
      username?: string;
      password?: string;
    };
  };
}

function getDatabaseUrl(config: Config): string | null {
  if (!config.database) {
    return null;
  }
  if (!config.database.host) {
    return null;
  }
  const port = config.database.port ?? 5432;

  let auth = '';
  if (config.database.credentials) {
    if (config.database.credentials.username && config.database.credentials.password) {
      auth = `${config.database.credentials.username}:${config.database.credentials.password}@`;
    }
  }

  return `postgres://${auth}${config.database.host}:${port}`;
}

// Usage requires null check
const url = getDatabaseUrl(config);
if (url !== null) {
  connectToDatabase(url);
} else {
  console.error('Database URL not configured');
}
```


```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function findUserById(users: User[], id: string): User | undefined {
  return users.find((u) => u.id === id);
}

function getUserEmail(users: User[], id: string): string | null {
  const user = findUserById(users, id);
  if (!user) {
    return null;
  }
  return user.email;
}

// Chained lookups get messy
function getManagerEmail(users: User[], employee: { managerId?: string }): string | null {
  if (!employee.managerId) {
    return null;
  }
  const manager = findUserById(users, employee.managerId);
  if (!manager) {
    return null;
  }
  return manager.email;
}
```


```typescript
import * as fs from 'fs';

function readFileCallback(
  path: string,
  callback: (error: Error | null, data: string | null) => void
): void {
  fs.readFile(path, 'utf-8', (err, data) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, data);
    }
  });
}

function processFile(
  inputPath: string,
  outputPath: string,
  callback: (error: Error | null) => void
): void {
  readFileCallback(inputPath, (err, data) => {
    if (err) {
      callback(err);
      return;
    }
    const processed = data!.toUpperCase();
    fs.writeFile(outputPath, processed, (writeErr) => {
      if (writeErr) {
        callback(writeErr);
      } else {
        callback(null);
      }
    });
  });
}

// Callback hell
function processMultipleFiles(
  files: Array<{ input: string; output: string }>,
  callback: (error: Error | null) => void
): void {
  let completed = 0;
  let hasError = false;

  files.forEach(({ input, output }) => {
    if (hasError) return;
    processFile(input, output, (err) => {
      if (hasError) return;
      if (err) {
        hasError = true;
        callback(err);
        return;
      }
      completed++;
      if (completed === files.length) {
        callback(null);
      }
    });
  });
}
```


```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

function processProducts(products: Product[]): {
  totalValue: number;
  categoryCounts: Record<string, number>;
  expensiveProducts: string[];
} {
  let totalValue = 0;
  const categoryCounts: Record<string, number> = {};
  const expensiveProducts: string[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Skip out of stock
    if (!product.inStock) {
      continue;
    }

    // Sum total value
    totalValue += product.price;

    // Count categories
    if (categoryCounts[product.category] === undefined) {
      categoryCounts[product.category] = 0;
    }
    categoryCounts[product.category]++;

    // Collect expensive products
    if (product.price > 100) {
      expensiveProducts.push(product.name);
    }
  }

  return { totalValue, categoryCounts, expensiveProducts };
}
```


```typescript
interface Order {
  id: string;
  items: OrderItem[];
}

interface OrderItem {
  productId: string;
  quantity: number;
}

function getAllProductIds(orders: Order[]): string[] {
  const productIds: string[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      if (!productIds.includes(item.productId)) {
        productIds.push(item.productId);
      }
    }
  }

  return productIds;
}
```


```typescript
function paginate<T>(
  fetchPage: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null }>
): Promise<T[]> {
  const allItems: T[] = [];
  let cursor: string | null = null;

  while (true) {
    const { items, nextCursor } = await fetchPage(cursor);
    allItems.push(...items);

    if (nextCursor === null) {
      break;
    }
    cursor = nextCursor;
  }

  return allItems;
}
```


```typescript
function fetchUserData(userId: string): Promise<UserProfile> {
  return fetch(`/api/users/${userId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((data) => validateUserData(data))
    .then((validData) => enrichUserProfile(validData))
    .catch((error) => {
      console.error('Failed to fetch user data:', error);
      throw error;
    });
}

// Chained promises with conditionals
function processOrder(orderId: string): Promise<OrderResult> {
  return getOrder(orderId)
    .then((order) => {
      if (order.status === 'cancelled') {
        throw new Error('Order is cancelled');
      }
      return order;
    })
    .then((order) => validateInventory(order))
    .then((validOrder) => processPayment(validOrder))
    .then((paidOrder) => shipOrder(paidOrder))
    .catch((error) => {
      logError(error);
      return { success: false, error: error.message };
    });
}
```


## #### After (fp-ts Either)

```typescript
import * as E from 'fp-ts/Either';
import * as J from 'fp-ts/Json';
import { pipe } from 'fp-ts/function';

interface User {
  name: string;
  age: number;
}

// Use Json.parse which returns Either<Error, Json>
const parseJSON = (input: string): E.Either<Error, unknown> =>
  pipe(
    J.parse(input),
    E.mapLeft((e) => new Error(`Invalid JSON: ${e}`))
  );

// Validation returns Either, making errors explicit in types
const validateUser = (data: unknown): E.Either<Error, User> => {
  if (!data || typeof data !== 'object') {
    return E.left(new Error('Data must be an object'));
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.name !== 'string') {
    return E.left(new Error('Name is required'));
  }
  if (typeof obj.age !== 'number') {
    return E.left(new Error('Age must be a number'));
  }
  return E.right({ name: obj.name, age: obj.age });
};

// Compose with pipe and flatMap - errors propagate automatically
const processUserInput = (input: string): E.Either<Error, User> =>
  pipe(
    parseJSON(input),
    E.flatMap(validateUser)
  );

// Handle both cases explicitly
pipe(
  processUserInput('{"name": "Alice", "age": 30}'),
  E.match(
    (error) => console.error('Failed to process user:', error.message),
    (user) => console.log('User:', user)
  )
);
```


## #### After (fp-ts TaskEither)

```typescript
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

// Wrap fetch in TaskEither
const fetchUser = (id: string): TE.TaskEither<Error, User> =>
  pipe(
    TE.tryCatch(
      () => fetch(`/api/users/${id}`),
      (reason) => new Error(`Network error: ${reason}`)
    ),
    TE.flatMap((response) =>
      response.ok
        ? TE.right(response)
        : TE.left(new Error(`HTTP error: ${response.status}`))
    ),
    TE.flatMap((response) =>
      TE.tryCatch(
        () => response.json(),
        (reason) => new Error(`JSON parse error: ${reason}`)
      )
    ),
    TE.flatMap((data) => TE.fromEither(validateUser(data)))
  );

const fetchUserPosts = (userId: string): TE.TaskEither<Error, Post[]> =>
  pipe(
    TE.tryCatch(
      () => fetch(`/api/users/${userId}/posts`),
      (reason) => new Error(`Network error: ${reason}`)
    ),
    TE.flatMap((response) =>
      response.ok
        ? TE.right(response)
        : TE.left(new Error(`HTTP error: ${response.status}`))
    ),
    TE.flatMap((response) =>
      TE.tryCatch(
        () => response.json(),
        (reason) => new Error(`JSON parse error: ${reason}`)
      )
    )
  );

// Clean composition with automatic error propagation
const getUserWithPosts = (
  id: string
): TE.TaskEither<Error, { user: User; posts: Post[] }> =>
  pipe(
    TE.Do,
    TE.bind('user', () => fetchUser(id)),
    TE.bind('posts', () => fetchUserPosts(id))
  );

// Execute and handle results
const main = async () => {
  const result = await getUserWithPosts('123')();
  pipe(
    result,
    E.match(
      (error) => console.error('Failed:', error.message),
      ({ user, posts }) => console.log('Success:', user, posts)
    )
  );
};
```


```typescript
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

const fetchUserData = (userId: string): TE.TaskEither<Error, UserProfile> =>
  pipe(
    TE.tryCatch(
      () => fetch(`/api/users/${userId}`),
      (e) => new Error(`Network error: ${e}`)
    ),
    TE.flatMap((response) =>
      response.ok
        ? TE.tryCatch(
            () => response.json(),
            (e) => new Error(`Parse error: ${e}`)
          )
        : TE.left(new Error(`HTTP ${response.status}`))
    ),
    TE.flatMap((data) => TE.fromEither(validateUserData(data))),
    TE.flatMap((validData) => enrichUserProfile(validData))
  );

// Conditionals are explicit
const processOrder = (orderId: string): TE.TaskEither<Error, OrderResult> =>
  pipe(
    getOrder(orderId),
    TE.filterOrElse(
      (order) => order.status !== 'cancelled',
      () => new Error('Order is cancelled')
    ),
    TE.flatMap(validateInventory),
    TE.flatMap(processPayment),
    TE.flatMap(shipOrder),
    TE.map((shipped) => ({ success: true, order: shipped })),
    TE.orElse((error) =>
      pipe(
        TE.fromIO(() => logError(error)),
        TE.map(() => ({ success: false, error: error.message }))
      )
    )
  );
```


## #### After (fp-ts Option)

```typescript
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

const getDatabaseUrl = (config: Config): O.Option<string> =>
  pipe(
    O.fromNullable(config.database),
    O.flatMap((db) =>
      pipe(
        O.fromNullable(db.host),
        O.map((host) => {
          const port = db.port ?? 5432;
          const auth = pipe(
            O.fromNullable(db.credentials),
            O.flatMap((creds) =>
              pipe(
                O.Do,
                O.bind('username', () => O.fromNullable(creds.username)),
                O.bind('password', () => O.fromNullable(creds.password)),
                O.map(({ username, password }) => `${username}:${password}@`)
              )
            ),
            O.getOrElse(() => '')
          );
          return `postgres://${auth}${host}:${port}`;
        })
      )
    )
  );

// Usage is explicit about the optional nature
pipe(
  getDatabaseUrl(config),
  O.match(
    () => console.error('Database URL not configured'),
    (url) => connectToDatabase(url)
  )
);
```


```typescript
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';

const findUserById = (users: User[], id: string): O.Option<User> =>
  A.findFirst<User>((u) => u.id === id)(users);

const getUserEmail = (users: User[], id: string): O.Option<string> =>
  pipe(
    findUserById(users, id),
    O.map((user) => user.email)
  );

const getManagerEmail = (
  users: User[],
  employee: { managerId?: string }
): O.Option<string> =>
  pipe(
    O.fromNullable(employee.managerId),
    O.flatMap((managerId) => findUserById(users, managerId)),
    O.map((manager) => manager.email)
  );
```


## ### Converting Between Option and Either

```typescript
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

// Option to Either: provide error for None case
const optionToEither = <E, A>(onNone: () => E) => (
  option: O.Option<A>
): E.Either<E, A> =>
  pipe(
    option,
    E.fromOption(onNone)
  );

// Example
const findUser = (id: string): O.Option<User> => /* ... */;

const getUser = (id: string): E.Either<Error, User> =>
  pipe(
    findUser(id),
    E.fromOption(() => new Error(`User ${id} not found`))
  );
```


## #### After (fp-ts Task/TaskEither)

```typescript
import * as fs from 'fs/promises';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';

// Wrap fs.promises in TaskEither
const readFile = (path: string): TE.TaskEither<Error, string> =>
  TE.tryCatch(
    () => fs.readFile(path, 'utf-8'),
    (e) => (e instanceof Error ? e : new Error(String(e)))
  );

const writeFile = (path: string, data: string): TE.TaskEither<Error, void> =>
  TE.tryCatch(
    () => fs.writeFile(path, data),
    (e) => (e instanceof Error ? e : new Error(String(e)))
  );

// Clean composition
const processFile = (
  inputPath: string,
  outputPath: string
): TE.TaskEither<Error, void> =>
  pipe(
    readFile(inputPath),
    TE.map((data) => data.toUpperCase()),
    TE.flatMap((processed) => writeFile(outputPath, processed))
  );

// Process multiple files in parallel or sequence
const processMultipleFilesParallel = (
  files: Array<{ input: string; output: string }>
): TE.TaskEither<Error, void[]> =>
  pipe(
    files,
    A.traverse(TE.ApplicativePar)(({ input, output }) =>
      processFile(input, output)
    )
  );

const processMultipleFilesSequential = (
  files: Array<{ input: string; output: string }>
): TE.TaskEither<Error, void[]> =>
  pipe(
    files,
    A.traverse(TE.ApplicativeSeq)(({ input, output }) =>
      processFile(input, output)
    )
  );
```


## ### Pattern: Converting callback-based APIs

```typescript
import * as TE from 'fp-ts/TaskEither';

// Generic callback-to-TaskEither converter
const fromCallback = <A>(
  f: (callback: (error: Error | null, result: A | null) => void) => void
): TE.TaskEither<Error, A> =>
  () =>
    new Promise((resolve) => {
      f((error, result) => {
        if (error) {
          resolve({ _tag: 'Left', left: error });
        } else {
          resolve({ _tag: 'Right', right: result as A });
        }
      });
    });

// Usage
const readFileLegacy = (path: string): TE.TaskEither<Error, string> =>
  fromCallback((cb) => fs.readFile(path, 'utf-8', cb));
```


## #### Before (Imperative with Classes)

```typescript
// Traditional class-based approach
interface Logger {
  log(message: string): void;
  error(message: string): void;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

class UserService {
  constructor(
    private readonly logger: Logger,
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService
  ) {}

  async updateEmail(userId: string, newEmail: string): Promise<void> {
    this.logger.log(`Updating email for user ${userId}`);

    const user = await this.userRepo.findById(userId);
    if (!user) {
      this.logger.error(`User ${userId} not found`);
      throw new Error(`User ${userId} not found`);
    }

    const oldEmail = user.email;
    user.email = newEmail;

    await this.userRepo.save(user);

    await this.emailService.send(
      oldEmail,
      'Email Changed',
      `Your email has been changed to ${newEmail}`
    );

    this.logger.log(`Email updated for user ${userId}`);
  }
}

// Manual DI setup
const logger = new ConsoleLogger();
const userRepo = new PostgresUserRepository(dbConnection);
const emailService = new SmtpEmailService(smtpConfig);
const userService = new UserService(logger, userRepo, emailService);
```


## #### After (fp-ts Reader)

```typescript
import * as R from 'fp-ts/Reader';
import * as RTE from 'fp-ts/ReaderTaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Define the environment/dependencies as an interface
interface AppEnv {
  logger: {
    log: (message: string) => void;
    error: (message: string) => void;
  };
  userRepo: {
    findById: (id: string) => TE.TaskEither<Error, User | null>;
    save: (user: User) => TE.TaskEither<Error, void>;
  };
  emailService: {
    send: (to: string, subject: string, body: string) => TE.TaskEither<Error, void>;
  };
}

// Helper to access environment
const ask = RTE.ask<AppEnv, Error>();

// Service functions using ReaderTaskEither
const logInfo = (message: string): RTE.ReaderTaskEither<AppEnv, Error, void> =>
  pipe(
    ask,
    RTE.map((env) => env.logger.log(message))
  );

const logError = (message: string): RTE.ReaderTaskEither<AppEnv, Error, void> =>
  pipe(
    ask,
    RTE.map((env) => env.logger.error(message))
  );

const findUser = (id: string): RTE.ReaderTaskEither<AppEnv, Error, User | null> =>
  pipe(
    ask,
    RTE.flatMapTaskEither((env) => env.userRepo.findById(id))
  );

const saveUser = (user: User): RTE.ReaderTaskEither<AppEnv, Error, void> =>
  pipe(
    ask,
    RTE.flatMapTaskEither((env) => env.userRepo.save(user))
  );

const sendEmail = (
  to: string,
  subject: string,
  body: string
): RTE.ReaderTaskEither<AppEnv, Error, void> =>
  pipe(
    ask,
    RTE.flatMapTaskEither((env) => env.emailService.send(to, subject, body))
  );

// The updateEmail function using Reader composition
const updateEmail = (
  userId: string,
  newEmail: string
): RTE.ReaderTaskEither<AppEnv, Error, void> =>
  pipe(
    logInfo(`Updating email for user ${userId}`),
    RTE.flatMap(() => findUser(userId)),
    RTE.flatMap((user) => {
      if (!user) {
        return pipe(
          logError(`User ${userId} not found`),
          RTE.flatMap(() => RTE.left(new Error(`User ${userId} not found`)))
        );
      }
      const oldEmail = user.email;
      const updatedUser = { ...user, email: newEmail };

      return pipe(
        saveUser(updatedUser),
        RTE.flatMap(() =>
          sendEmail(
            oldEmail,
            'Email Changed',
            `Your email has been changed to ${newEmail}`
          )
        ),
        RTE.flatMap(() => logInfo(`Email updated for user ${userId}`))
      );
    })
  );

// Build the environment
const createAppEnv = (): AppEnv => ({
  logger: {
    log: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
  },
  userRepo: {
    findById: (id) => TE.tryCatch(
      () => postgresClient.query('SELECT * FROM users WHERE id = $1', [id]),
      (e) => new Error(String(e))
    ),
    save: (user) => TE.tryCatch(
      () => postgresClient.query('UPDATE users SET email = $1 WHERE id = $2', [user.email, user.id]),
      (e) => new Error(String(e))
    ),
  },
  emailService: {
    send: (to, subject, body) => TE.tryCatch(
      () => smtpClient.send({ to, subject, body }),
      (e) => new Error(String(e))
    ),
  },
});

// Run the program
const main = async () => {
  const env = createAppEnv();
  const result = await updateEmail('user-123', 'new@email.com')(env)();

  pipe(
    result,
    E.match(
      (error) => console.error('Failed:', error),
      () => console.log('Success!')
    )
  );
};
```


## ### Testing with Reader

```typescript
// Easy to test with mock environment
const createTestEnv = (): AppEnv => {
  const logs: string[] = [];
  const savedUsers: User[] = [];
  const sentEmails: Array<{ to: string; subject: string; body: string }> = [];

  return {
    logger: {
      log: (msg) => logs.push(`[INFO] ${msg}`),
      error: (msg) => logs.push(`[ERROR] ${msg}`),
    },
    userRepo: {
      findById: (id) =>
        TE.right(id === 'existing-user' ? { id, email: 'old@email.com', name: 'Test' } : null),
      save: (user) => {
        savedUsers.push(user);
        return TE.right(undefined);
      },
    },
    emailService: {
      send: (to, subject, body) => {
        sentEmails.push({ to, subject, body });
        return TE.right(undefined);
      },
    },
  };
};

// Test
describe('updateEmail', () => {
  it('should update email and send notification', async () => {
    const env = createTestEnv();
    const result = await updateEmail('existing-user', 'new@email.com')(env)();

    expect(E.isRight(result)).toBe(true);
    // Assert on captured side effects
  });
});
```


## #### After (fp-ts functional operations)

```typescript
import * as A from 'fp-ts/Array';
import * as R from 'fp-ts/Record';
import { pipe } from 'fp-ts/function';
import * as N from 'fp-ts/number';
import * as Monoid from 'fp-ts/Monoid';

const processProducts = (products: Product[]) => {
  const inStockProducts = pipe(
    products,
    A.filter((p) => p.inStock)
  );

  const totalValue = pipe(
    inStockProducts,
    A.map((p) => p.price),
    A.reduce(0, (acc, price) => acc + price)
  );

  const categoryCounts = pipe(
    inStockProducts,
    A.reduce({} as Record<string, number>, (acc, product) => ({
      ...acc,
      [product.category]: (acc[product.category] ?? 0) + 1,
    }))
  );

  const expensiveProducts = pipe(
    inStockProducts,
    A.filter((p) => p.price > 100),
    A.map((p) => p.name)
  );

  return { totalValue, categoryCounts, expensiveProducts };
};

// Or using a single pass with foldMap for efficiency
import { Monoid as M } from 'fp-ts/Monoid';

interface ProductStats {
  totalValue: number;
  categoryCounts: Record<string, number>;
  expensiveProducts: string[];
}

const productStatsMonoid: M<ProductStats> = {
  empty: { totalValue: 0, categoryCounts: {}, expensiveProducts: [] },
  concat: (a, b) => ({
    totalValue: a.totalValue + b.totalValue,
    categoryCounts: pipe(
      a.categoryCounts,
      R.union({ concat: (x, y) => x + y })(b.categoryCounts)
    ),
    expensiveProducts: [...a.expensiveProducts, ...b.expensiveProducts],
  }),
};

const processProductsSinglePass = (products: Product[]): ProductStats =>
  pipe(
    products,
    A.filter((p) => p.inStock),
    A.foldMap(productStatsMonoid)((product) => ({
      totalValue: product.price,
      categoryCounts: { [product.category]: 1 },
      expensiveProducts: product.price > 100 ? [product.name] : [],
    }))
  );
```


## #### After (fp-ts)

```typescript
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as S from 'fp-ts/Set';
import * as Str from 'fp-ts/string';

const getAllProductIds = (orders: Order[]): string[] =>
  pipe(
    orders,
    A.flatMap((order) => order.items),
    A.map((item) => item.productId),
    A.uniq(Str.Eq)
  );

// Or using Set for better performance with large datasets
const getAllProductIdsSet = (orders: Order[]): Set<string> =>
  pipe(
    orders,
    A.flatMap((order) => order.items),
    A.map((item) => item.productId),
    (ids) => new Set(ids)
  );
```


```typescript
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';

interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

const paginate = <T>(
  fetchPage: (cursor: string | null) => TE.TaskEither<Error, Page<T>>
): TE.TaskEither<Error, T[]> => {
  const go = (
    cursor: string | null,
    accumulated: T[]
  ): TE.TaskEither<Error, T[]> =>
    pipe(
      fetchPage(cursor),
      TE.flatMap(({ items, nextCursor }) => {
        const newAccumulated = [...accumulated, ...items];
        return nextCursor === null
          ? TE.right(newAccumulated)
          : go(nextCursor, newAccumulated);
      })
    );

  return go(null, []);
};

// Using unfold for generating sequences
import * as RA from 'fp-ts/ReadonlyArray';

const range = (start: number, end: number): readonly number[] =>
  RA.unfold(start, (n) => (n <= end ? O.some([n, n + 1]) : O.none));
```


```typescript
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import * as T from 'fp-ts/Task';
import { pipe } from 'fp-ts/function';

// Parallel execution - fails fast on first error
const fetchAllUsers = (ids: string[]): TE.TaskEither<Error, User[]> =>
  pipe(
    ids,
    A.traverse(TE.ApplicativePar)(fetchUser)
  );

// Sequential execution
const fetchAllUsersSequential = (ids: string[]): TE.TaskEither<Error, User[]> =>
  pipe(
    ids,
    A.traverse(TE.ApplicativeSeq)(fetchUser)
  );

// Collect successes, ignore failures (using Task instead of TaskEither)
const fetchUsersWithFallback = (ids: string[]): T.Task<Array<User | null>> =>
  pipe(
    ids,
    A.traverse(T.ApplicativePar)((id) =>
      pipe(
        fetchUser(id),
        TE.match(
          () => null,
          (user) => user
        )
      )
    )
  );

// Or keep track of which failed
const fetchUsersPartitioned = (
  ids: string[]
): T.Task<{ successes: User[]; failures: Array<{ id: string; error: Error }> }> =>
  pipe(
    ids,
    A.traverse(T.ApplicativePar)((id) =>
      pipe(
        fetchUser(id),
        TE.bimap(
          (error) => ({ id, error }),
          (user) => user
        ),
        (te) => te
      )
    ),
    T.map(A.separate),
    T.map(({ left: failures, right: successes }) => ({ successes, failures }))
  );
```


## ### Pattern: Promise.race to alternative

```typescript
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { pipe } from 'fp-ts/function';

// Race - first to complete wins
const raceTaskEithers = <E, A>(
  tasks: Array<TE.TaskEither<E, A>>
): TE.TaskEither<E, A> =>
  () => Promise.race(tasks.map((te) => te()));

// Try alternatives on failure (like Promise.any but typed)
const tryAlternatives = <E, A>(
  primary: TE.TaskEither<E, A>,
  fallback: TE.TaskEither<E, A>
): TE.TaskEither<E, A> =>
  pipe(
    primary,
    TE.orElse(() => fallback)
  );

// Chain of fallbacks
const withFallbacks = <E, A>(
  tasks: Array<TE.TaskEither<E, A>>
): TE.TaskEither<E, A> =>
  tasks.reduce((acc, task) => pipe(acc, TE.orElse(() => task)));
```


## ### Pitfall 4: Losing error information

```typescript
// WRONG: Original error context is lost
const fetchData = (): TE.TaskEither<Error, Data> =>
  pipe(
    TE.tryCatch(
      () => fetch('/api/data'),
      () => new Error('Failed') // Lost the original error!
    )
  );

// CORRECT: Preserve error context
const fetchData = (): TE.TaskEither<Error, Data> =>
  pipe(
    TE.tryCatch(
      () => fetch('/api/data'),
      (reason) => new Error(`Network request failed: ${reason}`)
    )
  );

// BETTER: Use typed errors
type FetchError =
  | { _tag: 'NetworkError'; cause: unknown }
  | { _tag: 'ParseError'; cause: unknown }
  | { _tag: 'ValidationError'; message: string };

const fetchData = (): TE.TaskEither<FetchError, Data> =>
  pipe(
    TE.tryCatch(
      () => fetch('/api/data'),
      (cause): FetchError => ({ _tag: 'NetworkError', cause })
    ),
    TE.flatMap((response) =>
      TE.tryCatch(
        () => response.json(),
        (cause): FetchError => ({ _tag: 'ParseError', cause })
      )
    )
  );
```


## ### Strategy 1: Start at the Boundaries

```typescript
// Wrap external API calls first
const fetchUserApi = (id: string): TE.TaskEither<ApiError, UserDto> =>
  pipe(
    TE.tryCatch(
      () => externalApiClient.getUser(id),
      (e) => ({ type: 'api_error' as const, cause: e })
    )
  );

// Internal code can stay imperative initially
async function handleUserRequest(userId: string) {
  const result = await fetchUserApi(userId)();
  if (E.isRight(result)) {
    // Process user with existing code
    return processUser(result.right);
  } else {
    throw new Error(`API error: ${result.left.type}`);
  }
}
```


## ### Strategy 2: Create Bridge Functions

```typescript
// Bridge from Either to thrown errors
const unsafeUnwrap = <E, A>(either: E.Either<E, A>): A =>
  pipe(
    either,
    E.getOrElseW((e) => {
      throw e instanceof Error ? e : new Error(String(e));
    })
  );

// Bridge from thrown errors to Either
const catchSync = <A>(f: () => A): E.Either<Error, A> =>
  E.tryCatch(f, (e) => (e instanceof Error ? e : new Error(String(e))));

// Bridge from Promise to TaskEither
const fromPromise = <A>(p: Promise<A>): TE.TaskEither<Error, A> =>
  TE.tryCatch(() => p, (e) => (e instanceof Error ? e : new Error(String(e))));

// Bridge from TaskEither to Promise (throws on Left)
const toPromise = <E, A>(te: TE.TaskEither<E, A>): Promise<A> =>
  te().then(E.getOrElseW((e) => { throw e; }));
```


## ### Strategy 3: Module-by-Module Migration

```typescript
// Phase 1: Internal functions use fp-ts
// File: user-service.internal.ts
export const validateUser = (data: unknown): E.Either<ValidationError, User> => /* ... */;
export const enrichUser = (user: User): TE.TaskEither<Error, EnrichedUser> => /* ... */;

// File: user-service.ts (public API unchanged)
export async function getUser(id: string): Promise<User> {
  const result = await pipe(
    fetchUser(id),
    TE.flatMap(validateUser >>> TE.fromEither),
    TE.flatMap(enrichUser)
  )();

  if (E.isLeft(result)) {
    throw result.left;
  }
  return result.right;
}

// Phase 2: Update public API
// File: user-service.ts
export const getUser = (id: string): TE.TaskEither<UserError, User> =>
  pipe(
    fetchUser(id),
    TE.flatMap(validateUser >>> TE.fromEither),
    TE.flatMap(enrichUser)
  );
```


## ### Strategy 5: Testing as Documentation

```typescript
describe('UserService', () => {
  describe('getUser (fp-ts)', () => {
    it('returns Right with user on success', async () => {
      const result = await getUser('valid-id')();
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.id).toBe('valid-id');
      }
    });

    it('returns Left with NotFound error for unknown id', async () => {
      const result = await getUser('unknown')();
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NotFound');
      }
    });
  });
});
```


## ### Code Touched by Non-FP Team Members

```typescript
// If team doesn't know fp-ts, this is harder to maintain
const processOrder = (order: Order): TE.TaskEither<Error, Result> =>
  pipe(
    validateOrder(order),
    TE.fromEither,
    TE.flatMap(enrichOrder),
    TE.flatMap(submitOrder)
  );

// Familiar to all TypeScript developers
async function processOrder(order: Order): Promise<Result> {
  const validated = validateOrder(order);
  if (!validated.success) {
    throw new Error(validated.error);
  }
  const enriched = await enrichOrder(validated.data);
  return await submitOrder(enriched);
}
```


## ### Test Code

```typescript
// Clear test code
describe('UserService', () => {
  it('creates a user', async () => {
    const user = await createUser({ name: 'Alice' });
    expect(user.name).toBe('Alice');
  });
});

// Unnecessarily complex
describe('UserService', () => {
  it('creates a user', async () => {
    await pipe(
      createUser({ name: 'Alice' }),
      TE.map((user) => expect(user.name).toBe('Alice')),
      TE.getOrElse(() => T.of(fail('Should not fail')))
    )();
  });
});
```


## ## Quick Reference: Imperative to fp-ts Mapping

| Imperative Pattern | fp-ts Equivalent |
|-------------------|------------------|
| `try { } catch { }` | `E.tryCatch()`, `TE.tryCatch()` |
| `throw new Error()` | `E.left()`, `TE.left()` |
| `return value` | `E.right()`, `TE.right()` |
| `if (x === null)` | `O.fromNullable()`, `O.isNone()` |
| `x ?? defaultValue` | `O.getOrElse()` |
| `x?.property` | `O.map()`, `O.flatMap()` |
| `array.map()` | `A.map()` |
| `array.filter()` | `A.filter()` |
| `array.reduce()` | `A.reduce()`, `A.foldMap()` |
| `array.find()` | `A.findFirst()` |
| `array.flatMap()` | `A.flatMap()` |
| `Promise.then()` | `TE.map()`, `TE.flatMap()` |
| `Promise.catch()` | `TE.orElse()`, `TE.mapLeft()` |
| `Promise.all()` | `A.traverse(TE.ApplicativePar)` |
| `async/await` | `TE.flatMap()` chain |
| `new Class(deps)` | `R.asks()`, `RTE.ask()` |
| `for...of` | `A.map()`, `A.reduce()` |
| `while` | Recursion, `unfold()` |




---

}
```

### Test Code

Test code should be readable, not necessarily functional:

> See [references/details.md](references/details.md) for full code examples.

---

## Quick Reference: Imperative to fp-ts Mapping

> See [references/details.md](references/details.md) for full code examples.

---

## Summary

Migrating to fp-ts is a journey, not a destination. Key principles:

1. **Start small**: Convert individual functions, not entire codebases
2. **Be pragmatic**: Not everything needs to be functional
3. **Type-driven**: Let the compiler guide your refactoring
4. **Test thoroughly**: Each conversion should be verified
5. **Document patterns**: Create team-specific guides for your codebase
6. **Review benefits**: Ensure the added complexity provides value

The goal is more maintainable, type-safe code—not functional programming for its own sake.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


---
## Additional Content

try {
  await doSomething();
} catch (e) {
  logger.error(e);
  throw e;
}

// ...then Either doesn't add much value
const result = await doSomethingTE()();
if (E.isLeft(result)) {
  logger.error(result.left);
  throw result.left;
