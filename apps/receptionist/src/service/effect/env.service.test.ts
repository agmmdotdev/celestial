import { Effect } from "@celestial/effect";
import { describe, it, expect } from "vitest";
import { EnvService } from "./env.service.js";
import { ConfigError } from "../errors/index.js";

describe("EnvService", () => {

  it("should successfully parse valid environment variables", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      const dbUrl = yield* envService.getDatabaseUrl();
      return dbUrl;
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe("postgresql://user:pass@localhost:5432/testdb");
  });

  it("should successfully create service with valid environment", async () => {
    // This test verifies that the service can be created without errors
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return envService;
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(Effect.either(program));
    expect(result._tag).toBe("Right");
  });

  it("should return correct database URL", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return yield* envService.getDatabaseUrl();
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe("postgresql://user:pass@localhost:5432/testdb");
  });

  it("should return correct port", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return yield* envService.getPort();
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe(3000);
  });

  it("should return correct cookie secret", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return yield* envService.getCookieSecret();
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe("test-cookie-secret-16chars");
  });

  it("should return correct Gemini API key", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return yield* envService.getGeminiApiKey();
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe("test-gemini-key");
  });

  it("should return correct Messenger verify token", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return yield* envService.getMessengerVerifyToken();
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe("test-verify-token");
  });

  it("should return correct Messenger app secret", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return yield* envService.getMessengerAppSecret();
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe("test-app-secret");
  });

  it("should return correct user access token", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return yield* envService.getUserAccessToken();
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe("test-user-token");
  });

  it("should return correct chatbot app ID", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return yield* envService.getChatBotAppId();
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe("test-app-id");
  });

  it("should return correct chatbot app secret", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return yield* envService.getChatBotAppSecret();
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe("test-bot-secret");
  });

  it("should return correct chatbot app access token", async () => {
    const program = Effect.gen(function* () {
      const envService = yield* EnvService;
      return yield* envService.getChatBotAppAccessToken();
    }).pipe(Effect.provide(EnvService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBe("test-bot-token");
  });
});
