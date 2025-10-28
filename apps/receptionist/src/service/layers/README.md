# Service Layers

This directory contains Layer compositions for wiring Effect services together.

## Structure

```
layers/
├── app.layer.ts      # Main application layer composition
├── test.layer.ts     # Test layer with mock implementations
└── README.md         # This file
```

## Layer Composition

Layers describe how to build services and their dependencies. They are composed using Layer operators:

### Main Application Layer

The main application layer composes all production services:

```typescript
import { Layer } from "@celestial/effect";

export const AppLayer = Layer.mergeAll(
  EnvService.Default,
  HttpClient.layer,
  MessagingService.Default,
  // ... other services
);
```

### Test Layer

The test layer provides mock implementations for testing:

```typescript
import { Layer } from "@celestial/effect";

export const TestLayer = Layer.mergeAll(
  EnvServiceMock,
  HttpClientMock,
  // ... other mocks
);
```

## Usage

### In Application Code

Provide the main layer at the application entry point:

```typescript
const program = Effect.gen(function* () {
  const messaging = yield* MessagingService;
  return yield* messaging.sendTextMessage(...);
});

// At application boundary
const result = await Effect.runPromise(
  program.pipe(Effect.provide(AppLayer))
);
```

### In Tests

Provide the test layer with mocks:

```typescript
const program = Effect.gen(function* () {
  const messaging = yield* MessagingService;
  return yield* messaging.sendTextMessage(...);
});

const result = await Effect.runPromise(
  program.pipe(Effect.provide(TestLayer))
);
```

## Dependency Graph

Services are wired in dependency order. The layer system ensures:
- Dependencies are initialized before dependents
- Circular dependencies are detected at compile time
- Services are properly scoped and cleaned up

Example dependency graph:
```
EnvService (no dependencies)
  ↓
HttpClient (no dependencies)
  ↓
MessagingService (depends on: EnvService, HttpClient, ButtonTemplateService)
  ↓
Controllers (depend on: MessagingService, etc.)
```
