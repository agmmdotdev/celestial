import { Effect, Layer } from "@celestial/effect";
import { HttpClient } from "@effect/platform";
import { EnvService } from "../env.service.js";

/**
 * Creates a mock HttpClient layer with customizable response behavior.
 *
 * @param responseFactory - A function that returns a mock response object.
 *                          The response should have a `json` property that returns an Effect.
 * @returns A Layer providing a mock HttpClient
 *
 * @example
 * ```typescript
 * const mockResponse = () => ({
 *   json: Effect.succeed({ recipient_id: "mock-id", message_id: "mock-message-id" })
 * });
 *
 * const MockHttpClient = createMockHttpClient(mockResponse);
 * ```
 */
export function createMockHttpClient<T = Record<string, unknown>>(
  responseFactory: () => { json: Effect.Effect<T> }
): Layer.Layer<HttpClient.HttpClient> {
  return Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.HttpClient.of({
      execute: () => Effect.succeed({} as never),
      get: () => Effect.succeed(responseFactory() as never),
      head: () => Effect.succeed(responseFactory() as never),
      post: () => Effect.succeed(responseFactory() as never),
      patch: () => Effect.succeed(responseFactory() as never),
      put: () => Effect.succeed(responseFactory() as never),
      del: () => Effect.succeed(responseFactory() as never),
      options: () => Effect.succeed(responseFactory() as never),
    } as never)
  );
}

/**
 * Shared mock EnvService layer used across all Facebook service tests.
 * Provides default mock values for all environment variables.
 */
export const MockEnvService = Layer.succeed(EnvService, {
  getDatabaseUrl: () => Effect.succeed("mock-db-url"),
  getPort: () => Effect.succeed(3000),
  getCookieSecret: () => Effect.succeed("mock-secret"),
  getSuperadminUsername: () => Effect.succeed("admin"),
  getSuperadminPassword: () => Effect.succeed("password"),
  getGeminiApiKey: () => Effect.succeed("mock-api-key"),
  getMessengerVerifyToken: () => Effect.succeed("mock-verify-token"),
  getMessengerAppSecret: () => Effect.succeed("mock-app-secret"),
  getUserAccessToken: () => Effect.succeed("mock-access-token"),
  getChatBotAppId: () => Effect.succeed("mock-app-id"),
  getChatBotAppSecret: () => Effect.succeed("mock-bot-secret"),
  getChatBotAppAccessToken: () => Effect.succeed("mock-bot-token"),
} as never);
