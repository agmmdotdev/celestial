# NestJS to Effect Services Migration

This document tracks the migration of services from NestJS dependency injection to Effect-TS service architecture.

## Overview

The migration transforms approximately 15 services to use Effect's composable service pattern with:
- Type-safe dependency injection via Layers
- Explicit error handling with tagged errors
- Composable effects instead of Promises
- Better testability with mock layers

## Project Structure

```
service/
├── errors/                      # Error type definitions
│   ├── config.errors.ts         # Configuration errors
│   ├── validation.errors.ts     # Input validation errors
│   ├── facebook.errors.ts       # Facebook API errors
│   └── index.ts                 # Error exports
├── effect/                      # Effect-based services
│   ├── env.service.ts           # Environment configuration
│   ├── facebook/                # Facebook Graph API services
│   │   ├── messaging.service.ts
│   │   ├── button-template.service.ts
│   │   ├── quick-replies.service.ts
│   │   └── ...
│   └── README.md
├── layers/                      # Layer compositions
│   ├── app.layer.ts             # Production layer
│   ├── test.layer.ts            # Test layer with mocks
│   └── README.md
└── service/                     # Legacy NestJS services (to be removed)
    └── ...
```

## Foundation Setup ✅

### Error Types

Three core error types have been defined:

1. **ConfigError** - Environment configuration failures
   - Thrown during service initialization
   - Contains error message and optional cause

2. **ValidationError** - Input validation failures
   - Contains field name and validation message
   - Used for business rule validation

3. **FacebookApiError** - Facebook Graph API errors
   - Contains HTTP status code, error message, and trace ID
   - Used for API error responses

### Effect Packages

The following Effect packages are available via `@celestial/effect`:
- `effect` - Core Effect library
- `@effect/platform` - Platform abstractions (HttpClient, etc.)
- `@effect/platform-node` - Node.js specific implementations

Import from `@celestial/effect`:
```typescript
import { Effect, Data, Layer } from "@celestial/effect";
import { HttpClient } from "@celestial/effect/platform";
```

### Directory Structure

- `service/errors/` - Centralized error definitions
- `service/effect/` - New Effect services
- `service/effect/facebook/` - Facebook API services
- `service/layers/` - Layer compositions

## Migration Checklist

### Phase 1: Foundation ✅
- [x] Create error type definitions
- [x] Set up project structure
- [x] Verify Effect packages available
- [x] Create documentation

### Phase 2: Core Services
- [ ] Implement EnvService (Effect)
- [ ] Set up HttpClient integration

### Phase 3: Template Services
- [ ] Migrate ButtonTemplateService
- [ ] Migrate QuickRepliesService
- [ ] Migrate CouponTemplateService
- [ ] Migrate GenericTemplateService
- [ ] Migrate ReceiptTemplateService

### Phase 4: API Services
- [ ] Migrate MessagingService
- [ ] Migrate WebhookService
- [ ] Migrate FacebookOAuthService
- [ ] Migrate SenderActionService
- [ ] Migrate ConversationApiService

### Phase 5: Event Handlers
- [ ] Migrate message event handlers
- [ ] Migrate postback handlers
- [ ] Migrate echo message handlers

### Phase 6: Integration & Cleanup
- [ ] Update controllers
- [ ] Remove NestJS dependencies
- [ ] Update tests
- [ ] Final documentation

## Key Patterns

### Service Definition

```typescript
class MyService extends Effect.Service<MyService>()("app/MyService", {
  effect: Effect.succeed({
    myMethod: (input: string) => Effect.succeed(input.toUpperCase())
  })
}) {}
```

### With Dependencies

```typescript
class MyService extends Effect.Service<MyService>()("app/MyService", {
  effect: Effect.gen(function* () {
    const dep = yield* DependencyService;
    return {
      myMethod: () => Effect.succeed(dep.value)
    };
  }),
  dependencies: [DependencyService.Default]
}) {}
```

### Error Handling

```typescript
import { ValidationError } from "../errors/index.js";

myMethod: (input: string) => Effect.gen(function* () {
  if (input.length > 20) {
    return yield* Effect.fail(
      new ValidationError({
        field: "input",
        message: "Input too long"
      })
    );
  }
  return input;
})
```

### Execution Boundaries

```typescript
// In service - compose, don't execute
myMethod: () => Effect.gen(function* () {
  const result = yield* otherService.doSomething();
  return result;
})

// At controller boundary - execute
async handleRequest() {
  const program = Effect.gen(function* () {
    const service = yield* MyService;
    return yield* service.myMethod();
  });
  
  try {
    return await Effect.runPromise(program);
  } catch (error) {
    // Handle errors
  }
}
```

## Testing

### Mock Services

```typescript
const MockService = Layer.succeed(MyService, {
  myMethod: () => Effect.succeed("mock result")
});
```

### Test Execution

```typescript
const program = Effect.gen(function* () {
  const service = yield* MyService;
  return yield* service.myMethod();
});

const result = await Effect.runPromise(
  program.pipe(Effect.provide(MockService))
);
```

## Resources

- [Effect Documentation](https://effect.website/)
- [Effect Platform HttpClient](https://effect-ts.github.io/effect/platform/HttpClient.ts.html)
- [Pattern Matching Guide](https://effect.website/docs/code-style/pattern-matching/)
- [Migration Spec](.kiro/specs/nestjs-to-effect-services/)
