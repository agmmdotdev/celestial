import { Effect, Layer } from "@celestial/effect";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import { EnvService } from "../env.service.js";

/**
 * Creates a mock HttpClient layer with customizable response behavior.
 *
 * @param responseFactory - A function that returns a mock response configuration.
 *                          Provide either a `body` value or a legacy object containing a `json` Effect.
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
  responseFactory: (request: HttpClientRequest.HttpClientRequest) =>
    | {
        readonly status?: number;
        readonly body?: T;
        readonly headers?: Record<string, string>;
      }
    | {
        readonly status?: number;
        readonly headers?: Record<string, string>;
        readonly json: Effect.Effect<T>;
      }
): Layer.Layer<HttpClient.HttpClient> {
  return Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.makeWith(
      (requestEffect) =>
        Effect.flatMap(requestEffect, (request) =>
          Effect.flatMap(
            Effect.sync(() => responseFactory(request)),
            (config) => {
              const status = config.status ?? 200;
              const headers = {
                "Content-Type": "application/json",
                ...(config.headers ?? {}),
              };

              if ("json" in config) {
                return config.json.pipe(
                  Effect.map((body) =>
                    createHttpClientResponse({
                      request,
                      status,
                      headers,
                      body,
                    })
                  )
                ) as Effect.Effect<
                  HttpClientResponse.HttpClientResponse,
                  never
                >;
              }

              return Effect.succeed(
                createHttpClientResponse({
                  request,
                  status,
                  headers,
                  body: config.body,
                })
              );
            }
          )
        ),
      (request) => Effect.succeed(request)
    ) as HttpClient.HttpClient
  );
}

const createHttpClientResponse = ({
  request,
  status,
  headers,
  body,
}: {
  readonly request: HttpClientRequest.HttpClientRequest;
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body?: unknown;
}): HttpClientResponse.HttpClientResponse =>
  HttpClientResponse.fromWeb(
    request,
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers,
    })
  );

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
