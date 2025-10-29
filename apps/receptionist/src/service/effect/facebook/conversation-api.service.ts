import { Effect, Layer } from "@celestial/effect";
import { HttpClient, HttpBody, FetchHttpClient } from "@effect/platform";
import { EnvService } from "../env.service.js";
import { FacebookApiError } from "../../errors/index.js";
import { FacebookGraphApiUrl } from "../../service/facebook-graph-api-constants.js";

/**
 * Thread control status response
 */
export interface ThreadControlResponse {
    success: boolean;
}

/**
 * Thread owner information
 */
export interface ThreadOwner {
    app_id: string;
}

/**
 * Thread owner response from Facebook API
 */
export interface ThreadOwnerResponse {
    data: ThreadOwner[];
}

/**
 * Secondary receiver information
 */
export interface SecondaryReceiver {
    id: string;
    name: string;
}

/**
 * Secondary receivers response from Facebook API
 */
export interface SecondaryReceiversResponse {
    data: SecondaryReceiver[];
}

/**
 * Effect-based Conversation API Service
 * 
 * This service provides methods for managing Facebook Messenger conversations
 * including thread control (handover protocol) operations.
 * 
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const conversationApi = yield* ConversationApiService;
 *   const owner = yield* conversationApi.getThreadOwner("page-id", "user-id");
 *   return owner;
 * });
 * ```
 */
