import { Effect, Schema } from "@celestial/effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import { EnvService } from "../env.service.js";
import { FacebookApiError } from "../../errors/index.js";
import { FacebookGraphApiUrl } from "../../service/facebook-graph-api-constants.js";

const TokenRequestSchema = Schema.Struct({
  grant_type: Schema.Literal("fb_exchange_token"),
  client_id: Schema.String,
  client_secret: Schema.String,
  fb_exchange_token: Schema.String,
});

const TokenResponseSchema = Schema.Struct({
  access_token: Schema.optional(Schema.String),
  token_type: Schema.optional(Schema.String),
  expires_in: Schema.optional(Schema.Number),
  error: Schema.optional(
    Schema.Struct({
      message: Schema.String,
      type: Schema.String,
      code: Schema.Number,
      fbtrace_id: Schema.String,
    })
  ),
});

type TokenResponse = Schema.Schema.Type<typeof TokenResponseSchema>;

type TokenOperationContext =
  | "exchange short-lived token"
  | "refresh long-lived token";

const stringifyError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

/**
 * Effect-based Facebook OAuth Service
 *
 * This service provides methods for managing Facebook OAuth tokens including
 * exchanging short-lived tokens for long-lived tokens and refreshing tokens.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const oauth = yield* FacebookOAuthService;
 *   const longLivedToken = yield* oauth.exchangeShortLivedToken("short-token");
 *   return longLivedToken;
 * });
 * ```
 */
export class FacebookOAuthService extends Effect.Service<FacebookOAuthService>()(
  "app/FacebookOAuthService",
  {
    effect: Effect.gen(function* () {
      const httpClient = (yield* HttpClient.HttpClient).pipe(
        HttpClient.filterStatusOk
      );
      const envService = yield* EnvService;

      const graphApiBaseUrl = `${FacebookGraphApiUrl}/oauth/access_token`;

      const executeTokenRequest = (
        token: string,
        context: TokenOperationContext
      ): Effect.Effect<string, FacebookApiError> =>
        Effect.gen(function* () {
          const appId = yield* envService.getChatBotAppId();
          const appSecret = yield* envService.getChatBotAppSecret();

          const encodedParams = yield* Schema.encode(TokenRequestSchema)({
            grant_type: "fb_exchange_token",
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: token,
          }).pipe(
            Effect.mapError(
              (error) =>
                new FacebookApiError({
                  code: 0,
                  message: `Failed to ${context}: request validation failed (${stringifyError(
                    error
                  )})`,
                })
            )
          );

          const request = HttpClientRequest.get(graphApiBaseUrl).pipe(
            HttpClientRequest.setUrlParams(encodedParams)
          );

          const response = yield* httpClient.execute(request).pipe(
            Effect.mapError(
              (error) =>
                new FacebookApiError({
                  code: 0,
                  message: `Failed to ${context}: ${stringifyError(error)}`,
                })
            )
          );

          const parsed: TokenResponse =
            yield* HttpClientResponse.schemaBodyJson(TokenResponseSchema)(
              response
            ).pipe(
              Effect.mapError(
                (error) =>
                  new FacebookApiError({
                    code: 0,
                    message: `Failed to ${context}: response validation failed (${stringifyError(
                      error
                    )})`,
                  })
              )
            );

          if (parsed.error) {
            return yield* Effect.fail(
              new FacebookApiError({
                code: parsed.error.code,
                message: parsed.error.message,
                fbtraceId: parsed.error.fbtrace_id,
              })
            );
          }

          if (!parsed.access_token) {
            return yield* Effect.fail(
              new FacebookApiError({
                code: 0,
                message: `Failed to ${context}: access_token missing in response`,
              })
            );
          }

          return parsed.access_token;
        });

      return {
        /**
         * Exchanges a short-lived user access token for a long-lived one.
         * Long-lived tokens are typically valid for about 60 days.
         *
         * @param shortLivedToken The short-lived user access token
         * @returns Effect containing the long-lived access token or FacebookApiError
         *
         * @example
         * ```typescript
         * const longLivedToken = yield* oauth.exchangeShortLivedToken("short-token");
         * console.log("Long-lived token:", longLivedToken);
         * ```
         */
        exchangeShortLivedToken: (
          shortLivedToken: string
        ): Effect.Effect<string, FacebookApiError> =>
          executeTokenRequest(shortLivedToken, "exchange short-lived token"),

        /**
         * Refreshes a long-lived user access token.
         * This can be done if the token is at least 24 hours old but not yet expired.
         * The Facebook Graph API uses the same endpoint and grant_type for refreshing
         * as for the initial exchange.
         *
         * @param longLivedToken The existing long-lived user access token to be refreshed
         * @returns Effect containing a new long-lived access token or FacebookApiError
         *
         * @example
         * ```typescript
         * const newToken = yield* oauth.refreshLongLivedToken("existing-long-token");
         * console.log("Refreshed token:", newToken);
         * ```
         */
        refreshLongLivedToken: (
          longLivedToken: string
        ): Effect.Effect<string, FacebookApiError> =>
          executeTokenRequest(longLivedToken, "refresh long-lived token"),
      } as const;
    }),
    dependencies: [FetchHttpClient.layer, EnvService.Default],
  }
) {}

/**
 * Live layer for FacebookOAuthService with all dependencies configured for production use.
 * Provides HttpClient and EnvService dependencies.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const oauth = yield* FacebookOAuthService;
 *   return yield* oauth.exchangeShortLivedToken("short-token");
 * });
 *
 * Effect.runPromise(program.pipe(Effect.provide(FacebookOAuthServiceLive)));
 * ```
 */
// Live layer removed — use `FacebookOAuthService.Default` with test or prod layers as needed
