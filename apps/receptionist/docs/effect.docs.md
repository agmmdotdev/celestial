Commonly used Effect methods:

Effect.succeed
Effect.fail
Effect.sync
Effect.tryPromise
Effect.gen
Effect.runPromise
Effect.catchTag
Effect.catchAll
Effect.provide
Effect.provideService
Effect.andThen
Effect.map
Effect.tap
A short list of commonly used modules:

Effect
Context
Layer
Option
Either
Array
Match

## Expected Errors

Expected errors are tracked at the type level by the Effect data type in the "Error channel":

```
         ┌─── Represents the success type
         │        ┌─── Represents the error type
         │        │      ┌─── Represents required dependencies
         ▼        ▼      ▼
Effect<Success, Error, Requirements>
```

This means that the `Effect` type captures not only what the program returns on success but also what type of error it might produce.

### Creating an Effect that can fail

```ts
import { Effect, Random, Data } from "effect";

// Define a custom error type using Data.TaggedError
class HttpError extends Data.TaggedError("HttpError")<{}> {}

//      ┌─── Effect<string, HttpError, never>
//      ▼
const program = Effect.gen(function* () {
  // Generate a random number between 0 and 1
  const n = yield* Random.next;

  // Simulate an HTTP error
  if (n < 0.5) {
    return yield* Effect.fail(new HttpError());
  }

  return "success";
});

// Run the program (might fail)
await Effect.runPromise(program);
```

### Catching all errors

#### `catchAll` - Handle any error

```ts
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const n = yield* Random.next;
  if (n < 0.5) {
    yield* Effect.fail(new Error("Boom!"));
  }
  yield* Effect.log(`got: ${n}`);
});

// Catch all errors and log them
const recovered = program.pipe(
  Effect.catchAll((error) => Effect.logError(`Caught error: ${error}`))
);

await Effect.runPromise(recovered);
```

#### `catchAllCause` - Handle even defects

```ts
import { Effect, Cause } from "effect";

const program = Effect.fail("Something went wrong!");

const recovered = program.pipe(
  Effect.catchAllCause((cause) =>
    Cause.isFailure(cause)
      ? Effect.succeed("Recovered from a regular error")
      : Effect.succeed("Recovered from a defect")
  )
);

await Effect.runPromise(recovered);
```

### Catching specific errors

#### `catchTag` - Catch by tag

```ts
import { Effect, Data } from "effect";

class NotFound extends Data.TaggedError("NotFound")<{ readonly id: string }> {}

const program = Effect.gen(function* () {
  yield* Effect.fail(new NotFound({ id: "123" }));
});

const handled = program.pipe(
  Effect.catchTag("NotFound", (error) =>
    Effect.succeed(`User ${error.id} not found`)
  )
);

await Effect.runPromise(handled);
```

#### `catchIf` - Catch with condition

```ts
import { Effect } from "effect";

const program = Effect.fail(new Error("Network error"));

const handled = program.pipe(
  Effect.catchIf(
    (error) => error instanceof Error && error.message.includes("Network"),
    (error) => Effect.succeed(`Retrying after: ${error.message}`)
  )
);

await Effect.runPromise(handled);
```

#### `catchSome` - Catch some errors

```ts
import { Effect, Option } from "effect";

const program = Effect.fail(new Error("Some error"));

const handled = program.pipe(
  Effect.catchSome((error) => {
    if (error instanceof Error) {
      return Option.some(Effect.succeed(`Handled: ${error.message}`));
    }
    return Option.none();
  })
);

await Effect.runPromise(handled);
```

### Convert to Either

```ts
import { Effect, Either } from "effect";

const program = Effect.gen(function* () {
  const n = yield* Random.next;
  if (n < 0.5) {
    yield* Effect.fail("error!");
  }
  return n;
});

// Convert to Either<Error, Success>
const eitherProgram = Effect.either(program);
// Either<string, number>

const result = await Effect.runPromise(eitherProgram);
// Result: Either.right(0.7) or Either.left("error!")
```

### Convert to Option

```ts
import { Effect, Option } from "effect";

const program = Effect.gen(function* () {
  const n = yield* Random.next;
  if (n < 0.5) {
    yield* Effect.fail("error!");
  }
  return n;
});

// Convert to Option (errors become Option.none)
const optionProgram = Effect.option(program);
// Option<number>

const result = await Effect.runPromise(optionProgram);
// Result: Option.some(0.7) or Option.none()
```