export class ConversationApiService extends Effect.Service<ConversationApiService>()(
    "app/ConversationApiService",
    {
        effect: Effect.gen(function* () {
            const httpClient = yield* HttpClient.HttpClient;
            const envService = yield* EnvService;

            return {
                /**
                 * Passes thread control to another app (handover protocol).
                 * 
                 * @param pageId The Facebook Page ID
                 * @param recipientId The user's PSID
                 * @param targetAppId The app ID to pass control to
                 * @param metadata Optional metadata string (max 1000 characters)
                 * @param pageAccessToken Optional page access token
                 * @returns Effect containing ThreadControlResponse or FacebookApiError
                 * 
                 * @example
                 * ```typescript
                 * const result = yield* conversationApi.passThreadControl(
                 *   "page-id",
                 *   "user-id",
                 *   "target-app-id",
                 *   "Passing to human agent"
                 * );
                 * ```
                 */
                passThreadControl: (
                    pageId: string,
                    recipientId: string,
                    targetAppId: string,
                    metadata?: string,
                    pageAccessToken?: string
                ): Effect.Effect<ThreadControlResponse, FacebookApiError> =>
                    Effect.gen(function* () {
                        const accessToken = pageAccessToken ?? (yield* envService.getUserAccessToken());
                        const url = `${FacebookGraphApiUrl}/${pageId}/pass_thread_control?access_token=${accessToken}`;

                        const body: Record<string, unknown> = {
                            recipient: { id: recipientId },
                            target_app_id: targetAppId,
                        };

                        if (metadata) {
                            body.metadata = metadata;
                        }

                        const bodyData = yield* HttpBody.json(body).pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to create request body: ${error}`,
                                    })
                                )
                            )
                        );

                        const response = yield* httpClient.post(url, { body: bodyData }).pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to pass thread control: ${error}`,
                                    })
                                )
                            )
                        );

                        const data = yield* response.json.pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to parse pass thread control response: ${error}`,
                                    })
                                )
                            )
                        );

                        return data as ThreadControlResponse;
                    }),

                /**
                 * Takes thread control from another app (handover protocol).
                 * 
                 * @param pageId The Facebook Page ID
                 * @param recipientId The user's PSID
                 * @param metadata Optional metadata string (max 1000 characters)
                 * @param pageAccessToken Optional page access token
                 * @returns Effect containing ThreadControlResponse or FacebookApiError
                 * 
                 * @example
                 * ```typescript
                 * const result = yield* conversationApi.takeThreadControl(
                 *   "page-id",
                 *   "user-id",
                 *   "Taking control back"
                 * );
                 * ```
                 */
                takeThreadControl: (
                    pageId: string,
                    recipientId: string,
                    metadata?: string,
                    pageAccessToken?: string
                ): Effect.Effect<ThreadControlResponse, FacebookApiError> =>
                    Effect.gen(function* () {
                        const accessToken = pageAccessToken ?? (yield* envService.getUserAccessToken());
                        const url = `${FacebookGraphApiUrl}/${pageId}/take_thread_control?access_token=${accessToken}`;

                        const body: Record<string, unknown> = {
                            recipient: { id: recipientId },
                        };

                        if (metadata) {
                            body.metadata = metadata;
                        }

                        const bodyData = yield* HttpBody.json(body).pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to create request body: ${error}`,
                                    })
                                )
                            )
                        );

                        const response = yield* httpClient.post(url, { body: bodyData }).pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to take thread control: ${error}`,
                                    })
                                )
                            )
                        );

                        const data = yield* response.json.pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to parse take thread control response: ${error}`,
                                    })
                                )
                            )
                        );

                        return data as ThreadControlResponse;
                    }),

                /**
                 * Requests thread control from the current owner (handover protocol).
                 * 
                 * @param pageId The Facebook Page ID
                 * @param recipientId The user's PSID
                 * @param metadata Optional metadata string (max 1000 characters)
                 * @param pageAccessToken Optional page access token
                 * @returns Effect containing ThreadControlResponse or FacebookApiError
                 * 
                 * @example
                 * ```typescript
                 * const result = yield* conversationApi.requestThreadControl(
                 *   "page-id",
                 *   "user-id",
                 *   "Requesting control"
                 * );
                 * ```
                 */
                requestThreadControl: (
                    pageId: string,
                    recipientId: string,
                    metadata?: string,
                    pageAccessToken?: string
                ): Effect.Effect<ThreadControlResponse, FacebookApiError> =>
                    Effect.gen(function* () {
                        const accessToken = pageAccessToken ?? (yield* envService.getUserAccessToken());
                        const url = `${FacebookGraphApiUrl}/${pageId}/request_thread_control?access_token=${accessToken}`;

                        const body: Record<string, unknown> = {
                            recipient: { id: recipientId },
                        };

                        if (metadata) {
                            body.metadata = metadata;
                        }

                        const bodyData = yield* HttpBody.json(body).pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to create request body: ${error}`,
                                    })
                                )
                            )
                        );

                        const response = yield* httpClient.post(url, { body: bodyData }).pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to request thread control: ${error}`,
                                    })
                                )
                            )
                        );

                        const data = yield* response.json.pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to parse request thread control response: ${error}`,
                                    })
                                )
                            )
                        );

                        return data as ThreadControlResponse;
                    }),

                /**
                 * Gets the current thread owner for a conversation.
                 * 
                 * @param pageId The Facebook Page ID
                 * @param recipientId The user's PSID
                 * @param pageAccessToken Optional page access token
                 * @returns Effect containing ThreadOwnerResponse or FacebookApiError
                 * 
                 * @example
                 * ```typescript
                 * const owner = yield* conversationApi.getThreadOwner("page-id", "user-id");
                 * console.log("Thread owner app ID:", owner.data[0].app_id);
                 * ```
                 */
                getThreadOwner: (
                    pageId: string,
                    recipientId: string,
                    pageAccessToken?: string
                ): Effect.Effect<ThreadOwnerResponse, FacebookApiError> =>
                    Effect.gen(function* () {
                        const accessToken = pageAccessToken ?? (yield* envService.getUserAccessToken());
                        const url = `${FacebookGraphApiUrl}/${pageId}/thread_owner?recipient=${recipientId}&access_token=${accessToken}`;

                        const response = yield* httpClient.get(url).pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to get thread owner: ${error}`,
                                    })
                                )
                            )
                        );

                        const data = yield* response.json.pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to parse thread owner response: ${error}`,
                                    })
                                )
                            )
                        );

                        return data as ThreadOwnerResponse;
                    }),

                /**
                 * Gets the list of secondary receivers for the page.
                 * Secondary receivers are apps that can receive thread control.
                 * 
                 * @param pageId The Facebook Page ID
                 * @param pageAccessToken Optional page access token
                 * @returns Effect containing SecondaryReceiversResponse or FacebookApiError
                 * 
                 * @example
                 * ```typescript
                 * const receivers = yield* conversationApi.getSecondaryReceivers("page-id");
                 * console.log("Secondary receivers:", receivers.data);
                 * ```
                 */
                getSecondaryReceivers: (
                    pageId: string,
                    pageAccessToken?: string
                ): Effect.Effect<SecondaryReceiversResponse, FacebookApiError> =>
                    Effect.gen(function* () {
                        const accessToken = pageAccessToken ?? (yield* envService.getUserAccessToken());
                        const url = `${FacebookGraphApiUrl}/${pageId}/secondary_receivers?access_token=${accessToken}`;

                        const response = yield* httpClient.get(url).pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to get secondary receivers: ${error}`,
                                    })
                                )
                            )
                        );

                        const data = yield* response.json.pipe(
                            Effect.catchAll((error) =>
                                Effect.fail(
                                    new FacebookApiError({
                                        code: 0,
                                        message: `Failed to parse secondary receivers response: ${error}`,
                                    })
                                )
                            )
                        );

                        return data as SecondaryReceiversResponse;
                    }),
            } as const;
        }),
        dependencies: [FetchHttpClient.layer, EnvService.Default],
    }
) { }

// Live layer removed — use `ConversationApiService.Default` with test or prod layers as needed
