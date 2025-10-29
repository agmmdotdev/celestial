import { Effect, Layer } from "@celestial/effect";
import { describe, it, expect } from "vitest";
import { ConversationApiService } from "./conversation-api.service.js";
import { createMockHttpClient, MockEnvService } from "./test-utils.js";

// Create mock responses for different endpoints
const createMockThreadControlResponse = () => ({
  json: Effect.succeed({
    success: true,
  }),
});

const createMockThreadOwnerResponse = () => ({
  json: Effect.succeed({
    data: [
      {
        app_id: "mock-app-id-123",
      },
    ],
  }),
});

const createMockSecondaryReceiversResponse = () => ({
  json: Effect.succeed({
    data: [
      {
        id: "app-id-1",
        name: "Secondary App 1",
      },
      {
        id: "app-id-2",
        name: "Secondary App 2",
      },
    ],
  }),
});

// Mock HttpClient layer for thread control operations
const MockHttpClient = createMockHttpClient(createMockThreadControlResponse);

// Test layer with mocks
const TestLayer = ConversationApiService.DefaultWithoutDependencies.pipe(
  Layer.provide(Layer.mergeAll(MockHttpClient, MockEnvService))
);

describe("ConversationApiService", () => {
  describe("passThreadControl", () => {
    it("should pass thread control successfully", async () => {
      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.passThreadControl(
          "test-page-id",
          "test-user-id",
          "target-app-id"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.success).toBe(true);
    });

    it("should pass thread control with metadata", async () => {
      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.passThreadControl(
          "test-page-id",
          "test-user-id",
          "target-app-id",
          "Passing to human agent"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.success).toBe(true);
    });

    it("should pass thread control with custom access token", async () => {
      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.passThreadControl(
          "test-page-id",
          "test-user-id",
          "target-app-id",
          undefined,
          "custom-access-token"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.success).toBe(true);
    });
  });

  describe("takeThreadControl", () => {
    it("should take thread control successfully", async () => {
      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.takeThreadControl(
          "test-page-id",
          "test-user-id"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.success).toBe(true);
    });

    it("should take thread control with metadata", async () => {
      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.takeThreadControl(
          "test-page-id",
          "test-user-id",
          "Taking control back"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.success).toBe(true);
    });

    it("should take thread control with custom access token", async () => {
      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.takeThreadControl(
          "test-page-id",
          "test-user-id",
          undefined,
          "custom-access-token"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.success).toBe(true);
    });
  });

  describe("requestThreadControl", () => {
    it("should request thread control successfully", async () => {
      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.requestThreadControl(
          "test-page-id",
          "test-user-id"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.success).toBe(true);
    });

    it("should request thread control with metadata", async () => {
      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.requestThreadControl(
          "test-page-id",
          "test-user-id",
          "Requesting control"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.success).toBe(true);
    });

    it("should request thread control with custom access token", async () => {
      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.requestThreadControl(
          "test-page-id",
          "test-user-id",
          undefined,
          "custom-access-token"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.success).toBe(true);
    });
  });

  describe("getThreadOwner", () => {
    it("should get thread owner successfully", async () => {
      const MockHttpClientForOwner = createMockHttpClient(
        createMockThreadOwnerResponse
      );

      const TestLayerForOwner =
        ConversationApiService.DefaultWithoutDependencies.pipe(
          Layer.provide(Layer.mergeAll(MockHttpClientForOwner, MockEnvService))
        );

      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.getThreadOwner(
          "test-page-id",
          "test-user-id"
        );
      }).pipe(Effect.provide(TestLayerForOwner));

      const result = await Effect.runPromise(program);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].app_id).toBe("mock-app-id-123");
    });

    it("should get thread owner with custom access token", async () => {
      const MockHttpClientForOwner = createMockHttpClient(
        createMockThreadOwnerResponse
      );

      const TestLayerForOwner =
        ConversationApiService.DefaultWithoutDependencies.pipe(
          Layer.provide(Layer.mergeAll(MockHttpClientForOwner, MockEnvService))
        );

      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.getThreadOwner(
          "test-page-id",
          "test-user-id",
          "custom-access-token"
        );
      }).pipe(Effect.provide(TestLayerForOwner));

      const result = await Effect.runPromise(program);
      expect(result.data[0].app_id).toBe("mock-app-id-123");
    });
  });

  describe("getSecondaryReceivers", () => {
    it("should get secondary receivers successfully", async () => {
      const MockHttpClientForReceivers = createMockHttpClient(
        createMockSecondaryReceiversResponse
      );

      const TestLayerForReceivers =
        ConversationApiService.DefaultWithoutDependencies.pipe(
          Layer.provide(
            Layer.mergeAll(MockHttpClientForReceivers, MockEnvService)
          )
        );

      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.getSecondaryReceivers("test-page-id");
      }).pipe(Effect.provide(TestLayerForReceivers));

      const result = await Effect.runPromise(program);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe("Secondary App 1");
      expect(result.data[1].name).toBe("Secondary App 2");
    });

    it("should get secondary receivers with custom access token", async () => {
      const MockHttpClientForReceivers = createMockHttpClient(
        createMockSecondaryReceiversResponse
      );

      const TestLayerForReceivers =
        ConversationApiService.DefaultWithoutDependencies.pipe(
          Layer.provide(
            Layer.mergeAll(MockHttpClientForReceivers, MockEnvService)
          )
        );

      const program = Effect.gen(function* () {
        const conversationApi = yield* ConversationApiService;
        return yield* conversationApi.getSecondaryReceivers(
          "test-page-id",
          "custom-access-token"
        );
      }).pipe(Effect.provide(TestLayerForReceivers));

      const result = await Effect.runPromise(program);
      expect(result.data).toHaveLength(2);
    });
  });
});