### Best practices

- **Define typed errors** using `Data.TaggedError` for better error handling
- **Handle errors explicitly** with `catchTag`, `catchSome`, or `catchAll`
- **Use Either/Option** when you want to work with the error as a value
- **Let defects fail** - don't catch unexpected errors unless you have a specific reason

## Class-based services with Effect.Service

Prefer defining services as classes that extend `Effect.Service`. The class is its own tag, you can provide a default or live implementation, and you wire alternate implementations with Layers.

Note: I prefer writing effectful code with `Effect.gen`, injecting dependencies inside the generator via `yield*` (for example, `const svc = yield* MyService`). This keeps APIs clean and type-safe while wiring via Layers.

### Generators — minimal examples

```ts
import { Effect } from "effect";

// Basic generator usage (no services)
const program = Effect.gen(function* () {
  const one = yield* Effect.succeed(1);
  const two = yield* Effect.succeed(2);
  const sum = one + two;
  yield* Effect.log(`sum=${sum}`);
  return sum;
});

await Effect.runPromise(program);
```

```ts
import { Effect, Context, Layer } from "effect";

// Injecting dependencies inside the generator
class Config extends Context.Tag("Config")<
  Config,
  { readonly greeting: string }
>() {}

const program = Effect.gen(function* () {
  const config = yield* Config;
  yield* Effect.log(`${config.greeting}, world`);
});

const ConfigLive = Layer.succeed(Config, { greeting: "Hello" as const });

await Effect.runPromise(program.pipe(Effect.provide(ConfigLive)));
```

### Benefits

- **Type-safe**: Precise method signatures; no `any`/`unknown`.
- **Self-tagged**: The class acts as the tag; access with `yield* MyService`.
- **Layer-driven**: Dependencies are provided via Layers without leaking into the interface.
- **Testable**: Override with `Effect.provideService` or a test Layer.

### Minimal example (no dependencies)

```ts
import { Effect } from "effect";

class Random extends Effect.Service<Random>()("app/Random", {
  // Provide a default implementation so the service is runnable without wiring
  effect: Effect.succeed({
    int: (min: number, max: number) =>
      Effect.sync(() => Math.floor(Math.random() * (max - min + 1)) + min),
  } as const),
}) {}

const program = Effect.gen(function* () {
  const random = yield* Random;
  const n = yield* random.int(1, 6);
  yield* Effect.log(`Rolled: ${n}`);
});

await Effect.runPromise(program);
```

### With dependencies (via Layers)

```ts
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";

// Define a Cache service
class Cache extends Effect.Service<Cache>()("app/Cache", {
  // Define how to create the service
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const lookup = (key: string) => fs.readFileString(`cache/${key}`);
    return { lookup } as const;
  }),
  // Specify dependencies
  dependencies: [NodeFileSystem.layer],
}) {}

const program = Effect.gen(function* () {
  const cache = yield* Cache;
  const value = yield* cache.lookup("user-123.json");
  yield* Effect.log(value);
});

await Effect.runPromise(program);
```

### Composing multiple dependencies

```ts
import { Effect, Layer, Context } from "effect";

class Config extends Context.Tag("Config")<
  Config,
  { readonly logLevel: "debug" | "info" }
>() {}

class Logger extends Effect.Service<Logger>()("app/Logger", {
  effect: Effect.gen(function* () {
    const config = yield* Config;
    return {
      info: (msg: string) => Effect.sync(() => console.log(`INFO  ${msg}`)),
      debug: (msg: string) =>
        config.logLevel === "debug"
          ? Effect.sync(() => console.log(`DEBUG ${msg}`))
          : Effect.unit,
    } as const;
  }),
}) {}

const ConfigLive = Layer.succeed(Config, { logLevel: "debug" as const });

const program = Effect.gen(function* () {
  const logger = yield* Logger;
  yield* logger.info("hello");
  yield* logger.debug("more detail");
});

await Effect.runPromise(program.pipe(Effect.provide(ConfigLive)));
```

### Overriding/Mocking a service

```ts
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const logger = yield* Logger;
  yield* logger.info("test path");
});

const LoggerMock = {
  info: (_msg: string) => Effect.unit,
  debug: (_msg: string) => Effect.unit,
} as const;

await Effect.runPromise(
  program.pipe(Effect.provideService(Logger, LoggerMock))
);
```

