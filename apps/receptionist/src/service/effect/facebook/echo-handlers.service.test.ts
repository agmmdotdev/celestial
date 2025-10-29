import { Effect } from "@celestial/effect";
import { describe, it, expect } from "vitest";
import {
  FacebookEchoMessagesHandler,
  EchoHandlerHelpers,
  EchoMessagingEvent,
  FacebookEchoWebhookPayload,
} from "./echo-handlers.service.js";

describe("FacebookEchoMessagesHandler", () => {
  const createTextEchoEvent = (text: string): EchoMessagingEvent => ({
    sender: { id: "page456" },
    recipient: { id: "user123" },
    timestamp: Date.now(),
    message: {
      mid: "msg_id_123",
      is_echo: true,
      app_id: 123456789,
      text,
    },
  });

  const createAttachmentEchoEvent = (): EchoMessagingEvent => ({
    sender: { id: "page456" },
    recipient: { id: "user123" },
    timestamp: Date.now(),
    message: {
      mid: "msg_id_123",
      is_echo: true,
      app_id: 123456789,
      attachments: [
        {
          type: "image",
          payload: { url: "https://example.com/image.jpg" },
        },
      ],
    },
  });

  const createTemplateEchoEvent = (): EchoMessagingEvent => ({
    sender: { id: "page456" },
    recipient: { id: "user123" },
    timestamp: Date.now(),
    message: {
      mid: "msg_id_123",
      is_echo: true,
      app_id: 123456789,
      attachments: [
        {
          type: "template",
          payload: {
            template_type: "button",
            buttons: [],
          },
        },
      ],
    },
  });

  const createProductEchoEvent = (): EchoMessagingEvent => ({
    sender: { id: "page456" },
    recipient: { id: "user123" },
    timestamp: Date.now(),
    message: {
      mid: "msg_id_123",
      is_echo: true,
      app_id: 123456789,
      attachments: [
        {
          type: "template",
          payload: {
            product: {
              elements: [
                {
                  id: "product_123",
                  retailer_id: "sku_123",
                  image_url: "https://example.com/product.jpg",
                  title: "Product Title",
                  subtitle: "$19.99",
                },
              ],
            },
          },
        },
      ],
    },
  });

  describe("onTextEcho", () => {
    it("should register and execute text echo callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookEchoMessagesHandler;
        let receivedText = "";

        yield* handler.onTextEcho((event) =>
          Effect.sync(() => {
            receivedText = EchoHandlerHelpers.getEchoMessageText(event) || "";
          })
        );

        const payload: FacebookEchoWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createTextEchoEvent("Echo message")],
            },
          ],
        };

        yield* handler.processEchoWebhook(payload);
        return receivedText;
      }).pipe(Effect.provide(FacebookEchoMessagesHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe("Echo message");
    });
  });

  describe("onAttachmentEcho", () => {
    it("should register and execute attachment echo callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookEchoMessagesHandler;
        let receivedUrls: string[] = [];

        yield* handler.onAttachmentEcho((event) =>
          Effect.sync(() => {
            receivedUrls = EchoHandlerHelpers.getAttachmentUrls(event);
          })
        );

        const payload: FacebookEchoWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createAttachmentEchoEvent()],
            },
          ],
        };

        yield* handler.processEchoWebhook(payload);
        return receivedUrls;
      }).pipe(Effect.provide(FacebookEchoMessagesHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toEqual(["https://example.com/image.jpg"]);
    });
  });

  describe("onTemplateEcho", () => {
    it("should register and execute template echo callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookEchoMessagesHandler;
        let receivedTemplateType = "";

        yield* handler.onTemplateEcho((event) =>
          Effect.sync(() => {
            receivedTemplateType = EchoHandlerHelpers.getTemplateType(event) || "";
          })
        );

        const payload: FacebookEchoWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createTemplateEchoEvent()],
            },
          ],
        };

        yield* handler.processEchoWebhook(payload);
        return receivedTemplateType;
      }).pipe(Effect.provide(FacebookEchoMessagesHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe("button");
    });
  });

  describe("onProductEcho", () => {
    it("should register and execute product echo callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookEchoMessagesHandler;
        let productCount = 0;

        yield* handler.onProductEcho((event) =>
          Effect.sync(() => {
            const products = EchoHandlerHelpers.getProductElements(event);
            productCount = products.length;
          })
        );

        const payload: FacebookEchoWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createProductEchoEvent()],
            },
          ],
        };

        yield* handler.processEchoWebhook(payload);
        return productCount;
      }).pipe(Effect.provide(FacebookEchoMessagesHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe(1);
    });
  });

  describe("onEchoMessage (all echoes)", () => {
    it("should execute callback for all echo message types", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookEchoMessagesHandler;
        let callCount = 0;

        yield* handler.onEchoMessage((event) =>
          Effect.sync(() => {
            callCount++;
          })
        );

        const payload: FacebookEchoWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [
                createTextEchoEvent("Echo 1"),
                createAttachmentEchoEvent(),
                createTemplateEchoEvent(),
              ],
            },
          ],
        };

        yield* handler.processEchoWebhook(payload);
        return callCount;
      }).pipe(Effect.provide(FacebookEchoMessagesHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe(3);
    });
  });

  describe("processEchoWebhook", () => {
    it("should fail with error for invalid webhook object type", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookEchoMessagesHandler;
        const payload = {
          object: "invalid",
          entry: [],
        } as any;

        return yield* handler.processEchoWebhook(payload);
      }).pipe(Effect.provide(FacebookEchoMessagesHandler.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.message).toBe("Invalid webhook object type");
      }
    });

    it("should handle standby events when enabled", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookEchoMessagesHandler;
        let callCount = 0;

        yield* handler.setOptions({ handleStandbyEvents: true });
        yield* handler.onTextEcho((event) =>
          Effect.sync(() => {
            callCount++;
          })
        );

        const payload: FacebookEchoWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              standby: [createTextEchoEvent("Standby echo")],
            },
          ],
        };

        yield* handler.processEchoWebhook(payload);
        return callCount;
      }).pipe(Effect.provide(FacebookEchoMessagesHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe(1);
    });
  });

  describe("EchoHandlerHelpers", () => {
    it("should get echo message text", () => {
      const event = createTextEchoEvent("Test echo");
      expect(EchoHandlerHelpers.getEchoMessageText(event)).toBe("Test echo");
    });

    it("should get page ID", () => {
      const event = createTextEchoEvent("Test");
      expect(EchoHandlerHelpers.getPageId(event)).toBe("page456");
    });

    it("should get recipient PSID", () => {
      const event = createTextEchoEvent("Test");
      expect(EchoHandlerHelpers.getRecipientPSID(event)).toBe("user123");
    });

    it("should get app ID", () => {
      const event = createTextEchoEvent("Test");
      expect(EchoHandlerHelpers.getAppId(event)).toBe(123456789);
    });

    it("should check if echo has attachments", () => {
      const textEvent = createTextEchoEvent("Test");
      const attachmentEvent = createAttachmentEchoEvent();
      expect(EchoHandlerHelpers.hasAttachments(textEvent)).toBe(false);
      expect(EchoHandlerHelpers.hasAttachments(attachmentEvent)).toBe(true);
    });

    it("should check if echo is template", () => {
      const textEvent = createTextEchoEvent("Test");
      const templateEvent = createTemplateEchoEvent();
      expect(EchoHandlerHelpers.isTemplate(textEvent)).toBe(false);
      expect(EchoHandlerHelpers.isTemplate(templateEvent)).toBe(true);
    });

    it("should check if echo is product template", () => {
      const templateEvent = createTemplateEchoEvent();
      const productEvent = createProductEchoEvent();
      expect(EchoHandlerHelpers.isProductTemplate(templateEvent)).toBe(false);
      expect(EchoHandlerHelpers.isProductTemplate(productEvent)).toBe(true);
    });

    it("should get product elements", () => {
      const event = createProductEchoEvent();
      const products = EchoHandlerHelpers.getProductElements(event);
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe("product_123");
      expect(products[0].title).toBe("Product Title");
    });

    it("should check if sent from page inbox", () => {
      const event = createTextEchoEvent("Test");
      const inboxEvent = {
        ...event,
        message: { ...event.message, app_id: 26390203743090 },
      };
      expect(EchoHandlerHelpers.isSentFromPageInbox(event)).toBe(false);
      expect(EchoHandlerHelpers.isSentFromPageInbox(inboxEvent)).toBe(true);
    });
  });
});
