# Effect Services

This directory contains Effect-TS based services that replace the NestJS dependency injection pattern with Effect's composable service architecture.

## Structure

```
effect/
├── env.service.ts              # Environment configuration service
├── facebook/                   # Facebook Graph API services
│   ├── messaging.service.ts
│   ├── button-template.service.ts
│   ├── quick-replies.service.ts
│   ├── coupon-template.service.ts
│   ├── generic-template.service.ts
│   ├── receipt-template.service.ts
│   ├── webhook.service.ts
│   ├── facebook-oauth.service.ts
│   ├── sender-action.service.ts
│   └── conversation-api.service.ts
└── README.md                   # This file
```

## Key Concepts

### Effect Services

Services are defined using `Effect.Service` and provide type-safe dependency injection:

```typescript
class MyService extends Effect.Service<MyService>()("app/MyService", {
  effect: Effect.succeed({
    myMethod: () => Effect.succeed("result")
  })
}) {}
```

### Dependencies

Services declare dependencies via the `dependencies` array:

```typescript
class MyService extends Effect.Service<MyService>()("app/MyService", {
  effect: Effect.gen(function* () {
    const dep = yield* DependencyService;
    return {
      myMethod: () => Effect.succeed(dep.someValue)
    };
  }),
  dependencies: [DependencyService.Default]
}) {}
```

### Error Handling

All errors are typed using `Data.TaggedError`:

```typescript
class MyError extends Data.TaggedError("MyError")<{
  readonly message: string;
}> {}

// Usage
Effect.fail(new MyError({ message: "Something went wrong" }))
```

### Execution Boundaries

Effects are composed but not executed within services. Execution happens only at application boundaries (controllers, handlers):

```typescript
// In service - compose, don't execute
myMethod: () => Effect.gen(function* () {
  const result = yield* otherService.doSomething();
  return result;
})

// At boundary - execute
const result = await Effect.runPromise(program);
```

## Testing

Services can be tested with mock implementations:

```typescript
const MockService = Layer.succeed(MyService, {
  myMethod: () => Effect.succeed("mock result")
});

const program = Effect.gen(function* () {
  const service = yield* MyService;
  return yield* service.myMethod();
});

const result = await Effect.runPromise(
  program.pipe(Effect.provide(MockService))
);
```

## Migration Status

Services are being migrated from NestJS to Effect incrementally. See the main spec document for the full migration plan.
