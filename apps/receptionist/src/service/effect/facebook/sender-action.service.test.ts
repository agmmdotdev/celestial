import { Effect, Layer, ManagedRuntime } from "@celestial/effect";
import { describe, it, expect } from "vitest";
import { SenderActionService } from "./sender-action.service.js";
import { createMockHttpClient, MockEnvService } from "./test-utils.js";

// Create mock response for sender action
const createMockSenderActionResponse = () => ({
  json: Effect.succeed({
    recipient_id: "mock-recipient-id",
  }),
});

// Mock HttpClient layer
const MockHttpClient = createMockHttpClient(createMockSenderActionResponse);

// Test layer with mocks
const TestLayer = SenderActionService.DefaultWithoutDependencies.pipe(
  Layer.provide(Layer.mergeAll(MockHttpClient, MockEnvService))
);
const TestManagedRuntime = ManagedRuntime.make(TestLayer);

describe("SenderActionService", () => {
  describe("sendTypingOn", () => {
    it("should send typing on action successfully", async () => {
      const program = Effect.gen(function* () {
        const senderAction = yield* SenderActionService;
        return yield* senderAction.sendTypingOn(
          "test-page-id",
          "test-recipient-id"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
    });

    it("should send typing on action with custom access token", async () => {
      const program = Effect.gen(function* () {
        const senderAction = yield* SenderActionService;
        return yield* senderAction.sendTypingOn(
          "test-page-id",
          "test-recipient-id",
          "custom-access-token"
        );
      });

      const result = await TestManagedRuntime.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
    });
  });

  describe("sendTypingOff", () => {
    it("should send typing off action successfully", async () => {
      const program = Effect.gen(function* () {
        const senderAction = yield* SenderActionService;
        return yield* senderAction.sendTypingOff(
          "test-page-id",
          "test-recipient-id"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
    });

    it("should send typing off action with custom access token", async () => {
      const program = Effect.gen(function* () {
        const senderAction = yield* SenderActionService;
        return yield* senderAction.sendTypingOff(
          "test-page-id",
          "test-recipient-id",
          "custom-access-token"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
    });
  });

  describe("sendMarkSeen", () => {
    it("should send mark seen action successfully", async () => {
      const program = Effect.gen(function* () {
        const senderAction = yield* SenderActionService;
        return yield* senderAction.sendMarkSeen(
          "test-page-id",
          "test-recipient-id"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
    });

    it("should send mark seen action with custom access token", async () => {
      const program = Effect.gen(function* () {
        const senderAction = yield* SenderActionService;
        return yield* senderAction.sendMarkSeen(
          "test-page-id",
          "test-recipient-id",
          "custom-access-token"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
    });
  });
});