### Best practices

- Keep the service interface focused on its own methods; do not expose dependencies in method types.
- Declare dependencies via Layers in the class config; do not require them in the service shape.
- Return `Effect.Effect` from methods and lift side effects with `Effect.sync`.
- **NEVER call `Effect.runPromise`, `Effect.runSync`, or `Effect.runFork` inside service methods** - these are runtime execution functions that belong only at application boundaries (controllers, routers, test runners).
- Services should compose Effects using `yield*`, `Effect.flatMap`, `Effect.map`, etc., keeping all logic as composable Effect values.

### Notes on defaults

- Use `effect` to provide a live/default implementation. If your service should not have a default (e.g., it is per-request), omit it and require a Layer in wiring.
- If you need a purely synchronous in-memory default, you can also wrap with `Effect.succeed` or build a dedicated `Layer.succeed` when wiring.

### Option — minimal examples

```ts
import { Option } from "effect";

// Create Options
const a = Option.some(1);
const b = Option.none<number>();

// Transform
const doubled = Option.map(a, (n) => n * 2); // Some(2)
const flat = Option.flatMap(a, (n) =>
  n > 0 ? Option.some(n + 1) : Option.none()
); // Some(2)

// Extract with default
const value = Option.getOrElse(doubled, () => 0); // 2
```

```ts
import { Option } from "effect";

// Interop with nullable
declare const input: string | null | undefined;
const maybe = Option.fromNullable(input);

// Pattern match
const message = Option.match(maybe, {
  onNone: () => "missing",
  onSome: (s) => `got:${s}`,
});
```

```ts
import { Option } from "effect";

// Combine optional computations with a generator
const program = Option.gen(function* () {
  const x = yield* Option.some(2);
  const y = yield* Option.some(3);
  if (y === 0) return yield* Option.none<number>();
  return x + y; // Some(5)
});
```

```ts
import { Effect, Option } from "effect";

// Interop with Effect using match
declare const lookupUserName: (id: string) => Option.Option<string>;

const effectProgram = (id: string) =>
  Option.match(lookupUserName(id), {
    onNone: () => Effect.fail(new Error("User not found")),
    onSome: (name) => Effect.succeed(`Hello ${name}`),
  });

await Effect.runPromise(effectProgram("123"));
```

### Either — minimal examples

```ts
import { Either } from "effect";

// Create Eithers
const r = Either.right(1);
const l = Either.left("err");

// Map right and left
const mapped = Either.map(r, (n) => n + 1); // Right(2)
const mappedLeft = Either.mapLeft(l, (e) => `E:${e}`); // Left("E:err")

// Pattern match
const message = Either.match(r, {
  onLeft: (e) => `left:${e}`,
  onRight: (n) => `right:${n}`,
});
```

```ts
import { Either } from "effect";

// Combine computations with a generator
const program = Either.gen(function* () {
  const a = yield* Either.right(2);
  const b = yield* Either.right(3);
  if (b === 0) return yield* Either.left("division by zero");
  return a + b; // Right(5)
});
```

```ts
import { Effect, Either } from "effect";

// Interop with Effect
const toEffect = <A, E>(ea: Either.Either<A, E>) =>
  Either.match(ea, {
    onLeft: (e) => Effect.fail(e),
    onRight: (a) => Effect.succeed(a),
  });

await Effect.runPromise(toEffect(Either.right("ok")));
```


## Runtime Execution - Application Boundaries Only

Effect programs are **descriptions** of computations, not the computations themselves. They should be composed throughout your application and executed only at the boundaries.

### Where to run Effects

**✅ DO run Effects at these boundaries:**
- HTTP route handlers / controllers
- CLI command handlers
- Test runners (in test files)
- Main application entry point
- Event handlers at the edge of your system

**❌ DO NOT run Effects inside:**
- Service methods
- Business logic functions
- Utility functions
- Middleware (compose Effects instead)

### Example: Correct boundary execution

```ts
import { Effect } from "effect";

// ✅ Service returns Effect (does not run it)
class UserService extends Effect.Service<UserService>()("app/UserService", {
  effect: Effect.succeed({
    getUser: (id: string) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const user = yield* db.findUser(id);
        return user;
      }),
  } as const),
}) {}

// ✅ Controller runs Effect at the boundary
class UserController {
  async getUser(req: Request, res: Response) {
    const program = Effect.gen(function* () {
      const userService = yield* UserService;
      const user = yield* userService.getUser(req.params.id);
      return user;
    });

    // Run Effect only here at the HTTP boundary
    const user = await Effect.runPromise(program);
    res.json(user);
  }
}
```

