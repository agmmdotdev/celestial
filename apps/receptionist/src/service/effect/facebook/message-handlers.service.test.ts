import { Effect } from "@celestial/effect";
import { describe, it, expect } from "vitest";
import {
  FacebookMessagesHandler,
  MessageHandlerHelpers,
  MessagingEvent,
  FacebookWebhookPayload,
} from "./message-handlers.service.js";

describe("FacebookMessagesHandler", () => {
  const createTextMessageEvent = (text: string): MessagingEvent => ({
    sender: { id: "user123" },
    recipient: { id: "page456" },
    timestamp: Date.now(),
    message: {
      mid: "msg_id_123",
      text,
    },
  });

  const createQuickReplyEvent = (payload: string): MessagingEvent => ({
    sender: { id: "user123" },
    recipient: { id: "page456" },
    timestamp: Date.now(),
    message: {
      mid: "msg_id_123",
      text: "Quick reply text",
      quick_reply: { payload },
    },
  });

  const createAttachmentEvent = (): MessagingEvent => ({
    sender: { id: "user123" },
    recipient: { id: "page456" },
    timestamp: Date.now(),
    message: {
      mid: "msg_id_123",
      attachments: [
        {
          type: "image",
          payload: { url: "https://example.com/image.jpg" },
        },
      ],
    },
  });

  describe("onTextMessage", () => {
    it("should register and execute text message callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookMessagesHandler;
        let receivedText = "";

        yield* handler.onTextMessage((event) =>
          Effect.sync(() => {
            receivedText = MessageHandlerHelpers.getMessageText(event) || "";
          })
        );

        const payload: FacebookWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createTextMessageEvent("Hello World")],
            },
          ],
        };

        yield* handler.processWebhook(payload);
        return receivedText;
      }).pipe(Effect.provide(FacebookMessagesHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe("Hello World");
    });
  });

  describe("onQuickReplyMessage", () => {
    it("should register and execute quick reply callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookMessagesHandler;
        let receivedPayload = "";

        yield* handler.onQuickReplyMessage((event) =>
          Effect.sync(() => {
            receivedPayload = MessageHandlerHelpers.getQuickReplyPayload(event) || "";
          })
        );

        const payload: FacebookWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createQuickReplyEvent("QUICK_REPLY_PAYLOAD")],
            },
          ],
        };

        yield* handler.processWebhook(payload);
        return receivedPayload;
      }).pipe(Effect.provide(FacebookMessagesHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe("QUICK_REPLY_PAYLOAD");
    });
  });

  describe("onAttachmentMessage", () => {
    it("should register and execute attachment callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookMessagesHandler;
        let receivedUrls: string[] = [];

        yield* handler.onAttachmentMessage((event) =>
          Effect.sync(() => {
            receivedUrls = MessageHandlerHelpers.getAttachmentUrls(event);
          })
        );

        const payload: FacebookWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createAttachmentEvent()],
            },
          ],
        };

        yield* handler.processWebhook(payload);
        return receivedUrls;
      }).pipe(Effect.provide(FacebookMessagesHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toEqual(["https://example.com/image.jpg"]);
    });
  });

  describe("onMessage (all messages)", () => {
    it("should execute callback for all message types", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookMessagesHandler;
        let callCount = 0;

        yield* handler.onMessage((event) =>
          Effect.sync(() => {
            callCount++;
          })
        );

        const payload: FacebookWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [
                createTextMessageEvent("Hello"),
                createQuickReplyEvent("PAYLOAD"),
                createAttachmentEvent(),
              ],
            },
          ],
        };

        yield* handler.processWebhook(payload);
        return callCount;
      }).pipe(Effect.provide(FacebookMessagesHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe(3);
    });
  });

  describe("processWebhook", () => {
    it("should fail with error for invalid webhook object type", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookMessagesHandler;
        const payload = {
          object: "invalid",
          entry: [],
        } as any;

        return yield* handler.processWebhook(payload);
      }).pipe(Effect.provide(FacebookMessagesHandler.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.message).toBe("Invalid webhook object type");
      }
    });
  });

  describe("MessageHandlerHelpers", () => {
    it("should get message text", () => {
      const event = createTextMessageEvent("Test message");
      expect(MessageHandlerHelpers.getMessageText(event)).toBe("Test message");
    });

    it("should get sender PSID", () => {
      const event = createTextMessageEvent("Test");
      expect(MessageHandlerHelpers.getSenderPSID(event)).toBe("user123");
    });

    it("should get page ID", () => {
      const event = createTextMessageEvent("Test");
      expect(MessageHandlerHelpers.getPageId(event)).toBe("page456");
    });

    it("should check if message has attachments", () => {
      const textEvent = createTextMessageEvent("Test");
      const attachmentEvent = createAttachmentEvent();
      expect(MessageHandlerHelpers.hasAttachments(textEvent)).toBe(false);
      expect(MessageHandlerHelpers.hasAttachments(attachmentEvent)).toBe(true);
    });

    it("should check if message is quick reply", () => {
      const textEvent = createTextMessageEvent("Test");
      const quickReplyEvent = createQuickReplyEvent("PAYLOAD");
      expect(MessageHandlerHelpers.isQuickReply(textEvent)).toBe(false);
      expect(MessageHandlerHelpers.isQuickReply(quickReplyEvent)).toBe(true);
    });

    it("should get quick reply payload", () => {
      const event = createQuickReplyEvent("TEST_PAYLOAD");
      expect(MessageHandlerHelpers.getQuickReplyPayload(event)).toBe("TEST_PAYLOAD");
    });
  });
});
