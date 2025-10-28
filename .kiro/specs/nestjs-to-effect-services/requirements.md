# Requirements Document

## Introduction

This document outlines the requirements for migrating the receptionist application's service layer from NestJS-style dependency injection to Effect-TS service architecture. The migration will transform approximately 15 services in the `apps/receptionist/src/service/service` directory to use Effect's class-based service pattern with proper dependency injection, error handling, and type safety.

## Glossary

- **Effect Service**: A class that extends `Effect.Service` providing type-safe, composable service definitions with built-in dependency injection
- **Layer**: An Effect construct that describes how to build a service and its dependencies
- **Service Tag**: A unique identifier for a service used in Effect's dependency injection system
- **Generator Function**: An Effect pattern using `Effect.gen` and `yield*` for sequential effectful operations
- **Tagged Error**: A typed error class extending `Data.TaggedError` for explicit error handling in the Effect type system
- **NestJS Service**: A class decorated with `@Injectable()` using constructor-based dependency injection
- **Receptionist Application**: The chatbot application located in `apps/receptionist`
- **Service Layer**: The collection of services in `apps/receptionist/src/service/service`

## Requirements

### Requirement 1: Service Architecture Migration

**User Story:** As a developer, I want to migrate all NestJS services to Effect services, so that I can leverage Effect's type-safe dependency injection and error handling capabilities.

#### Acceptance Criteria

1. WHEN converting a NestJS service, THE Receptionist Application SHALL create an Effect service class that extends `Effect.Service<ServiceName>()`
2. WHEN defining a service identifier, THE Receptionist Application SHALL use the pattern `"app/ServiceName"` as the service tag
3. WHEN a service has no external dependencies, THE Receptionist Application SHALL provide a default implementation using the `effect` property with `Effect.succeed` or `Effect.gen`
4. WHEN a service depends on other services, THE Receptionist Application SHALL inject dependencies via `yield*` within the effect implementation and provide them via `Layer.provide` for better testability
5. WHEN implementing service methods, THE Receptionist Application SHALL return `Effect.Effect<Success, Error, Requirements>` types instead of Promises or synchronous values

### Requirement 2: Dependency Injection Transformation

**User Story:** As a developer, I want service dependencies to be managed through Effect Layers, so that I can compose services declaratively and test them in isolation.

#### Acceptance Criteria

1. WHEN a NestJS service uses constructor injection, THE Receptionist Application SHALL convert it to Effect Layer-based dependency injection
2. WHEN accessing a dependency within a service, THE Receptionist Application SHALL use `yield* ServiceName` within `Effect.gen` functions
3. WHEN a service requires HttpService from NestJS, THE Receptionist Application SHALL create an Effect-based HTTP service wrapper
4. WHEN a service requires EnvService, THE Receptionist Application SHALL convert EnvService to an Effect service providing environment configuration
5. WHEN wiring services together, THE Receptionist Application SHALL compose layers using Layer composition operators

### Requirement 3: Error Handling Migration

**User Story:** As a developer, I want explicit, typed error handling in services, so that I can handle failures predictably and maintain type safety throughout the application.

#### Acceptance Criteria

1. WHEN a service method can fail, THE Receptionist Application SHALL define custom error types using `Data.TaggedError`
2. WHEN converting try-catch blocks, THE Receptionist Application SHALL use `Effect.tryPromise` or `Effect.try` with explicit error mapping
3. WHEN a service throws exceptions, THE Receptionist Application SHALL convert them to Effect failures using `Effect.fail`
4. WHEN handling HTTP errors, THE Receptionist Application SHALL create tagged error types such as `HttpError`, `NetworkError`, or `ApiError`
5. WHEN validating input, THE Receptionist Application SHALL use Effect's error channel to represent validation failures

### Requirement 4: HTTP Service Abstraction

**User Story:** As a developer, I want an Effect-based HTTP service to replace NestJS HttpService, so that HTTP operations integrate seamlessly with Effect's error handling and composition.

#### Acceptance Criteria

1. WHEN making HTTP requests, THE Receptionist Application SHALL provide an Effect service wrapping HTTP functionality
2. WHEN an HTTP request fails, THE Receptionist Application SHALL map Axios errors to typed Effect errors
3. WHEN making a GET request, THE Receptionist Application SHALL return `Effect.Effect<Response, HttpError, never>`
4. WHEN making a POST request, THE Receptionist Application SHALL accept request body and return typed Effect with proper error handling
5. WHEN configuring HTTP clients, THE Receptionist Application SHALL support base URL, headers, and timeout configuration through service initialization

### Requirement 5: Environment Configuration Service

**User Story:** As a developer, I want the EnvService converted to an Effect service, so that environment configuration is available through Effect's dependency injection system.

#### Acceptance Criteria

1. WHEN accessing environment variables, THE Receptionist Application SHALL provide an Effect service that exposes configuration methods
2. WHEN environment validation fails, THE Receptionist Application SHALL fail with a typed `ConfigError` during service initialization
3. WHEN retrieving a configuration value, THE Receptionist Application SHALL return `Effect.Effect<ConfigValue, never, never>` for required values
4. WHEN the service initializes, THE Receptionist Application SHALL validate all environment variables using the existing znv schema
5. WHEN providing the EnvService, THE Receptionist Application SHALL use `Layer.succeed` or `Layer.effect` to create the configuration layer

### Requirement 6: Facebook Graph API Services Migration

**User Story:** As a developer, I want all Facebook Graph API services migrated to Effect services, so that Facebook API interactions benefit from Effect's composability and error handling.

