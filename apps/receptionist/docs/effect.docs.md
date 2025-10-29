## Effect Quick Reference

### Constructors & Utilities
- `Effect.succeed`, `Effect.fail`, `Effect.sync`, `Effect.tryPromise`
- `Effect.gen`, `Effect.map`, `Effect.andThen`, `Effect.tap`
- `Effect.catchTag`, `Effect.catchAll`, `Effect.catchSome`, `Effect.catchIf`
- `Effect.provide`, `Effect.provideService`, `Effect.runPromise`
- Core modules used often: `Effect`, `Context`, `Layer`, `Option`, `Either`, `Array`, `Match`

### Error Channel Model
```
Effect<Success, Error, Requirements>
```
- Success: resolved value type.
- Error: declared failure type (define with `Data.TaggedError`).
- Requirements: dependencies that must be provided.

```ts
import { Data, Effect } from "effect";

class HttpError extends Data.TaggedError("HttpError")<{}> {}

const program = Effect.gen(function* () {
  const n = yield* Effect.random;
  if (n < 0.5) {
    return yield* Effect.fail(new HttpError());
  }
  return "success";
});
```

### Handling & Recovering
- `catchAll` for a single fallback; use `catchAllCause` when you need defect insight.
- Narrow with `catchTag`, or selectively recover with `catchSome` / `catchIf`.
- Convert to value-based APIs via `Effect.either(program)` or `Effect.option(program)`.
- Prefer explicit recovery paths; let defects bubble unless you have a plan.

### Guiding Principles
- Keep errors typed end-to-end; avoid `any` or `unknown`.
- Compose effects; do not execute them until a boundary.
- Use Either/Option conversions when integrating with non-effect code.

## Services with `Effect.Service`

```ts
import { Effect, Layer } from "effect";

class Cache extends Effect.Service<Cache>()("app/Cache", {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return {
      lookup: (key: string) => fs.readFileString(`cache/${key}`),
    } as const;
  }),
  dependencies: [NodeFileSystem.layer],
}) {}

const program = Effect.gen(function* () {
  const cache = yield* Cache;
  return yield* cache.lookup("user-123.json");
});
```

- Classes are self-tagged; access them with `const svc = yield* MyService`.
- Declare dependencies in `dependencies`; production code usually wires `Service.Default`.
- Methods must return `Effect.Effect` and stay pure from runtime execution helpers.

### Override Pattern
- Production wiring: `Effect.provide(MyService.Default)`.
- Tests: `MyService.DefaultWithoutDependencies.pipe(Layer.provide(mockLayers))`.
- This keeps live wiring simple and test wiring flexible.

## Execution Boundaries

- **Run effects** at controllers, CLI entry points, tests, and other edges.
- **Do not run effects** inside services, domain logic helpers, or middleware.
- Compose first, execute once: `await Effect.runPromise(program)` belongs only at the boundary.

```ts
class UserController {
  async getUser(req: Request, res: Response) {
    const program = Effect.gen(function* () {
      const service = yield* UserService;
      return yield* service.getUser(req.params.id);
    });

    res.json(await Effect.runPromise(program));
  }
}
```

## Working with `Effect.gen`

- `yield*` unwraps an effect; return plain values so `Effect.gen` wraps them for you.
- Fail early with `yield* Effect.fail(error)`; no need for manual rejects.
- Reach for `Effect.gen` when sequencing multiple effectful steps or branching.
- Skip it when you only return a literal or forward an existing effect.

```ts
const sum = Effect.gen(function* () {
  const one = yield* Effect.succeed(1);
  const two = yield* Effect.succeed(2);
  return one + two;
});
```

## Pattern Matching (`Match`)

- Ideal for discriminated unions, structural guards, and exhaustiveness.
- For single boolean checks, plain `if`/`else` remains clearer.

```ts
const calculatePrice = (user: User) =>
  Match.value(user).pipe(
    Match.when({ type: "premium", yearsActive: (y) => y > 5 }, () => 0),
    Match.when({ type: "premium" }, () => 9.99),
    Match.when({ type: "basic", referrals: (r) => r > 10 }, () => 4.99),
    Match.orElse(() => 14.99)
  );
```

## Option & Either Cheatsheet

- `Option.some`, `Option.none`, `Option.fromNullable`, `Option.match`
- `Either.right`, `Either.left`, `Either.map`, `Either.mapLeft`, `Either.match`
- Bridge to effects with pattern matching:

```ts
const toEffect = <A, E>(either: Either.Either<A, E>) =>
  Either.match(either, {
    onLeft: (error) => Effect.fail(error),
    onRight: (value) => Effect.succeed(value),
  });
```

## Quick Reference: Match vs If/Else
- Use `Match` for complex pattern matching, tagged errors, or when you want `Match.exhaustive` to guard future changes.
- Use `if/else` for short, linear predicates or single checks inside generators.

## Service Wiring Summary
- Implement services with `Effect.Service` and return effectful methods only.
- Production: provide `Service.Default` to supply declared dependencies.
- Tests: start from `Service.DefaultWithoutDependencies` and inject mocks.
- Execute the composed effect in the test body or controller, never inside the service.

## Additional Resources
- Effect docs: https://effect.website/
- API reference: https://effect-ts.github.io/effect/
- Platform docs: https://effect-ts.github.io/effect/platform/
- Always verify examples against the latest documentation; APIs evolve quickly.

