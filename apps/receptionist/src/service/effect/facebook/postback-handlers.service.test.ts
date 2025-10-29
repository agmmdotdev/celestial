import { Effect } from "@celestial/effect";
import { describe, it, expect } from "vitest";
import {
  FacebookPostbacksHandler,
  PostbackHandlerHelpers,
  PostbackEvent,
  FacebookPostbackWebhookPayload,
} from "./postback-handlers.service.js";

describe("FacebookPostbacksHandler", () => {
  const createPostbackEvent = (payload: string, title?: string): PostbackEvent => ({
    sender: { id: "user123" },
    recipient: { id: "page456" },
    timestamp: Date.now(),
    postback: {
      payload,
      title,
    },
  });

  const createGetStartedEvent = (): PostbackEvent => ({
    sender: { id: "user123" },
    recipient: { id: "page456" },
    timestamp: Date.now(),
    postback: {
      payload: "GET_STARTED",
    },
  });

  const createReferralPostbackEvent = (): PostbackEvent => ({
    sender: { id: "user123" },
    recipient: { id: "page456" },
    timestamp: Date.now(),
    postback: {
      payload: "REFERRAL_PAYLOAD",
      referral: {
        ref: "ref_123",
        source: "ADS",
        type: "OPEN_THREAD",
      },
    },
  });

  describe("onButtonPostback", () => {
    it("should register and execute button postback callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookPostbacksHandler;
        let receivedPayload = "";

        yield* handler.onButtonPostback((event) =>
          Effect.sync(() => {
            receivedPayload = PostbackHandlerHelpers.getPostbackPayload(event);
          })
        );

        const payload: FacebookPostbackWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createPostbackEvent("BUTTON_PAYLOAD", "Button Title")],
            },
          ],
        };

        yield* handler.processWebhook(payload);
        return receivedPayload;
      }).pipe(Effect.provide(FacebookPostbacksHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe("BUTTON_PAYLOAD");
    });
  });

  describe("onGetStartedPostback", () => {
    it("should register and execute Get Started callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookPostbacksHandler;
        let wasTriggered = false;

        yield* handler.onGetStartedPostback((event) =>
          Effect.sync(() => {
            wasTriggered = true;
          })
        );

        const payload: FacebookPostbackWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createGetStartedEvent()],
            },
          ],
        };

        yield* handler.processWebhook(payload);
        return wasTriggered;
      }).pipe(Effect.provide(FacebookPostbacksHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe(true);
    });
  });

  describe("onReferralPostback", () => {
    it("should register and execute referral postback callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookPostbacksHandler;
        let receivedRef = "";

        yield* handler.onReferralPostback((event) =>
          Effect.sync(() => {
            receivedRef = PostbackHandlerHelpers.getReferralRef(event) || "";
          })
        );

        const payload: FacebookPostbackWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createReferralPostbackEvent()],
            },
          ],
        };

        yield* handler.processWebhook(payload);
        return receivedRef;
      }).pipe(Effect.provide(FacebookPostbacksHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe("ref_123");
    });
  });

  describe("onPayloadPostback", () => {
    it("should register and execute specific payload callback", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookPostbacksHandler;
        let wasTriggered = false;

        yield* handler.onPayloadPostback("SPECIFIC_PAYLOAD", (event) =>
          Effect.sync(() => {
            wasTriggered = true;
          })
        );

        const payload: FacebookPostbackWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createPostbackEvent("SPECIFIC_PAYLOAD")],
            },
          ],
        };

        yield* handler.processWebhook(payload);
        return wasTriggered;
      }).pipe(Effect.provide(FacebookPostbacksHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe(true);
    });

    it("should not trigger callback for different payload", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookPostbacksHandler;
        let wasTriggered = false;

        yield* handler.onPayloadPostback("SPECIFIC_PAYLOAD", (event) =>
          Effect.sync(() => {
            wasTriggered = true;
          })
        );

        const payload: FacebookPostbackWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [createPostbackEvent("DIFFERENT_PAYLOAD")],
            },
          ],
        };

        yield* handler.processWebhook(payload);
        return wasTriggered;
      }).pipe(Effect.provide(FacebookPostbacksHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe(false);
    });
  });

  describe("onPostback (all postbacks)", () => {
    it("should execute callback for all postback types", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookPostbacksHandler;
        let callCount = 0;

        yield* handler.onPostback((event) =>
          Effect.sync(() => {
            callCount++;
          })
        );

        const payload: FacebookPostbackWebhookPayload = {
          object: "page",
          entry: [
            {
              id: "page456",
              time: Date.now(),
              messaging: [
                createPostbackEvent("PAYLOAD_1"),
                createGetStartedEvent(),
                createReferralPostbackEvent(),
              ],
            },
          ],
        };

        yield* handler.processWebhook(payload);
        return callCount;
      }).pipe(Effect.provide(FacebookPostbacksHandler.Default));

      const result = await Effect.runPromise(program);
      expect(result).toBe(3);
    });
  });

  describe("processWebhook", () => {
    it("should fail with error for invalid webhook object type", async () => {
      const program = Effect.gen(function* () {
        const handler = yield* FacebookPostbacksHandler;
        const payload = {
          object: "invalid",
          entry: [],
        } as any;

        return yield* handler.processWebhook(payload);
      }).pipe(Effect.provide(FacebookPostbacksHandler.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.message).toBe("Invalid webhook object type");
      }
    });
  });

  describe("PostbackHandlerHelpers", () => {
    it("should get postback payload", () => {
      const event = createPostbackEvent("TEST_PAYLOAD");
      expect(PostbackHandlerHelpers.getPostbackPayload(event)).toBe("TEST_PAYLOAD");
    });

    it("should get postback title", () => {
      const event = createPostbackEvent("PAYLOAD", "Button Title");
      expect(PostbackHandlerHelpers.getPostbackTitle(event)).toBe("Button Title");
    });

    it("should get sender PSID", () => {
      const event = createPostbackEvent("PAYLOAD");
      expect(PostbackHandlerHelpers.getSenderPSID(event)).toBe("user123");
    });

    it("should get page ID", () => {
      const event = createPostbackEvent("PAYLOAD");
      expect(PostbackHandlerHelpers.getPageId(event)).toBe("page456");
    });

    it("should check if postback has referral", () => {
      const normalEvent = createPostbackEvent("PAYLOAD");
      const referralEvent = createReferralPostbackEvent();
      expect(PostbackHandlerHelpers.hasReferral(normalEvent)).toBe(false);
      expect(PostbackHandlerHelpers.hasReferral(referralEvent)).toBe(true);
    });

    it("should check if postback is Get Started", () => {
      const normalEvent = createPostbackEvent("PAYLOAD");
      const getStartedEvent = createGetStartedEvent();
      expect(PostbackHandlerHelpers.isGetStarted(normalEvent)).toBe(false);
      expect(PostbackHandlerHelpers.isGetStarted(getStartedEvent)).toBe(true);
    });

    it("should check if postback is from ads", () => {
      const normalEvent = createPostbackEvent("PAYLOAD");
      const referralEvent = createReferralPostbackEvent();
      expect(PostbackHandlerHelpers.isFromAds(normalEvent)).toBe(false);
      expect(PostbackHandlerHelpers.isFromAds(referralEvent)).toBe(true);
    });
  });
});
