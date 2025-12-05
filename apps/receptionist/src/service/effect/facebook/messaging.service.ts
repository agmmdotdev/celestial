import { Effect, Layer } from "@celestial/effect";
import { HttpClient, HttpBody, FetchHttpClient } from "@effect/platform";
import { EnvService } from "../env.service.js";
import {
  ButtonTemplateService,
  Button,
  ButtonTemplatePayload,
} from "./button-template.service.js";
import {
  QuickRepliesService,
  QuickReply,
  QuickReplyResponse,
  MessageWithQuickReplies,
} from "./quick-replies.service.js";
import {
  FacebookApiError,
  toFacebookErrorDetail,
  MessagingErrorMessage,
} from "../../errors/index.js";
import { FacebookGraphApiUrl } from "../../service/facebook-graph-api-constants.js";

/**
 * Messaging types for Facebook Messenger
 */
export enum MessagingType {
  RESPONSE = "RESPONSE",
  UPDATE = "UPDATE",
  MESSAGE_TAG = "MESSAGE_TAG",
}

/**
 * Message tags for sending messages outside the 24-hour window
 */
export enum MessageTag {
  CONFIRMED_EVENT_UPDATE = "CONFIRMED_EVENT_UPDATE",
  POST_PURCHASE_UPDATE = "POST_PURCHASE_UPDATE",
  ACCOUNT_UPDATE = "ACCOUNT_UPDATE",
  HUMAN_AGENT = "HUMAN_AGENT",
}

/**
 * Attachment types supported by Facebook Messenger
 */
export enum AttachmentType {
  AUDIO = "audio",
  FILE = "file",
  IMAGE = "image",
  VIDEO = "video",
  TEMPLATE = "template",
}

/**
 * Recipient interface
 */
export interface Recipient {
  id: string; // Page-scoped ID (PSID)
}

/**
 * Attachment payload interface
 */
export interface AttachmentPayload {
  url?: string;
  attachment_id?: string;
  is_reusable?: boolean;
}

/**
 * Attachment interface
 */
export interface Attachment {
  type: AttachmentType;
  payload: AttachmentPayload | ButtonTemplatePayload | any;
}

/**
 * Message with text
 */
export interface MessageWithText {
  text: string;
}

/**
 * Message with attachment
 */
export interface MessageWithAttachment {
  attachment: Attachment;
}

/**
 * Message with multiple attachments
 */
export interface MessageWithMultipleAttachments {
  attachments: Attachment[];
}

/**
 * Message with template
 */
export interface MessageWithTemplate {
  attachment: {
    type: AttachmentType.TEMPLATE;
    payload: any;
  };
}

/**
 * Union type for message content
 */
export type MessageContent =
  | MessageWithText
  | MessageWithAttachment
  | MessageWithMultipleAttachments
  | MessageWithTemplate
  | MessageWithQuickReplies;

/**
 * Send message request interface
 */
export interface SendMessageRequest {
  recipient: Recipient;
  messaging_type: MessagingType;
  message: MessageContent;
  tag?: MessageTag;
}

/**
 * Send message response interface
 */
export interface SendMessageResponse {
  recipient_id: string;
  message_id: string;
}

/**
 * Message event with quick reply response
 */
export interface MessageWithQuickReplyEvent {
  quick_reply: QuickReplyResponse;
}

/**
 * Effect-based Messaging Service
 *
 * This service provides methods for sending messages via Facebook Messenger Platform
 * with validation and type safety through Effect.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const messaging = yield* MessagingService;
 *   const response = yield* messaging.sendTextMessage(
 *     "page-id",
 *     "recipient-id",
 *     "Hello, World!"
 *   );
 *   return response;
 * });
 * ```
 */
