import { Effect } from "@celestial/effect";
import { describe, it, expect } from "vitest";
import {
  QuickRepliesService,
  QuickReplyContentType,
  QuickReplyResponse,
  TextQuickReply,
} from "./quick-replies.service.js";
import { ValidationError } from "../../errors/index.js";

describe("QuickRepliesService", () => {
  describe("createTextQuickReply", () => {
    it("should create a text quick reply with valid inputs", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createTextQuickReply("Yes", "YES_PAYLOAD");
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.content_type).toBe(QuickReplyContentType.TEXT);
      expect(result.title).toBe("Yes");
      expect(result.payload).toBe("YES_PAYLOAD");
    });

    it("should create a text quick reply with image URL", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createTextQuickReply(
          "Yes",
          "YES_PAYLOAD",
          "https://example.com/icon.png"
        );
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.image_url).toBe("https://example.com/icon.png");
    });

    it("should create a text quick reply without payload", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createTextQuickReply("Yes");
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.title).toBe("Yes");
      expect(result.payload).toBeUndefined();
    });

    it("should trim whitespace from title", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createTextQuickReply("  Yes  ", "YES");
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.title).toBe("Yes");
    });

    it("should fail with ValidationError for empty title", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createTextQuickReply("", "PAYLOAD");
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("title");
        expect(result.left.message).toBe("Title is required for text quick replies");
      }
    });

    it("should fail with ValidationError for title longer than 20 characters", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createTextQuickReply(
          "This title is way too long",
          "PAYLOAD"
        );
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("title");
        expect(result.left.message).toBe(
          "Quick reply title must be 20 characters or less"
        );
      }
    });

    it("should fail with ValidationError for payload longer than 1000 characters", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        const longPayload = "a".repeat(1001);
        return yield* service.createTextQuickReply("Valid", longPayload);
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("payload");
        expect(result.left.message).toBe(
          "Quick reply payload must be 1000 characters or less"
        );
      }
    });
  });

  describe("createUserPhoneNumberQuickReply", () => {
    it("should create a user phone number quick reply", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createUserPhoneNumberQuickReply();
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.content_type).toBe(QuickReplyContentType.USER_PHONE_NUMBER);
    });
  });

  describe("createUserEmailQuickReply", () => {
    it("should create a user email quick reply", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createUserEmailQuickReply();
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.content_type).toBe(QuickReplyContentType.USER_EMAIL);
    });
  });

  describe("createTextQuickReplies", () => {
    it("should create multiple text quick replies", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createTextQuickReplies([
          { title: "Yes", payload: "YES" },
          { title: "No", payload: "NO" },
          { title: "Maybe", payload: "MAYBE" },
        ]);
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe("Yes");
      expect(result[1].title).toBe("No");
      expect(result[2].title).toBe("Maybe");
    });

    it("should fail with ValidationError for more than 13 quick replies", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        const options = Array.from({ length: 14 }, (_, i) => ({
          title: `Option ${i + 1}`,
          payload: `OPTION_${i + 1}`,
        }));
        return yield* service.createTextQuickReplies(options);
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("options");
        expect(result.left.message).toBe("Maximum of 13 quick replies allowed");
      }
    });
  });

  describe("createQuickReplyMessage", () => {
    it("should create a quick reply message with valid inputs", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        const quickReply = yield* service.createTextQuickReply("Yes", "YES");
        return yield* service.createQuickReplyMessage("Do you agree?", [
          quickReply,
        ]);
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.text).toBe("Do you agree?");
      expect(result.quick_replies).toHaveLength(1);
    });

    it("should trim whitespace from text", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        const quickReply = yield* service.createTextQuickReply("Yes", "YES");
        return yield* service.createQuickReplyMessage("  Do you agree?  ", [
          quickReply,
        ]);
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.text).toBe("Do you agree?");
    });

    it("should fail with ValidationError for empty text", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        const quickReply = yield* service.createTextQuickReply("Yes", "YES");
        return yield* service.createQuickReplyMessage("", [quickReply]);
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("text");
        expect(result.left.message).toBe("Text is required for quick reply message");
      }
    });

    it("should fail with ValidationError for empty quick replies array", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createQuickReplyMessage("Do you agree?", []);
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("quick_replies");
        expect(result.left.message).toBe("At least one quick reply is required");
      }
    });

    it("should fail with ValidationError for more than 13 quick replies", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        const quickReplies = yield* service.createTextQuickReplies(
          Array.from({ length: 13 }, (_, i) => ({
            title: `Option ${i + 1}`,
            payload: `OPTION_${i + 1}`,
          }))
        );
        // Add one more to exceed limit
        const extraReply = yield* service.createTextQuickReply("Extra", "EXTRA");
        return yield* service.createQuickReplyMessage("Choose", [
          ...quickReplies,
          extraReply,
        ]);
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("quick_replies");
        expect(result.left.message).toBe("Maximum of 13 quick replies allowed");
      }
    });
  });

  describe("createYesNoQuickReplyMessage", () => {
    it("should create a yes/no quick reply message", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createYesNoQuickReplyMessage("Do you agree?");
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.text).toBe("Do you agree?");
      expect(result.quick_replies).toHaveLength(2);
      expect((result.quick_replies[0] as TextQuickReply).title).toBe("Yes");
      expect((result.quick_replies[0] as TextQuickReply).payload).toBe("YES");
      expect((result.quick_replies[1] as TextQuickReply).title).toBe("No");
      expect((result.quick_replies[1] as TextQuickReply).payload).toBe("NO");
    });

    it("should create a yes/no quick reply message with custom payloads", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createYesNoQuickReplyMessage(
          "Do you agree?",
          "AGREE",
          "DISAGREE"
        );
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect((result.quick_replies[0] as TextQuickReply).payload).toBe("AGREE");
      expect((result.quick_replies[1] as TextQuickReply).payload).toBe("DISAGREE");
    });
  });

  describe("createRatingQuickReplyMessage", () => {
    it("should create a rating quick reply message with star emojis", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createRatingQuickReplyMessage("Rate your experience");
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.text).toBe("Rate your experience");
      expect(result.quick_replies).toHaveLength(5);
      expect((result.quick_replies[0] as TextQuickReply).title).toBe("⭐");
      expect((result.quick_replies[4] as TextQuickReply).title).toBe("⭐⭐⭐⭐⭐");
    });

    it("should create a rating quick reply message without star emojis", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createRatingQuickReplyMessage(
          "Rate your experience",
          false
        );
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect((result.quick_replies[0] as TextQuickReply).title).toBe("1 Star");
      expect((result.quick_replies[4] as TextQuickReply).title).toBe("5 Stars");
    });
  });

  describe("createMultipleChoiceQuickReplyMessage", () => {
    it("should create a multiple choice quick reply message", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createMultipleChoiceQuickReplyMessage(
          "What's your favorite color?",
          [
            { label: "Red", value: "RED" },
            { label: "Blue", value: "BLUE" },
            { label: "Green", value: "GREEN" },
          ]
        );
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.text).toBe("What's your favorite color?");
      expect(result.quick_replies).toHaveLength(3);
      expect((result.quick_replies[0] as TextQuickReply).title).toBe("Red");
      expect((result.quick_replies[0] as TextQuickReply).payload).toBe("RED");
    });
  });

  describe("createContactQuickReplyMessage", () => {
    it("should create a contact quick reply message with phone and email", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createContactQuickReplyMessage(
          "How can we contact you?"
        );
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.text).toBe("How can we contact you?");
      expect(result.quick_replies).toHaveLength(2);
      expect(result.quick_replies[0].content_type).toBe(
        QuickReplyContentType.USER_PHONE_NUMBER
      );
      expect(result.quick_replies[1].content_type).toBe(
        QuickReplyContentType.USER_EMAIL
      );
    });

    it("should create a contact quick reply message with only phone", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createContactQuickReplyMessage(
          "Share your phone?",
          true,
          false
        );
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.quick_replies).toHaveLength(1);
      expect(result.quick_replies[0].content_type).toBe(
        QuickReplyContentType.USER_PHONE_NUMBER
      );
    });

    it("should create a contact quick reply message with additional options", async () => {
      const program = Effect.gen(function* () {
        const service = yield* QuickRepliesService;
        return yield* service.createContactQuickReplyMessage(
          "How can we contact you?",
          true,
          true,
          [{ title: "Skip", payload: "SKIP" }]
        );
      }).pipe(Effect.provide(QuickRepliesService.Default));

      const result = await Effect.runPromise(program);
      expect(result.quick_replies).toHaveLength(3);
      expect((result.quick_replies[2] as TextQuickReply).title).toBe("Skip");
    });
  });

  describe("Response processing methods", () => {
    describe("isTextQuickReplyResponse", () => {
      it("should return true for text quick reply response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = { payload: "YES_PAYLOAD" };
          return yield* service.isTextQuickReplyResponse(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBe(true);
      });

      it("should return false for phone number response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = { payload: "+1234567890" };
          return yield* service.isTextQuickReplyResponse(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBe(false);
      });

      it("should return false for email response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = {
            payload: "user@example.com",
          };
          return yield* service.isTextQuickReplyResponse(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBe(false);
      });
    });

    describe("isPhoneNumberQuickReplyResponse", () => {
      it("should return true for phone number response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = { payload: "+1234567890" };
          return yield* service.isPhoneNumberQuickReplyResponse(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBe(true);
      });

      it("should return false for text response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = { payload: "YES_PAYLOAD" };
          return yield* service.isPhoneNumberQuickReplyResponse(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBe(false);
      });
    });

    describe("isEmailQuickReplyResponse", () => {
      it("should return true for email response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = {
            payload: "user@example.com",
          };
          return yield* service.isEmailQuickReplyResponse(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBe(true);
      });

      it("should return false for text response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = { payload: "YES_PAYLOAD" };
          return yield* service.isEmailQuickReplyResponse(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBe(false);
      });
    });

    describe("extractPhoneNumber", () => {
      it("should extract phone number from phone response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = { payload: "+1234567890" };
          return yield* service.extractPhoneNumber(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBe("+1234567890");
      });

      it("should return null for non-phone response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = { payload: "YES_PAYLOAD" };
          return yield* service.extractPhoneNumber(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBeNull();
      });
    });

    describe("extractEmail", () => {
      it("should extract email from email response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = {
            payload: "user@example.com",
          };
          return yield* service.extractEmail(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBe("user@example.com");
      });

      it("should return null for non-email response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = { payload: "YES_PAYLOAD" };
          return yield* service.extractEmail(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBeNull();
      });
    });

    describe("getTextQuickReplyPayload", () => {
      it("should get payload from text quick reply response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = { payload: "YES_PAYLOAD" };
          return yield* service.getTextQuickReplyPayload(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBe("YES_PAYLOAD");
      });

      it("should return null for phone number response", async () => {
        const program = Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const response: QuickReplyResponse = { payload: "+1234567890" };
          return yield* service.getTextQuickReplyPayload(response);
        }).pipe(Effect.provide(QuickRepliesService.Default));

        const result = await Effect.runPromise(program);
        expect(result).toBeNull();
      });
    });
  });
});