#### Acceptance Criteria

1. WHEN converting MessagingService, THE Receptionist Application SHALL maintain all existing message sending methods with Effect return types
2. WHEN converting ButtonTemplateService, THE Receptionist Application SHALL preserve all button creation methods returning Effect values
3. WHEN converting QuickRepliesService, THE Receptionist Application SHALL maintain quick reply creation and validation logic with Effect types
4. WHEN converting webhook event handlers, THE Receptionist Application SHALL use Effect generators for event processing
5. WHEN services depend on EnvService or HttpClient, THE Receptionist Application SHALL inject these dependencies via `yield*` and provide them through layers

### Requirement 7: Service Method Signatures

**User Story:** As a developer, I want consistent method signatures across all Effect services, so that service usage is predictable and type-safe.

#### Acceptance Criteria

1. WHEN a method performs side effects, THE Receptionist Application SHALL return `Effect.Effect<Result, Error, never>` where Error is a specific tagged error type
2. WHEN a method is pure computation, THE Receptionist Application SHALL return `Effect.Effect<Result, never, never>` using `Effect.sync` or `Effect.succeed`
3. WHEN a method requires dependencies, THE Receptionist Application SHALL inject them via `yield*` within the method implementation
4. WHEN a method validates input, THE Receptionist Application SHALL return validation errors in the Error channel
5. WHEN a method has optional parameters, THE Receptionist Application SHALL use TypeScript optional parameters with sensible defaults

### Requirement 8: Testing Support

**User Story:** As a developer, I want Effect services to be easily testable, so that I can write unit tests with mocked dependencies.

#### Acceptance Criteria

1. WHEN testing a service, THE Receptionist Application SHALL support providing mock implementations via `Effect.provideService`
2. WHEN a service has dependencies, THE Receptionist Application SHALL allow test layers to replace dependencies
3. WHEN creating test fixtures, THE Receptionist Application SHALL provide example mock implementations for common services
4. WHEN running tests in isolation, THE Receptionist Application SHALL use `Effect.runPromise` or `Effect.runSync` only in test runners at the boundary
5. WHEN asserting on errors, THE Receptionist Application SHALL use `Effect.either` or `Effect.exit` to capture error values

### Requirement 9: Runtime Execution Boundaries

**User Story:** As a developer, I want clear separation between Effect composition and execution, so that services remain composable and execution happens only at application boundaries.

#### Acceptance Criteria

1. WHEN implementing service methods, THE Receptionist Application SHALL return Effect values without executing them
2. WHEN services call other services, THE Receptionist Application SHALL compose Effects using `yield*` or `Effect.flatMap` without running them
3. WHEN integrating with controllers or routers, THE Receptionist Application SHALL use `Effect.runPromise` only at the application boundary layer
4. WHEN creating service implementations, THE Receptionist Application SHALL avoid calling `Effect.runPromise`, `Effect.runSync`, or `Effect.runFork` within service code
5. WHEN building Effect programs, THE Receptionist Application SHALL keep all business logic as composable Effect values until the final execution point

### Requirement 10: Backward Compatibility

**User Story:** As a developer, I want a gradual migration path, so that I can migrate services incrementally without breaking existing functionality.

#### Acceptance Criteria

1. WHEN migrating services, THE Receptionist Application SHALL maintain existing public API contracts where possible
2. WHEN both NestJS and Effect services coexist, THE Receptionist Application SHALL provide adapter functions if needed
3. WHEN a service is migrated, THE Receptionist Application SHALL update all direct consumers to use the Effect version
4. WHEN integration points exist with NestJS controllers, THE Receptionist Application SHALL execute Effects using `Effect.runPromise` only in controller methods
5. WHEN the migration is complete, THE Receptionist Application SHALL remove all NestJS service decorators and dependencies

### Requirement 11: Effect Documentation Reference

**User Story:** As a developer implementing Effect services, I want to reference official Effect documentation, so that I use the correct and up-to-date Effect APIs and patterns.

#### Acceptance Criteria

1. WHEN encountering unfamiliar Effect syntax or APIs, THE Receptionist Application SHALL search the official Effect documentation at https://effect.website/ and https://effect-ts.github.io/effect/
2. WHEN implementing HTTP functionality, THE Receptionist Application SHALL reference the @effect/platform HttpClient documentation at https://effect-ts.github.io/effect/platform/HttpClient.ts.html
3. WHEN using Effect modules or functions, THE Receptionist Application SHALL verify syntax and patterns against the latest official documentation
4. WHEN implementing pattern matching, THE Receptionist Application SHALL follow the patterns documented at https://effect.website/docs/code-style/pattern-matching/
5. WHEN uncertain about Effect best practices, THE Receptionist Application SHALL consult the Effect website's guides and code style documentation

### Requirement 12: Documentation and Examples

**User Story:** As a developer, I want clear documentation and examples for Effect services, so that I can understand how to use and extend the new service architecture.

#### Acceptance Criteria

1. WHEN a service is migrated, THE Receptionist Application SHALL include JSDoc comments explaining the Effect return types
2. WHEN creating complex services, THE Receptionist Application SHALL provide usage examples in comments or separate example files
3. WHEN documenting error types, THE Receptionist Application SHALL list all possible errors a method can produce
4. WHEN explaining dependency injection, THE Receptionist Application SHALL document how to wire services with layers
5. WHEN providing examples, THE Receptionist Application SHALL show Effect composition patterns and emphasize that `Effect.runPromise` belongs only at application boundaries