export class MessagingService extends Effect.Service<MessagingService>()(
  "app/MessagingService",
  {
    effect: Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;
      const envService = yield* EnvService;
      const buttonTemplateService = yield* ButtonTemplateService;
      const quickRepliesService = yield* QuickRepliesService;

      /**
       * Core method to send any type of message to Facebook Graph API.
       *
       * @param pageId - The Facebook Page ID sending the message
       * @param messageRequest - The complete message request object
       * @param pageAccessToken - Optional page access token
       * @returns Effect containing SendMessageResponse or FacebookApiError
       */
      const sendMessage = (
        pageId: string,
        messageRequest: SendMessageRequest,
        pageAccessToken?: string
      ) =>
        Effect.gen(function* () {
          const accessToken =
            pageAccessToken ?? (yield* envService.getUserAccessToken());

          const url = `${FacebookGraphApiUrl}/${pageId}/messages?access_token=${accessToken}`;

          const bodyData = yield* HttpBody.json(messageRequest);

          const response = yield* httpClient
            .post(url, {
              body: bodyData,
            })
            .pipe(
              Effect.catchAll((error) =>
                Effect.fail(
                  new FacebookApiError({
                    code: 0,
                    message: MessagingErrorMessage.SEND_MESSAGE_FAILED,
                    details: toFacebookErrorDetail(error),
                  })
                )
              )
            );

          const data = yield* response.json.pipe(
            Effect.catchAll((error) =>
              Effect.fail(
                new FacebookApiError({
                  code: 0,
                  message: MessagingErrorMessage.PARSE_MESSAGE_RESPONSE_FAILED,
                  details: toFacebookErrorDetail(error),
                })
              )
            )
          );

          return data as SendMessageResponse;
        });

      return {
        /**
         * Sends a basic text message to a recipient.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param text - The text message to send
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token (uses user access token if not provided)
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendTextMessage(
         *   "page-id",
         *   "recipient-id",
         *   "Hello, World!"
         * );
         * ```
         */
        sendTextMessage: (
          pageId: string,
          recipientId: string,
          text: string,
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: { text },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a button template message with up to 3 buttons.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param text - The text to display above the buttons (max 640 characters)
         * @param buttons - Array of 1-3 buttons to display
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const button = yield* buttonTemplateService.createWebUrlButton("Visit", "https://example.com");
         * const response = yield* messaging.sendButtonTemplateMessage(
         *   "page-id",
         *   "recipient-id",
         *   "Choose an option",
         *   [button]
         * );
         * ```
         */
        sendButtonTemplateMessage: (
          pageId: string,
          recipientId: string,
          text: string,
          buttons: Button[],
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const payload =
              yield* buttonTemplateService.createButtonTemplatePayload(
                text,
                buttons
              );

            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: {
                attachment: {
                  type: AttachmentType.TEMPLATE,
                  payload,
                },
              },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a generic template message with pre-built payload.
         * Note: GenericTemplateService will be implemented in a future task.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param genericPayload - The complete generic template payload
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         */
        sendGenericTemplateMessage: (
          pageId: string,
          recipientId: string,
          genericPayload: any,
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: {
                attachment: {
                  type: AttachmentType.TEMPLATE,
                  payload: genericPayload,
                },
              },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a coupon template message with pre-built payload.
         * Note: CouponTemplateService will be implemented in a future task.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param couponPayload - The complete coupon template payload
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         */
        sendCouponTemplateMessage: (
          pageId: string,
          recipientId: string,
          couponPayload: any,
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: {
                attachment: {
                  type: AttachmentType.TEMPLATE,
                  payload: couponPayload,
                },
              },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a receipt template message for order confirmations.
         * Note: ReceiptTemplateService will be implemented in a future task.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param receiptPayload - The receipt template payload
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         */
        sendReceiptTemplateMessage: (
          pageId: string,
          recipientId: string,
          receiptPayload: any,
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: {
                attachment: {
                  type: AttachmentType.TEMPLATE,
                  payload: receiptPayload,
                },
              },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a message with quick replies.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param text - The message text
         * @param quickReplies - Array of quick reply objects
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const quickReply = yield* quickRepliesService.createTextQuickReply("Yes", "YES");
         * const response = yield* messaging.sendQuickReplyMessage(
         *   "page-id",
         *   "recipient-id",
         *   "Do you agree?",
         *   [quickReply]
         * );
         * ```
         */
        sendQuickReplyMessage: (
          pageId: string,
          recipientId: string,
          text: string,
          quickReplies: QuickReply[],
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const quickReplyMessage =
              yield* quickRepliesService.createQuickReplyMessage(
                text,
                quickReplies
              );

            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: quickReplyMessage,
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a yes/no quick reply message.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param text - The question text
         * @param yesPayload - Optional payload for yes button
         * @param noPayload - Optional payload for no button
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendYesNoQuickReplyMessage(
         *   "page-id",
         *   "recipient-id",
         *   "Do you agree?"
         * );
         * ```
         */
        sendYesNoQuickReplyMessage: (
          pageId: string,
          recipientId: string,
          text: string,
          yesPayload?: string,
          noPayload?: string,
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const quickReplyMessage =
              yield* quickRepliesService.createYesNoQuickReplyMessage(
                text,
                yesPayload,
                noPayload
              );

            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: quickReplyMessage,
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a multiple choice quick reply message.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param text - The question text
         * @param choices - Array of choice options
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendMultipleChoiceQuickReplyMessage(
         *   "page-id",
         *   "recipient-id",
         *   "What's your favorite color?",
         *   [
         *     { label: "Red", value: "RED" },
         *     { label: "Blue", value: "BLUE" }
         *   ]
         * );
         * ```
         */
        sendMultipleChoiceQuickReplyMessage: (
          pageId: string,
          recipientId: string,
          text: string,
          choices: Array<{
            label: string;
            value: string;
            imageUrl?: string;
          }>,
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const quickReplyMessage =
              yield* quickRepliesService.createMultipleChoiceQuickReplyMessage(
                text,
                choices
              );

            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: quickReplyMessage,
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a rating quick reply message (1-5 stars).
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param text - The message text
         * @param useStarEmojis - Whether to use star emojis in titles
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendRatingQuickReplyMessage(
         *   "page-id",
         *   "recipient-id",
         *   "Rate your experience"
         * );
         * ```
         */
        sendRatingQuickReplyMessage: (
          pageId: string,
          recipientId: string,
          text: string,
          useStarEmojis: boolean = true,
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const quickReplyMessage =
              yield* quickRepliesService.createRatingQuickReplyMessage(
                text,
                useStarEmojis
              );

            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: quickReplyMessage,
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a contact quick reply message for collecting contact information.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param text - The message text
         * @param includePhone - Whether to include phone number quick reply
         * @param includeEmail - Whether to include email quick reply
         * @param additionalOptions - Optional additional text quick replies
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendContactQuickReplyMessage(
         *   "page-id",
         *   "recipient-id",
         *   "How can we contact you?",
         *   true,
         *   true,
         *   [{ title: "Skip", payload: "SKIP" }]
         * );
         * ```
         */
        sendContactQuickReplyMessage: (
          pageId: string,
          recipientId: string,
          text: string,
          includePhone: boolean = true,
          includeEmail: boolean = true,
          additionalOptions?: Array<{
            title: string;
            payload?: string;
            imageUrl?: string;
          }>,
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const quickReplyMessage =
              yield* quickRepliesService.createContactQuickReplyMessage(
                text,
                includePhone,
                includeEmail,
                additionalOptions
              );

            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: quickReplyMessage,
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a message with a media attachment (image, video, audio, or file).
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param attachmentType - The type of attachment
         * @param mediaUrl - The URL of the media to send
         * @param isReusable - Whether the attachment should be reusable (default: true)
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendMediaMessage(
         *   "page-id",
         *   "recipient-id",
         *   AttachmentType.IMAGE,
         *   "https://example.com/image.jpg"
         * );
         * ```
         */
        sendMediaMessage: (
          pageId: string,
          recipientId: string,
          attachmentType: AttachmentType,
          mediaUrl: string,
          isReusable: boolean = true,
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: {
                attachment: {
                  type: attachmentType,
                  payload: {
                    url: mediaUrl,
                    is_reusable: isReusable,
                  },
                },
              },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a message with multiple image attachments (up to 30 images).
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param imageUrls - Array of image URLs to send (max 30)
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendMultipleImagesMessage(
         *   "page-id",
         *   "recipient-id",
         *   ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
         * );
         * ```
         */
        sendMultipleImagesMessage: (
          pageId: string,
          recipientId: string,
          imageUrls: string[],
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            if (imageUrls.length === 0) {
              return yield* Effect.fail(
                new FacebookApiError({
                  code: 0,
                  message: MessagingErrorMessage.MISSING_IMAGE_URL,
                  details: "At least one image URL is required.",
                })
              );
            }
            if (imageUrls.length > 30) {
              return yield* Effect.fail(
                new FacebookApiError({
                  code: 0,
                  message: MessagingErrorMessage.TOO_MANY_IMAGES,
                  details: "Maximum of 30 images allowed per message.",
                })
              );
            }

            const attachments: Attachment[] = imageUrls.map((url) => ({
              type: AttachmentType.IMAGE,
              payload: { url },
            }));

            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: { attachments },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a message using a previously uploaded attachment ID.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param attachmentType - The type of attachment
         * @param attachmentId - The ID of the previously uploaded attachment
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendMessageWithAttachmentId(
         *   "page-id",
         *   "recipient-id",
         *   AttachmentType.IMAGE,
         *   "attachment-id-123"
         * );
         * ```
         */
        sendMessageWithAttachmentId: (
          pageId: string,
          recipientId: string,
          attachmentType: AttachmentType,
          attachmentId: string,
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: {
                attachment: {
                  type: attachmentType,
                  payload: {
                    attachment_id: attachmentId,
                  },
                },
              },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a carousel generic template message with multiple elements.
         * Note: This is a placeholder until GenericTemplateService is implemented.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param elements - Array of generic template elements (max 10)
         * @param imageAspectRatio - Optional aspect ratio for images
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendCarouselGenericTemplateMessage(
         *   "page-id",
         *   "recipient-id",
         *   [
         *     { title: "Item 1", subtitle: "Description 1" },
         *     { title: "Item 2", subtitle: "Description 2" }
         *   ]
         * );
         * ```
         */
        sendCarouselGenericTemplateMessage: (
          pageId: string,
          recipientId: string,
          elements: Array<any>,
          imageAspectRatio?: "horizontal" | "square",
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            // This will be fully implemented when GenericTemplateService is available
            const genericPayload = {
              template_type: "generic",
              elements,
              image_aspect_ratio: imageAspectRatio,
            };

            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: {
                attachment: {
                  type: AttachmentType.TEMPLATE,
                  payload: genericPayload,
                },
              },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a product showcase carousel using generic template.
         * Note: This is a placeholder until GenericTemplateService is implemented.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param products - Array of product information
         * @param options - Optional template configuration
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendProductCarouselMessage(
         *   "page-id",
         *   "recipient-id",
         *   [
         *     {
         *       title: "Product 1",
         *       price: "$19.99",
         *       imageUrl: "https://example.com/product1.jpg",
         *       productUrl: "https://example.com/product1"
         *     }
         *   ]
         * );
         * ```
         */
        sendProductCarouselMessage: (
          pageId: string,
          recipientId: string,
          products: Array<{
            title: string;
            price: string;
            imageUrl: string;
            productUrl: string;
            subtitle?: string;
            buttons?: Button[];
          }>,
          options?: {
            image_aspect_ratio?: "horizontal" | "square";
            webview_height_ratio?: "compact" | "tall" | "full";
          },
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            // This will be fully implemented when GenericTemplateService is available
            const productElements = products.map((product) => ({
              title: product.title,
              subtitle: product.subtitle || product.price,
              image_url: product.imageUrl,
              default_action: {
                type: "web_url",
                url: product.productUrl,
                webview_height_ratio: options?.webview_height_ratio || "tall",
              },
              buttons: product.buttons,
            }));

            return yield* Effect.gen(function* () {
              return yield* Effect.succeed({} as any);
            }).pipe(
              Effect.flatMap(() =>
                Effect.gen(function* () {
                  return yield* sendMessage(
                    pageId,
                    {
                      recipient: { id: recipientId },
                      messaging_type: messagingType,
                      message: {
                        attachment: {
                          type: AttachmentType.TEMPLATE,
                          payload: {
                            template_type: "generic",
                            elements: productElements,
                            image_aspect_ratio: options?.image_aspect_ratio,
                          },
                        },
                      },
                    },
                    pageAccessToken
                  );
                })
              )
            );
          }),

        /**
         * Sends a location carousel using generic template.
         * Note: This is a placeholder until GenericTemplateService is implemented.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param locations - Array of location information
         * @param options - Optional template configuration
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendLocationCarouselMessage(
         *   "page-id",
         *   "recipient-id",
         *   [
         *     {
         *       title: "Store 1",
         *       address: "123 Main St",
         *       imageUrl: "https://example.com/store1.jpg",
         *       mapUrl: "https://maps.google.com/?q=123+Main+St"
         *     }
         *   ]
         * );
         * ```
         */
        sendLocationCarouselMessage: (
          pageId: string,
          recipientId: string,
          locations: Array<{
            title: string;
            address: string;
            imageUrl: string;
            mapUrl: string;
            buttons?: Button[];
          }>,
          options?: {
            image_aspect_ratio?: "horizontal" | "square";
          },
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            // This will be fully implemented when GenericTemplateService is available
            const locationElements = locations.map((location) => ({
              title: location.title,
              subtitle: location.address,
              image_url: location.imageUrl,
              default_action: {
                type: "web_url",
                url: location.mapUrl,
              },
              buttons: location.buttons,
            }));

            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: {
                attachment: {
                  type: AttachmentType.TEMPLATE,
                  payload: {
                    template_type: "generic",
                    elements: locationElements,
                    image_aspect_ratio: options?.image_aspect_ratio,
                  },
                },
              },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends an article carousel using generic template.
         * Note: This is a placeholder until GenericTemplateService is implemented.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param articles - Array of article information
         * @param options - Optional template configuration
         * @param messagingType - The type of message (default: RESPONSE)
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendArticleCarouselMessage(
         *   "page-id",
         *   "recipient-id",
         *   [
         *     {
         *       title: "Article 1",
         *       summary: "Article summary",
         *       imageUrl: "https://example.com/article1.jpg",
         *       articleUrl: "https://example.com/article1"
         *     }
         *   ]
         * );
         * ```
         */
        sendArticleCarouselMessage: (
          pageId: string,
          recipientId: string,
          articles: Array<{
            title: string;
            summary: string;
            imageUrl: string;
            articleUrl: string;
            buttons?: Button[];
          }>,
          options?: {
            image_aspect_ratio?: "horizontal" | "square";
            webview_height_ratio?: "compact" | "tall" | "full";
          },
          messagingType: MessagingType = MessagingType.RESPONSE,
          pageAccessToken?: string
        ) =>
          Effect.gen(function* () {
            // This will be fully implemented when GenericTemplateService is available
            const articleElements = articles.map((article) => ({
              title: article.title,
              subtitle: article.summary,
              image_url: article.imageUrl,
              default_action: {
                type: "web_url",
                url: article.articleUrl,
                webview_height_ratio: options?.webview_height_ratio || "tall",
              },
              buttons: article.buttons,
            }));

            const messageRequest: SendMessageRequest = {
              recipient: { id: recipientId },
              messaging_type: messagingType,
              message: {
                attachment: {
                  type: AttachmentType.TEMPLATE,
                  payload: {
                    template_type: "generic",
                    elements: articleElements,
                    image_aspect_ratio: options?.image_aspect_ratio,
                  },
                },
              },
            };

            return yield* sendMessage(pageId, messageRequest, pageAccessToken);
          }),

        /**
         * Sends a tagged message outside the standard messaging window.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param recipientId - The Page-scoped ID (PSID) of the recipient
         * @param message - The message content
         * @param tag - The message tag indicating the use case
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         *
         * @example
         * ```typescript
         * const response = yield* messaging.sendTaggedMessage(
         *   "page-id",
         *   "recipient-id",
         *   { text: "Your order has been confirmed" },
         *   MessageTag.CONFIRMED_EVENT_UPDATE
         * );
         * ```
         */
        sendTaggedMessage: (
          pageId: string,
          recipientId: string,
          message: MessageContent,
          tag: MessageTag,
          pageAccessToken?: string
        ) => {
          const messageRequest: SendMessageRequest = {
            recipient: { id: recipientId },
            messaging_type: MessagingType.MESSAGE_TAG,
            message,
            tag,
          };

          return sendMessage(pageId, messageRequest, pageAccessToken);
        },

        /**
         * Validates if a message can be sent within the standard messaging window.
         * Note: This is a helper method - actual validation should be done on your backend
         * based on the last interaction timestamp.
         *
         * @param lastInteractionTime - The timestamp of the last user interaction
         * @returns Effect containing boolean indicating if within 24-hour window
         *
         * @example
         * ```typescript
         * const isWithinWindow = yield* messaging.isWithinStandardMessagingWindow(
         *   new Date("2024-01-01T12:00:00Z")
         * );
         * ```
         */
        isWithinStandardMessagingWindow: (lastInteractionTime: Date) =>
          Effect.sync(() => {
            const now = new Date();
            const timeDifference =
              now.getTime() - lastInteractionTime.getTime();
            const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

            return timeDifference <= twentyFourHoursInMs;
          }),

        /**
         * Core method to send any type of message to Facebook Graph API.
         * Exposed for advanced use cases.
         *
         * @param pageId - The Facebook Page ID sending the message
         * @param messageRequest - The complete message request object
         * @param pageAccessToken - Optional page access token
         * @returns Effect containing SendMessageResponse or FacebookApiError
         */
        sendMessage,
      } as const;
    }),
    dependencies: [
      FetchHttpClient.layer,
      EnvService.Default,
      ButtonTemplateService.Default,
      QuickRepliesService.Default,
    ],
  }
) {}

// Live layer removed — use `MessagingService.Default` with test or prod layers as needed
