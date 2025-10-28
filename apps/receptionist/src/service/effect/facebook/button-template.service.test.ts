import { Effect } from "@celestial/effect";
import { describe, it, expect } from "vitest";
import { ButtonTemplateService, ButtonType } from "./button-template.service.js";
import { ValidationError } from "../../errors/index.js";

describe("ButtonTemplateService", () => {
  describe("createWebUrlButton", () => {
    it("should create a web URL button with valid inputs", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createWebUrlButton("Visit", "https://example.com");
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.type).toBe(ButtonType.WEB_URL);
      expect(result.title).toBe("Visit");
      expect(result.url).toBe("https://example.com");
    });

    it("should create a web URL button with options", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createWebUrlButton("Visit", "https://example.com", {
          webview_height_ratio: "tall",
          messenger_extensions: true,
        });
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.type).toBe(ButtonType.WEB_URL);
      expect(result.webview_height_ratio).toBe("tall");
      expect(result.messenger_extensions).toBe(true);
    });

    it("should fail with ValidationError for title longer than 20 characters", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createWebUrlButton(
          "This title is way too long",
          "https://example.com"
        );
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("title");
        expect(result.left.message).toBe("Button title must be 20 characters or less");
      }
    });
  });

  describe("createPostbackButton", () => {
    it("should create a postback button with valid inputs", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createPostbackButton("Get Started", "GET_STARTED");
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.type).toBe(ButtonType.POSTBACK);
      expect(result.title).toBe("Get Started");
      expect(result.payload).toBe("GET_STARTED");
    });

    it("should fail with ValidationError for title longer than 20 characters", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createPostbackButton(
          "This title is way too long",
          "PAYLOAD"
        );
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("title");
      }
    });

    it("should fail with ValidationError for payload longer than 1000 characters", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        const longPayload = "a".repeat(1001);
        return yield* service.createPostbackButton("Valid", longPayload);
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("payload");
        expect(result.left.message).toBe("Button payload must be 1000 characters or less");
      }
    });
  });

  describe("createPhoneNumberButton", () => {
    it("should create a phone number button with valid inputs", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createPhoneNumberButton("Call Us", "+1234567890");
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.type).toBe(ButtonType.PHONE_NUMBER);
      expect(result.title).toBe("Call Us");
      expect(result.payload).toBe("+1234567890");
    });

    it("should fail with ValidationError for title longer than 20 characters", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createPhoneNumberButton(
          "This title is way too long",
          "+1234567890"
        );
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("title");
      }
    });

    it("should fail with ValidationError for phone number without + prefix", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createPhoneNumberButton("Call", "1234567890");
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("phoneNumber");
        expect(result.left.message).toBe(
          "Phone number must start with + and include country code"
        );
      }
    });
  });

  describe("createAccountLinkButton", () => {
    it("should create an account link button", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createAccountLinkButton("https://example.com/auth");
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.type).toBe(ButtonType.ACCOUNT_LINK);
      expect(result.url).toBe("https://example.com/auth");
    });
  });

  describe("createAccountUnlinkButton", () => {
    it("should create an account unlink button", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createAccountUnlinkButton();
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.type).toBe(ButtonType.ACCOUNT_UNLINK);
    });
  });

  describe("createGamePlayButton", () => {
    it("should create a game play button with valid inputs", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createGamePlayButton("Play Game", "level_1");
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.type).toBe(ButtonType.GAME_PLAY);
      expect(result.title).toBe("Play Game");
      expect(result.payload).toBe("level_1");
    });

    it("should create a game play button with metadata", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createGamePlayButton("Play", "level_1", {
          player_id: "player123",
          context_id: "context456",
        });
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.game_metadata?.player_id).toBe("player123");
      expect(result.game_metadata?.context_id).toBe("context456");
    });

    it("should fail with ValidationError for title longer than 20 characters", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createGamePlayButton(
          "This title is way too long",
          "level_1"
        );
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("title");
      }
    });
  });

  describe("createButtonTemplatePayload", () => {
    it("should create a button template payload with valid inputs", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        const button1 = yield* service.createWebUrlButton("Visit", "https://example.com");
        const button2 = yield* service.createPostbackButton("Start", "GET_STARTED");
        return yield* service.createButtonTemplatePayload("Choose an option", [
          button1,
          button2,
        ]);
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.template_type).toBe("button");
      expect(result.text).toBe("Choose an option");
      expect(result.buttons).toHaveLength(2);
    });

    it("should create a button template payload with 1 button", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        const button = yield* service.createWebUrlButton("Visit", "https://example.com");
        return yield* service.createButtonTemplatePayload("Click below", [button]);
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.buttons).toHaveLength(1);
    });

    it("should create a button template payload with 3 buttons", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        const button1 = yield* service.createWebUrlButton("Visit", "https://example.com");
        const button2 = yield* service.createPostbackButton("Start", "GET_STARTED");
        const button3 = yield* service.createPhoneNumberButton("Call", "+1234567890");
        return yield* service.createButtonTemplatePayload("Choose", [
          button1,
          button2,
          button3,
        ]);
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(program);
      expect(result.buttons).toHaveLength(3);
    });

    it("should fail with ValidationError for empty text", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        const button = yield* service.createWebUrlButton("Visit", "https://example.com");
        return yield* service.createButtonTemplatePayload("", [button]);
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("text");
        expect(result.left.message).toBe("Text is required for button template message");
      }
    });

    it("should fail with ValidationError for text longer than 640 characters", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        const button = yield* service.createWebUrlButton("Visit", "https://example.com");
        const longText = "a".repeat(641);
        return yield* service.createButtonTemplatePayload(longText, [button]);
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("text");
        expect(result.left.message).toBe("Text must be 640 characters or less");
      }
    });

    it("should fail with ValidationError for 0 buttons", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        return yield* service.createButtonTemplatePayload("Choose an option", []);
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("buttons");
        expect(result.left.message).toBe("At least one button is required");
      }
    });

    it("should fail with ValidationError for more than 3 buttons", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ButtonTemplateService;
        const button1 = yield* service.createWebUrlButton("Visit", "https://example.com");
        const button2 = yield* service.createPostbackButton("Start", "GET_STARTED");
        const button3 = yield* service.createPhoneNumberButton("Call", "+1234567890");
        const button4 = yield* service.createAccountLinkButton("https://example.com/auth");
        return yield* service.createButtonTemplatePayload("Choose", [
          button1,
          button2,
          button3,
          button4,
        ]);
      }).pipe(Effect.provide(ButtonTemplateService.Default));

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.field).toBe("buttons");
        expect(result.left.message).toBe(
          "Maximum of 3 buttons allowed per button template"
        );
      }
    });
  });
});
