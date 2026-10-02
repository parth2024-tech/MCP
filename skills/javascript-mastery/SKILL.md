---
name: javascript-mastery
description: "33+ essential JavaScript concepts every developer should know, inspired by [33-js-concepts](https://github.com/leonardomso/33-js-concepts). Use when the task involves javascript mastery."
risk: unknown
source: community
date_added: "2026-02-27"
---

# 🧠 JavaScript Mastery

> 33+ essential JavaScript concepts every developer should know, inspired by [33-js-concepts](https://github.com/leonardomso/33-js-concepts).

## When to Use This Skill

Use this skill when:

- Explaining JavaScript concepts
- Debugging tricky JS behavior
- Teaching JavaScript fundamentals
- Reviewing code for JS best practices
- Understanding language quirks

---

## 1. Fundamentals

### 1.1 Primitive Types

JavaScript has 7 primitive types:

> See [references/details.md](references/details.md) for full code examples.

**Key points**:

- Primitives are immutable
- Passed by value
- `typeof null === "object"` is a historical bug

### 1.2 Type Coercion

JavaScript implicitly converts types:

```javascript
// String coercion
"5" + 3; // "53" (number → string)
"5" - 3; // 2    (string → number)

// Boolean coercion
Boolean(""); // false
Boolean("hello"); // true
Boolean(0); // false
Boolean([]); // true (!)

// Equality coercion
"5" == 5; // true  (coerces)
"5" === 5; // false (strict)
```

**Falsy values** (8 total):
`false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`

### 1.3 Equality Operators

```javascript
// == (loose equality) - coerces types
null == undefined; // true
"1" == 1; // true

// === (strict equality) - no coercion
null === undefined; // false
"1" === 1; // false

// Object.is() - handles edge cases
Object.is(NaN, NaN); // true (NaN === NaN is false!)
Object.is(-0, 0); // false (0 === -0 is true!)
```

**Rule**: Always use `===` unless you have a specific reason not to.

---

## 2. Scope & Closures

### 2.1 Scope Types

```javascript
// Global scope
var globalVar = "global";

function outer() {
  // Function scope
  var functionVar = "function";

  if (true) {
    // Block scope (let/const only)
    let blockVar = "block";
    const alsoBlock = "block";
    var notBlock = "function"; // var ignores blocks!
  }
}
```

### 2.2 Closures

A closure is a function that remembers its lexical scope:

> See [references/details.md](references/details.md) for full code examples.

**Common use cases**:

- Data privacy (module pattern)
- Function factories
- Partial application
- Memoization

### 2.3 var vs let vs const

```javascript
// var - function scoped, hoisted, can redeclare
var x = 1;
var x = 2; // OK

// let - block scoped, hoisted (TDZ), no redeclare
let y = 1;
// let y = 2; // Error!

// const - like let, but can't reassign
const z = 1;
// z = 2; // Error!

// BUT: const objects are mutable
const obj = { a: 1 };
obj.a = 2; // OK
obj.b = 3; // OK
```

---

## 3. Functions & Execution

### 3.1 Call Stack

```javascript
function first() {
  console.log("first start");
  second();
  console.log("first end");
}

function second() {
  console.log("second");
}

first();
// Output:
// "first start"
// "second"
// "first end"
```

Stack overflow example:

```javascript
function infinite() {
  infinite(); // No base case!
}
infinite(); // RangeError: Maximum call stack size exceeded
```

### 3.2 Hoisting

> See [references/details.md](references/details.md) for full code examples.

### 3.3 this Keyword

> See [references/details.md](references/details.md) for full code examples.

---

## 4. Event Loop & Async

### 4.1 Event Loop

```javascript
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => console.log("3"));

console.log("4");

// Output: 1, 4, 3, 2
// Why? Microtasks (Promises) run before macrotasks (setTimeout)
```

**Execution order**:

1. Synchronous code (call stack)
2. Microtasks (Promise callbacks, queueMicrotask)
3. Macrotasks (setTimeout, setInterval, I/O)

### 4.2 Callbacks

> See [references/details.md](references/details.md) for full code examples.

### 4.3 Promises

> See [references/details.md](references/details.md) for full code examples.

### 4.4 async/await

> See [references/details.md](references/details.md) for full code examples.

---

## 5. Functional Programming

### 5.1 Higher-Order Functions

Functions that take or return functions:

```javascript
// Takes a function
const numbers = [1, 2, 3];
const doubled = numbers.map((n) => n * 2); // [2, 4, 6]

// Returns a function
function multiply(a) {
  return function (b) {
    return a * b;
  };
}
const double = multiply(2);
double(5); // 10
```

### 5.2 Pure Functions

```javascript
// Pure: same input → same output, no side effects
function add(a, b) {
  return a + b;
}

// Impure: modifies external state
let total = 0;
function addToTotal(value) {
  total += value; // Side effect!
  return total;
}

// Impure: depends on external state
function getDiscount(price) {
  return price * globalDiscountRate; // External dependency
}
```

### 5.3 map, filter, reduce

> See [references/details.md](references/details.md) for full code examples.

### 5.4 Currying & Composition

> See [references/details.md](references/details.md) for full code examples.

---

## 6. Objects & Prototypes

### 6.1 Prototypal Inheritance

> See [references/details.md](references/details.md) for full code examples.

### 6.2 Object Methods

> See [references/details.md](references/details.md) for full code examples.

---

## 7. Modern JavaScript (ES6+)

### 7.1 Destructuring

```javascript
// Array destructuring
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]

// Object destructuring
const { name, age, city = "Unknown" } = { name: "Alice", age: 25 };
// name = "Alice", age = 25, city = "Unknown"

// Renaming
const { name: userName } = { name: "Bob" };
// userName = "Bob"

// Nested
const {
  address: { street },
} = { address: { street: "123 Main" } };
```

### 7.2 Spread & Rest

```javascript
// Spread: expand iterable
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5]; // [1, 2, 3, 4, 5]

const obj1 = { a: 1 };
const obj2 = { ...obj1, b: 2 }; // { a: 1, b: 2 }

// Rest: collect remaining
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4); // 10
```

### 7.3 Modules

```javascript
// Named exports
export const PI = 3.14159;
export function square(x) {
  return x * x;
}

// Default export
export default class Calculator {}

// Importing
import Calculator, { PI, square } from "./math.js";
import * as math from "./math.js";

// Dynamic import
const module = await import("./dynamic.js");
```

### 7.4 Optional Chaining & Nullish Coalescing

```javascript
// Optional chaining (?.)
const user = { address: { city: "NYC" } };
const city = user?.address?.city; // "NYC"
const zip = user?.address?.zip; // undefined (no error)
const fn = user?.getName?.(); // undefined if no method

// Nullish coalescing (??)
const value = null ?? "default"; // "default"
const zero = 0 ?? "default"; // 0 (not nullish!)
const empty = "" ?? "default"; // "" (not nullish!)

// Compare with ||
const value2 = 0 || "default"; // "default" (0 is falsy)
> See [references/details.md](references/details.md) for full code examples.
