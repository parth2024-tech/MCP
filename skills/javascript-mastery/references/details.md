# Javascript Mastery — Code Reference

## ### 1.1 Primitive Types

```javascript
// String
const str = "hello";

// Number (integers and floats)
const num = 42;
const float = 3.14;

// BigInt (for large integers)
const big = 9007199254740991n;

// Boolean
const bool = true;

// Undefined
let undef; // undefined

// Null
const empty = null;

// Symbol (unique identifiers)
const sym = Symbol("description");
```


## ### 2.2 Closures

```javascript
function createCounter() {
  let count = 0; // "closed over" variable

  return {
    increment() {
      return ++count;
    },
    decrement() {
      return --count;
    },
    getCount() {
      return count;
    },
  };
}

const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.getCount(); // 2
```


## ### 3.2 Hoisting

```javascript
// Variable hoisting
console.log(a); // undefined (hoisted, not initialized)
var a = 5;

console.log(b); // ReferenceError (TDZ)
let b = 5;

// Function hoisting
sayHi(); // Works!
function sayHi() {
  console.log("Hi!");
}

// Function expressions don't hoist
sayBye(); // TypeError
var sayBye = function () {
  console.log("Bye!");
};
```


## ### 3.3 this Keyword

```javascript
// Global context
console.log(this); // window (browser) or global (Node)

// Object method
const obj = {
  name: "Alice",
  greet() {
    console.log(this.name); // "Alice"
  },
};

// Arrow functions (lexical this)
const obj2 = {
  name: "Bob",
  greet: () => {
    console.log(this.name); // undefined (inherits outer this)
  },
};

// Explicit binding
function greet() {
  console.log(this.name);
}
greet.call({ name: "Charlie" }); // "Charlie"
greet.apply({ name: "Diana" }); // "Diana"
const bound = greet.bind({ name: "Eve" });
bound(); // "Eve"
```


## ### 4.2 Callbacks

```javascript
// Callback pattern
function fetchData(callback) {
  setTimeout(() => {
    callback(null, { data: "result" });
  }, 1000);
}

// Error-first convention
fetchData((error, result) => {
  if (error) {
    console.error(error);
    return;
  }
  console.log(result);
});

// Callback hell (avoid this!)
getData((data) => {
  processData(data, (processed) => {
    saveData(processed, (saved) => {
      notify(saved, () => {
        // 😱 Pyramid of doom
      });
    });
  });
});
```


## ### 4.3 Promises

```javascript
// Creating a Promise
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve("Success!");
    // or: reject(new Error("Failed!"));
  }, 1000);
});

// Consuming Promises
promise
  .then((result) => console.log(result))
  .catch((error) => console.error(error))
  .finally(() => console.log("Done"));

// Promise combinators
Promise.all([p1, p2, p3]); // All must succeed
Promise.allSettled([p1, p2]); // Wait for all, get status
Promise.race([p1, p2]); // First to settle
Promise.any([p1, p2]); // First to succeed
```


## ### 4.4 async/await

```javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) throw new Error("Failed to fetch");
    const user = await response.json();
    return user;
  } catch (error) {
    console.error("Error:", error);
    throw error; // Re-throw for caller to handle
  }
}

// Parallel execution
async function fetchAll() {
  const [users, posts] = await Promise.all([
    fetch("/api/users"),
    fetch("/api/posts"),
  ]);
  return { users, posts };
}
```


## ### 5.3 map, filter, reduce

```javascript
const users = [
  { name: "Alice", age: 25 },
  { name: "Bob", age: 30 },
  { name: "Charlie", age: 35 },
];

// map: transform each element
const names = users.map((u) => u.name);
// ["Alice", "Bob", "Charlie"]

// filter: keep elements matching condition
const adults = users.filter((u) => u.age >= 30);
// [{ name: "Bob", ... }, { name: "Charlie", ... }]

// reduce: accumulate into single value
const totalAge = users.reduce((sum, u) => sum + u.age, 0);
// 90

// Chaining
const result = users
  .filter((u) => u.age >= 30)
  .map((u) => u.name)
  .join(", ");
// "Bob, Charlie"
```


## ### 5.4 Currying & Composition

```javascript
// Currying: transform f(a, b, c) into f(a)(b)(c)
const curry = (fn) => {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...moreArgs) => curried(...args, ...moreArgs);
  };
};

const add = curry((a, b, c) => a + b + c);
add(1)(2)(3); // 6
add(1, 2)(3); // 6
add(1)(2, 3); // 6

// Composition: combine functions
const compose =
  (...fns) =>
  (x) =>
    fns.reduceRight((acc, fn) => fn(acc), x);

const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((acc, fn) => fn(acc), x);

const addOne = (x) => x + 1;
const double = (x) => x * 2;

const addThenDouble = compose(double, addOne);
addThenDouble(5); // 12 = (5 + 1) * 2

const doubleThenAdd = pipe(double, addOne);
doubleThenAdd(5); // 11 = (5 * 2) + 1
```


## ### 6.1 Prototypal Inheritance

```javascript
// Prototype chain
const animal = {
  speak() {
    console.log("Some sound");
  },
};

const dog = Object.create(animal);
dog.bark = function () {
  console.log("Woof!");
};

dog.speak(); // "Some sound" (inherited)
dog.bark(); // "Woof!" (own method)

// ES6 Classes (syntactic sugar)
class Animal {
  speak() {
    console.log("Some sound");
  }
}

class Dog extends Animal {
  bark() {
    console.log("Woof!");
  }
}
```


## ### 6.2 Object Methods

```javascript
const obj = { a: 1, b: 2 };

// Keys, values, entries
Object.keys(obj); // ["a", "b"]
Object.values(obj); // [1, 2]
Object.entries(obj); // [["a", 1], ["b", 2]]

// Shallow copy
const copy = { ...obj };
const copy2 = Object.assign({}, obj);

// Freeze (immutable)
const frozen = Object.freeze({ x: 1 });
frozen.x = 2; // Silently fails (or throws in strict mode)

// Seal (no add/delete, can modify)
const sealed = Object.seal({ x: 1 });
sealed.x = 2; // OK
sealed.y = 3; // Fails
delete sealed.x; // Fails
```


## ### 7.4 Optional Chaining & Nullish Coalescing

```

---

## Quick Reference Card

| Concept        | Key Point                         |
| :------------- | :-------------------------------- |
| `==` vs `===`  | Always use `===`                  |
| `var` vs `let` | Prefer `let`/`const`              |
| Closures       | Function + lexical scope          |
| `this`         | Depends on how function is called |
| Event loop     | Microtasks before macrotasks      |
| Pure functions | Same input → same output          |
| Prototypes     | `__proto__` → prototype chain     |
| `??` vs `\|\|` | `??` only checks null/undefined   |

---

## Resources

- [33 JS Concepts](https://github.com/leonardomso/33-js-concepts)
- [JavaScript.info](https://javascript.info/)
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [You Don't Know JS](https://github.com/getify/You-Dont-Know-JS)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