### Example: Incorrect execution (anti-pattern)

```ts
// ❌ WRONG: Running Effect inside service method
class UserService extends Effect.Service<UserService>()("app/UserService", {
  effect: Effect.succeed({
    getUser: async (id: string) => {
      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.findUser(id);
      });
      // ❌ DO NOT DO THIS - breaks composability
      return await Effect.runPromise(program);
    },
  } as const),
}) {}
```

### Why this matters

1. **Composability**: Effects can be combined, transformed, and retried. Running them early loses these benefits.
2. **Testability**: Unexecuted Effects can be provided with test dependencies. Executed code is harder to mock.
3. **Error handling**: Effect's error channel works only when Effects remain unexecuted until the boundary.
4. **Resource management**: Effect's resource safety (scopes, finalizers) requires execution at the boundary.

### Key principle

> Build Effect programs by composing Effects. Execute them once at the application boundary.


## Pattern Matching

Effect provides powerful pattern matching capabilities through the `Match` module. Use pattern matching instead of if/else chains for cleaner, more maintainable code.

### Basic pattern matching

```ts
import { Match } from "effect";

// Match on values
const result = Match.value(input).pipe(
  Match.when((val) => val > 10, () => "large"),
  Match.when((val) => val > 5, () => "medium"),
  Match.orElse(() => "small")
);
```

### Pattern matching with Effects

```ts
import { Effect, Match } from "effect";

// Validation with pattern matching
const validateAge = (age: number) =>
  Match.value(age).pipe(
    Match.when((a) => a < 0, () =>
      Effect.fail(new ValidationError({ message: "Age cannot be negative" }))
    ),
    Match.when((a) => a > 150, () =>
      Effect.fail(new ValidationError({ message: "Age too high" }))
    ),
    Match.orElse((a) => Effect.succeed(a))
  );
```

### Pattern matching on tagged types

```ts
import { Match, Data } from "effect";

class Success extends Data.TaggedClass("Success")<{ value: number }> {}
class Failure extends Data.TaggedClass("Failure")<{ error: string }> {}

type Result = Success | Failure;

const handleResult = (result: Result) =>
  Match.type<Result>().pipe(
    Match.tag("Success", (s) => `Got value: ${s.value}`),
    Match.tag("Failure", (f) => `Error: ${f.error}`),
    Match.exhaustive // Ensures all cases are handled
  );
```

### Pattern matching on discriminated unions

```ts
import { Match } from "effect";

type Shape =
  | { type: "circle"; radius: number }
  | { type: "rectangle"; width: number; height: number }
  | { type: "square"; size: number };

const calculateArea = (shape: Shape) =>
  Match.value(shape).pipe(
    Match.when({ type: "circle" }, (s) => Math.PI * s.radius ** 2),
    Match.when({ type: "rectangle" }, (s) => s.width * s.height),
    Match.when({ type: "square" }, (s) => s.size ** 2),
    Match.exhaustive
  );
```

### Pattern matching with predicates

```ts
import { Match, Effect } from "effect";

const processInput = (input: string) =>
  Match.value(input).pipe(
    Match.when((s) => s.length === 0, () =>
      Effect.fail(new Error("Empty input"))
    ),
    Match.when((s) => s.length > 100, () =>
      Effect.fail(new Error("Input too long"))
    ),
    Match.when((s) => /^\d+$/.test(s), (s) =>
      Effect.succeed({ type: "number", value: parseInt(s) })
    ),
    Match.orElse((s) => Effect.succeed({ type: "string", value: s }))
  );
```

### Why use pattern matching?

1. **Exhaustiveness checking**: TypeScript ensures all cases are handled
2. **Type narrowing**: Automatic type refinement in each branch
3. **Readability**: Clearer intent than nested if/else
4. **Composability**: Works seamlessly with Effect pipelines

### Best practices

- Use `Match.exhaustive` to ensure all cases are covered
- Prefer `Match.when` with predicates over if/else chains
- Use `Match.tag` for discriminated unions and tagged errors
- Combine with Effect for validation and error handling


