import { Effect, Layer } from "@celestial/effect";
import { HttpClient, FetchHttpClient } from "@effect/platform";
import { EnvService } from "../env.service.js";
import { FacebookApiError } from "../../errors/index.js";
import { FacebookGraphApiUrl } from "../../service/facebook-graph-api-constants.js";

/**
 * Facebook token response interface
 */
export interface FacebookTokenResponse {
    access_token: string;
    token_type?: string; // Typically 'bearer'
    expires_in?: number; // Typically for short-lived tokens
}

/**
 * Facebook error response interface
 */
export interface FacebookErrorResponse {
    error: {
        message: string;
        type: string;
        code: number;
        fbtrace_id: string;
    };
}

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
            const httpClient = yield* HttpClient.HttpClient;
            const envService = yield* EnvService;

            const graphApiBaseUrl = `${FacebookGraphApiUrl}/oauth/access_token`;

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
                exchangeShortLivedToken: (shortLivedToken: string): Effect.Effect<string, FacebookApiError> =>
                    Effect.gen(function* () {
                        const appId = yield* envService.getChatBotAppId();
                        const appSecret = yield* envService.getChatBotAppSecret();

                        const url =
                            `${graphApiBaseUrl}?` +
                            `grant_type=fb_exchange_token&` +
                            `client_id=${appId}&` +
                            `client_secret=${appSecret}&` +
                            `fb_exchange_token=${shortLivedToken}`;

                        const response = yield* httpClient.get(url).pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to exchange short-lived token: ${error}`,
                                    })
                                )
                            )
                        );

                        const data = yield* response.json.pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to parse token exchange response: ${error}`,
                                    })
                                )
                            )
                        );

                        // Check if response contains an error
                        const errorResponse = data as FacebookErrorResponse;
                        if (errorResponse.error) {
                            return yield* Effect.fail(
                                new FacebookApiError({
                                    code: errorResponse.error.code,
                                    message: errorResponse.error.message,
                                    fbtraceId: errorResponse.error.fbtrace_id,
                                })
                            );
                        }

                        // Parse successful response
                        const tokenResponse = data as FacebookTokenResponse;
                        if (!tokenResponse.access_token) {
                            return yield* Effect.fail(
                                new FacebookApiError({
                                    code: 0,
                                    message: "No access_token in response",
                                })
                            );
                        }

                        return tokenResponse.access_token;
                    }),

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
                refreshLongLivedToken: (longLivedToken: string): Effect.Effect<string, FacebookApiError> =>
                    Effect.gen(function* () {
                        // Facebook's documentation indicates that refreshing a long-lived token
                        // uses the same mechanism as exchanging a short-lived token for a long-lived one.
                        // You essentially "exchange" your current long-lived token for a new one.
                        // See: https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing/
                        const appId = yield* envService.getChatBotAppId();
                        const appSecret = yield* envService.getChatBotAppSecret();

                        const url =
                            `${graphApiBaseUrl}?` +
                            `grant_type=fb_exchange_token&` +
                            `client_id=${appId}&` +
                            `client_secret=${appSecret}&` +
                            `fb_exchange_token=${longLivedToken}`;

                        const response = yield* httpClient.get(url).pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to refresh long-lived token: ${error}`,
                                    })
                                )
                            )
                        );

                        const data = yield* response.json.pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to parse token refresh response: ${error}`,
                                    })
                                )
                            )
                        );

                        // Check if response contains an error
                        const errorResponse = data as FacebookErrorResponse;
                        if (errorResponse.error) {
                            return yield* Effect.fail(
                                new FacebookApiError({
                                    code: errorResponse.error.code,
                                    message: errorResponse.error.message,
                                    fbtraceId: errorResponse.error.fbtrace_id,
                                })
                            );
                        }

                        // Parse successful response
                        const tokenResponse = data as FacebookTokenResponse;
                        if (!tokenResponse.access_token) {
                            return yield* Effect.fail(
                                new FacebookApiError({
                                    code: 0,
                                    message: "No access_token in response",
                                })
                            );
                        }

                        return tokenResponse.access_token;
                    }),
            } as const;
        }),
        dependencies: [FetchHttpClient.layer, EnvService.Default],
    }
) { }

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
