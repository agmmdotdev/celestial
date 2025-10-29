import { Effect, Layer } from "@celestial/effect";
import { describe, it, expect } from "vitest";
import {
  MessagingService,
  MessagingType,
  AttachmentType,
} from "./messaging.service.js";
import { ButtonTemplateService } from "./button-template.service.js";
import { QuickRepliesService } from "./quick-replies.service.js";
import { createMockHttpClient, MockEnvService } from "./test-utils.js";

// Create a mock response with json as an Effect
const createMockResponse = () => ({
  json: Effect.succeed({
    recipient_id: "mock-recipient-id",
    message_id: "mock-message-id",
  }),
});

// Mock HttpClient layer
const MockHttpClient = createMockHttpClient(createMockResponse);

// All dependencies that MessagingService needs
const MessagingServiceDeps = Layer.mergeAll(
  MockHttpClient,
  MockEnvService,
  ButtonTemplateService.Default,
  QuickRepliesService.Default
);

// Services that need to be in test context for direct use (e.g., yield* ButtonTemplateService)
const TestContextServices = Layer.mergeAll(
  ButtonTemplateService.Default,
  QuickRepliesService.Default
);

// Test layer - provide deps to MessagingService, then merge services back into context
const TestLayer = Layer.mergeAll(
  MessagingService.DefaultWithoutDependencies.pipe(
    Layer.provide(MessagingServiceDeps)
  ),
  TestContextServices
);

describe("MessagingService", () => {
  describe("sendTextMessage", () => {
    it("should send a text message successfully", async () => {
      const program = Effect.gen(function* () {
        const messaging = yield* MessagingService;
        return yield* messaging.sendTextMessage(
          "page-id",
          "recipient-id",
          "Hello, World!"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
      expect(result.message_id).toBe("mock-message-id");
    });

    it("should send a text message with custom messaging type", async () => {
      const program = Effect.gen(function* () {
        const messaging = yield* MessagingService;
        return yield* messaging.sendTextMessage(
          "page-id",
          "recipient-id",
          "Update message",
          MessagingType.UPDATE
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
    });
  });

  describe("sendButtonTemplateMessage", () => {
    it("should send a button template message successfully", async () => {
      const program = Effect.gen(function* () {
        const messaging = yield* MessagingService;
        const buttonService = yield* ButtonTemplateService;

        const button = yield* buttonService.createWebUrlButton(
          "Visit",
          "https://example.com"
        );

        return yield* messaging.sendButtonTemplateMessage(
          "page-id",
          "recipient-id",
          "Choose an option",
          [button]
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
      expect(result.message_id).toBe("mock-message-id");
    });
  });

  describe("sendQuickReplyMessage", () => {
    it("should send a quick reply message successfully", async () => {
      const program = Effect.gen(function* () {
        const messaging = yield* MessagingService;
        const quickRepliesService = yield* QuickRepliesService;

        const quickReply = yield* quickRepliesService.createTextQuickReply(
          "Yes",
          "YES"
        );

        return yield* messaging.sendQuickReplyMessage(
          "page-id",
          "recipient-id",
          "Do you agree?",
          [quickReply]
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
    });
  });

  describe("sendMediaMessage", () => {
    it("should send an image message successfully", async () => {
      const program = Effect.gen(function* () {
        const messaging = yield* MessagingService;
        return yield* messaging.sendMediaMessage(
          "page-id",
          "recipient-id",
          AttachmentType.IMAGE,
          "https://example.com/image.jpg"
        );
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.recipient_id).toBe("mock-recipient-id");
    });
  });

  describe("isWithinStandardMessagingWindow", () => {
    it("should return true for recent interaction", async () => {
      const program = Effect.gen(function* () {
        const messaging = yield* MessagingService;
        const recentTime = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
        return yield* messaging.isWithinStandardMessagingWindow(recentTime);
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result).toBe(true);
    });

    it("should return false for old interaction", async () => {
      const program = Effect.gen(function* () {
        const messaging = yield* MessagingService;
        const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago
        return yield* messaging.isWithinStandardMessagingWindow(oldTime);
      }).pipe(Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result).toBe(false);
    });
  });
});