## Additional Resources

When working with Effect, always refer to the official documentation for the most up-to-date information:

### Official Documentation

- **Effect Website**: https://effect.website/
  - Comprehensive guides and tutorials
  - API reference for all Effect modules
  - Code style guidelines and best practices

- **Effect API Docs**: https://effect-ts.github.io/effect/
  - Detailed API documentation for all packages
  - Type signatures and usage examples
  - Module-by-module reference

- **Effect Platform Docs**: https://effect-ts.github.io/effect/platform/
  - HttpClient, FileSystem, and other platform services
  - Node.js and browser-specific implementations
  - Integration guides

### Key Packages

- `effect` - Core Effect library
- `@effect/platform` - Platform services (HttpClient, FileSystem, etc.)
- `@effect/platform-node` - Node.js-specific implementations
- `@effect/schema` - Schema validation and transformation

### When to Search Online

**Always search the official Effect documentation when:**
- You encounter unfamiliar Effect syntax or APIs
- You need to understand how a specific Effect module works
- You're looking for best practices or patterns
- You need to see usage examples for Effect functions
- You're debugging Effect-related type errors

### Search Strategy

1. Start with the Effect website (https://effect.website/) for conceptual understanding
2. Check the API docs (https://effect-ts.github.io/effect/) for specific function signatures
3. Look for examples in the Effect GitHub repository
4. Search for "Effect-TS [your topic]" for community resources

### Important Note

Effect is actively developed and APIs may evolve. Always verify syntax and patterns against the latest official documentation rather than relying solely on older examples or tutorials.


## Effect.gen Return Values

**Important:** `Effect.gen` automatically wraps return values in `Effect`. When you return a plain value from a generator function, it becomes `Effect.succeed(value)`.

### Correct pattern - return plain values

```ts
import { Effect } from "effect";

// ✅ CORRECT: Return plain value from generator
const program = Effect.gen(function* () {
  const x = yield* Effect.succeed(1);
  const y = yield* Effect.succeed(2);
  return x + y; // Returns plain number, Effect.gen wraps it as Effect.succeed(3)
});
// Type: Effect<number, never, never>
```

### Incorrect pattern - don't wrap in Effect.succeed

```ts
// ❌ WRONG: Don't wrap return value in Effect.succeed
const program = Effect.gen(function* () {
  const x = yield* Effect.succeed(1);
  const y = yield* Effect.succeed(2);
  return Effect.succeed(x + y); // ❌ Double wrapping!
});
// Type: Effect<Effect<number, never, never>, never, never> - WRONG!
```

### When to use yield*

Use `yield*` to unwrap Effect values inside the generator:

```ts
const program = Effect.gen(function* () {
  // ✅ Use yield* to unwrap Effects
  const user = yield* getUserById("123");
  const posts = yield* getPostsByUser(user.id);
  
  // ✅ Return plain value
  return { user, posts };
});
```

### Failing from generators

When you want to fail, use `yield* Effect.fail()`:

```ts
const validateAge = (age: number) =>
  Effect.gen(function* () {
    if (age < 0) {
      // ✅ Use yield* to fail
      return yield* Effect.fail(new Error("Age cannot be negative"));
    }
    // ✅ Return plain value on success
    return age;
  });
```

### Pattern matching in generators

```ts
const processInput = (input: string) =>
  Effect.gen(function* () {
    // ✅ Use yield* with Match that returns Effects
    return yield* Match.value(input.length).pipe(
      Match.when((len) => len === 0, () =>
        Effect.fail(new Error("Empty input"))
      ),
      Match.orElse(() =>
        Effect.succeed(input) // This Effect will be unwrapped by yield*
      )
    );
  });
```

### Key takeaway

> Inside `Effect.gen`, return plain values for success cases. Effect.gen automatically wraps them. Only use `yield*` when you need to unwrap an Effect or fail explicitly.

## When to Use Effect.gen vs Direct Effect Construction

**Important:** Only use `Effect.gen` when you have complex logic with multiple effectful operations. For simple cases, use direct Effect construction.

### ❌ WRONG: Effect.gen for single return

```ts
// ❌ Don't use Effect.gen for a single return statement
const createButton = (title: string, url: string) =>
  Effect.gen(function* () {
    return { type: "web_url", title, url };
  });

// ❌ Don't use Effect.gen just to unwrap one Effect
const createButton = (title: string, url: string) =>
  Effect.gen(function* () {
    return yield* validateAndCreate(title, url);
  });
```

### ✅ CORRECT: Direct Effect construction for simple cases

```ts
// ✅ Use Effect.succeed for simple success values
const createButton = (title: string, url: string) =>
  Effect.succeed({ type: "web_url", title, url });

// ✅ Use Effect.fail for simple failures
const validateTitle = (title: string) =>
  title.length > 20
    ? Effect.fail(new ValidationError({ field: "title", message: "Too long" }))
    : Effect.succeed(title);

// ✅ Just return the Effect directly if it's already an Effect
const createButton = (title: string, url: string) =>
  validateAndCreate(title, url);
```

### ✅ CORRECT: Use Effect.gen for complex logic

```ts
// ✅ Use Effect.gen when you have multiple effectful operations
const createButtonTemplate = (text: string, buttons: Button[]) =>
  Effect.gen(function* () {
    // Multiple operations that need to be sequenced
    const service = yield* ButtonService;
    const validated = yield* service.validateText(text);
    const processedButtons = yield* service.processButtons(buttons);
    const template = yield* service.createTemplate(validated, processedButtons);
    return template;
  });

// ✅ Use Effect.gen when you need conditional logic with effects
const processUser = (id: string) =>
  Effect.gen(function* () {
    const user = yield* getUserById(id);
    if (user.isPremium) {
      yield* grantPremiumAccess(user);
    } else {
      yield* grantBasicAccess(user);
    }
    return user;
  });
```

## When to Use Match vs Simple If/Else

**Important:** Only use `Match` for complex pattern matching scenarios. For simple conditions, use regular if/else statements.

### ❌ WRONG: Match for simple conditions

```ts
// ❌ Don't use Match for simple if/else
const validate = (length: number) =>
  Match.value(length).pipe(
    Match.when((len) => len > 20, () =>
      Effect.fail(new ValidationError({ message: "Too long" }))
    ),
    Match.orElse(() => Effect.succeed(length))
  );
```

### ✅ CORRECT: Use if/else for simple conditions

```ts
// ✅ Use simple if/else for straightforward conditions
const validate = (length: number) =>
  length > 20
    ? Effect.fail(new ValidationError({ message: "Too long" }))
    : Effect.succeed(length);

// ✅ Use if/else inside Effect.gen when needed
const validateButton = (title: string, url: string) =>
  Effect.gen(function* () {
    if (title.length > 20) {
      return yield* Effect.fail(new ValidationError({ field: "title", message: "Too long" }));
    }
    if (!url.startsWith("http")) {
      return yield* Effect.fail(new ValidationError({ field: "url", message: "Invalid URL" }));
    }
    return { title, url };
  });
```

### ✅ CORRECT: Use Match for complex pattern matching

```ts
// ✅ Use Match for discriminated unions
type Result = Success | Failure | Pending;

const handleResult = (result: Result) =>
  Match.type<Result>().pipe(
    Match.tag("Success", (s) => processSuccess(s)),
    Match.tag("Failure", (f) => handleFailure(f)),
    Match.tag("Pending", (p) => waitForCompletion(p)),
    Match.exhaustive
  );

// ✅ Use Match for multiple conditions with type narrowing
const calculatePrice = (user: User) =>
  Match.value(user).pipe(
    Match.when({ type: "premium", yearsActive: (y) => y > 5 }, () => 0),
    Match.when({ type: "premium" }, () => 9.99),
    Match.when({ type: "basic", referrals: (r) => r > 10 }, () => 4.99),
    Match.when({ type: "basic" }, () => 14.99),
    Match.orElse(() => 19.99)
  );
```

### Key Guidelines

1. **Use Effect.gen only when:**
   - You have multiple effectful operations to sequence
   - You need complex conditional logic with effects
   - You're injecting multiple services

2. **Use direct Effect construction when:**
   - You have a single return value
   - You're just wrapping a value in Effect.succeed/Effect.fail
   - You're returning an Effect that's already constructed

3. **Use Match only when:**
   - You have discriminated unions or tagged types
   - You need exhaustiveness checking
   - You have complex multi-condition pattern matching

4. **Use if/else when:**
   - You have simple boolean conditions
   - You have 1-2 straightforward checks
   - The logic is more readable with if/else
