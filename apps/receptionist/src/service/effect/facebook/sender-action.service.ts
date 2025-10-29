import { Effect, Layer } from "@celestial/effect";
import { HttpClient, HttpBody, FetchHttpClient } from "@effect/platform";
import { EnvService } from "../env.service.js";
import { FacebookApiError } from "../../errors/index.js";
import { FacebookGraphApiUrl } from "../../service/facebook-graph-api-constants.js";

/**
 * Sender action types supported by Facebook Messenger
 */
export enum SenderAction {
  TYPING_ON = "typing_on",
  TYPING_OFF = "typing_off",
  MARK_SEEN = "mark_seen",
}

/**
 * Recipient interface
 */
export interface Recipient {
  id: string; // Page-scoped ID (PSID)
}

/**
 * Sender action request interface
 */
export interface SenderActionRequest {
  recipient: Recipient;
  sender_action: SenderAction;
}

/**
 * Sender action response interface
 */
export interface SenderActionResponse {
  recipient_id: string;
}

/**
 * Effect-based Sender Action Service
 *
 * This service provides methods for sending sender actions (typing indicators, mark seen)
 * via Facebook Messenger Platform with validation and type safety through Effect.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const senderAction = yield* SenderActionService;
 *   const response = yield* senderAction.sendTypingOn(
 *     "page-id",
 *     "recipient-id"
 *   );
 *   return response;
 * });
 * ```
 */
export class SenderActionService extends Effect.Service<SenderActionService>()(
  "app/SenderActionService",
  {
    effect: Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;
      const envService = yield* EnvService;

      /**
       * Core method to send sender actions to Facebook Graph API.
       *
       * @param pageId - The Facebook Page ID sending the action
       * @param recipientId - The Page-scoped ID (PSID) of the recipient
       * @param action - The sender action to perform
       * @param pageAccessToken - Optional page access token
       * @returns Effect containing SenderActionResponse or FacebookApiError
       */
      const sendSenderAction = (
        pageId: string,
        recipientId: string,
        action: SenderAction,
        pageAccessToken?: string
      ) =>
        Effect.gen(function* () {
          const accessToken =
            pageAccessToken ?? (yield* envService.getUserAccessToken());

          const url = `${FacebookGraphApiUrl}/${pageId}/messages?access_token=${accessToken}`;

          const actionRequest: SenderActionRequest = {
            recipient: { id: recipientId },
            sender_action: action,
          };

          const bodyData = yield* HttpBody.json(actionRequest);

          const response = yield* httpClient
            .post(url, {
              body: bodyData,
            })
            .pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new FacebookApiError({
                    code: 0,
                    message: `Failed to send sender action (${action}): ${error}`,
                  })
                )
              )
            );

          const data = yield* response.json.pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                new FacebookApiError({
                  code: 0,
                  message: `Failed to parse sender action response: ${error}`,
                })
              )
            )
          );

          return data as SenderActionResponse;
        });

      return {
        /**
         * Displays the typing bubble to indicate the page is preparing a response.
         *
         * @param pageId - The Facebook Page ID sending the action
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param pageAccessToken - Optional page access token (uses user access token if not provided)
         * @returns Effect containing SenderActionResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* senderAction.sendTypingOn("page-id", "recipient-id");
         * console.log("Typing indicator shown for:", response.recipient_id);
         * ```
         */
        sendTypingOn: (
          pageId: string,
          recipientId: string,
          pageAccessToken?: string
        ) =>
          sendSenderAction(
            pageId,
            recipientId,
            SenderAction.TYPING_ON,
            pageAccessToken
          ),

        /**
         * Hides the typing bubble.
         *
         * @param pageId - The Facebook Page ID sending the action
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param pageAccessToken - Optional page access token (uses user access token if not provided)
         * @returns Effect containing SenderActionResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* senderAction.sendTypingOff("page-id", "recipient-id");
         * console.log("Typing indicator hidden for:", response.recipient_id);
         * ```
         */
        sendTypingOff: (
          pageId: string,
          recipientId: string,
          pageAccessToken?: string
        ) =>
          sendSenderAction(
            pageId,
            recipientId,
            SenderAction.TYPING_OFF,
            pageAccessToken
          ),

        /**
         * Marks messages as seen by the page.
         *
         * @param pageId - The Facebook Page ID sending the action
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param pageAccessToken - Optional page access token (uses user access token if not provided)
         * @returns Effect containing SenderActionResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* senderAction.sendMarkSeen("page-id", "recipient-id");
         * console.log("Message marked as seen for:", response.recipient_id);
         * ```
         */
        sendMarkSeen: (
          pageId: string,
          recipientId: string,
          pageAccessToken?: string
        ) =>
          sendSenderAction(
            pageId,
            recipientId,
            SenderAction.MARK_SEEN,
            pageAccessToken
          ),
      } as const;
    }),
    dependencies: [FetchHttpClient.layer, EnvService.Default],
  }
) {}
