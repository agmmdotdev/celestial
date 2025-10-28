import { Effect } from "@celestial/effect";
import { ValidationError } from "../../errors/index.js";

/**
 * Quick Reply Content Types
 */
export enum QuickReplyContentType {
  TEXT = "text",
  USER_PHONE_NUMBER = "user_phone_number",
  USER_EMAIL = "user_email",
}

/**
 * Base Quick Reply interface
 */
export interface BaseQuickReply {
  content_type: QuickReplyContentType;
}

/**
 * Text Quick Reply interface
 */
export interface TextQuickReply extends BaseQuickReply {
  content_type: QuickReplyContentType.TEXT;
  title: string; // Required for text quick replies, max 20 characters
  payload?: string; // Optional developer-defined payload, max 1000 characters
  image_url?: string; // Optional image URL for icon beside title
}

/**
 * User Phone Number Quick Reply interface
 */
export interface UserPhoneNumberQuickReply extends BaseQuickReply {
  content_type: QuickReplyContentType.USER_PHONE_NUMBER;
}

/**
 * User Email Quick Reply interface
 */
export interface UserEmailQuickReply extends BaseQuickReply {
  content_type: QuickReplyContentType.USER_EMAIL;
}

/**
 * Union type for all quick reply types
 */
export type QuickReply =
  | TextQuickReply
  | UserPhoneNumberQuickReply
  | UserEmailQuickReply;

/**
 * Message with Quick Replies interface
 */
export interface MessageWithQuickReplies {
  text: string;
  quick_replies: QuickReply[];
}

/**
 * Quick Reply Response from webhook
 */
export interface QuickReplyResponse {
  payload: string;
}

/**
 * Effect-based Quick Replies Service
 * 
 * This service provides methods for creating Facebook Messenger quick replies
 * with validation and type safety through Effect.
 * 
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const service = yield* QuickRepliesService;
 *   const quickReply = yield* service.createTextQuickReply("Yes", "YES_PAYLOAD");
 *   const message = yield* service.createQuickReplyMessage("Do you agree?", [quickReply]);
 *   return message;
 * });
 * ```
 */
export class QuickRepliesService extends Effect.Service<QuickRepliesService>()(
  "app/QuickRepliesService",
  {
    effect: Effect.succeed({
      /**
       * Create a text quick reply button.
       * 
       * @param title - The button text (max 20 characters)
       * @param payload - Optional developer-defined payload (max 1000 characters)
       * @param imageUrl - Optional image URL for icon beside title
       * @returns Effect containing the TextQuickReply or ValidationError
       * 
       * @example
       * ```typescript
       * const quickReply = yield* service.createTextQuickReply("Yes", "YES_PAYLOAD");
       * ```
       */
      createTextQuickReply: (
        title: string,
        payload?: string,
        imageUrl?: string
      ) =>
        Effect.gen(function* () {
          // Validate title
          if (!title || title.trim().length === 0) {
            return yield* Effect.fail(
              new ValidationError({
                field: "title",
                message: "Title is required for text quick replies",
              })
            );
          }
          if (title.length > 20) {
            return yield* Effect.fail(
              new ValidationError({
                field: "title",
                message: "Quick reply title must be 20 characters or less",
              })
            );
          }

          // Validate payload if provided
          if (payload && payload.length > 1000) {
            return yield* Effect.fail(
              new ValidationError({
                field: "payload",
                message: "Quick reply payload must be 1000 characters or less",
              })
            );
          }

          const quickReply: TextQuickReply = {
            content_type: QuickReplyContentType.TEXT,
            title: title.trim(),
          };

          if (payload) {
            quickReply.payload = payload;
          }

          if (imageUrl) {
            quickReply.image_url = imageUrl;
          }

          return quickReply;
        }),

      /**
       * Create a user phone number quick reply.
       * This will automatically pre-fill with the user's phone number from their profile.
       * 
       * @returns Effect containing the UserPhoneNumberQuickReply
       * 
       * @example
       * ```typescript
       * const quickReply = yield* service.createUserPhoneNumberQuickReply();
       * ```
       */
      createUserPhoneNumberQuickReply: () =>
        Effect.succeed({
          content_type: QuickReplyContentType.USER_PHONE_NUMBER,
        } as UserPhoneNumberQuickReply),

      /**
       * Create a user email quick reply.
       * This will automatically pre-fill with the user's email from their profile.
       * 
       * @returns Effect containing the UserEmailQuickReply
       * 
       * @example
       * ```typescript
       * const quickReply = yield* service.createUserEmailQuickReply();
       * ```
       */
      createUserEmailQuickReply: () =>
        Effect.succeed({
          content_type: QuickReplyContentType.USER_EMAIL,
        } as UserEmailQuickReply),

      /**
       * Create multiple text quick replies from an array of options.
       * 
       * @param options - Array of text options with optional payloads and images
       * @returns Effect containing array of TextQuickReply or ValidationError
       * 
       * @example
       * ```typescript
       * const quickReplies = yield* service.createTextQuickReplies([
       *   { title: "Yes", payload: "YES" },
       *   { title: "No", payload: "NO" }
       * ]);
       * ```
       */
      createTextQuickReplies: (
        options: Array<{
          title: string;
          payload?: string;
          imageUrl?: string;
        }>
      ) =>
        Effect.gen(function* () {
          if (options.length > 13) {
            return yield* Effect.fail(
              new ValidationError({
                field: "options",
                message: "Maximum of 13 quick replies allowed",
              })
            );
          }

          const quickReplies: TextQuickReply[] = [];
          for (const option of options) {
            const quickReply = yield* Effect.gen(function* () {
              const service = yield* QuickRepliesService;
              return yield* service.createTextQuickReply(
                option.title,
                option.payload,
                option.imageUrl
              );
            });
            quickReplies.push(quickReply);
          }

          return quickReplies;
        }),

      /**
       * Create a message with quick replies.
       * 
       * @param text - The message text
       * @param quickReplies - Array of quick reply objects (max 13)
       * @returns Effect containing MessageWithQuickReplies or ValidationError
       * 
       * @example
       * ```typescript
       * const message = yield* service.createQuickReplyMessage("Choose an option", quickReplies);
       * ```
       */
      createQuickReplyMessage: (text: string, quickReplies: QuickReply[]) =>
        Effect.gen(function* () {
          if (!text || text.trim().length === 0) {
            return yield* Effect.fail(
              new ValidationError({
                field: "text",
                message: "Text is required for quick reply message",
              })
            );
          }

          if (!quickReplies || quickReplies.length === 0) {
            return yield* Effect.fail(
              new ValidationError({
                field: "quick_replies",
                message: "At least one quick reply is required",
              })
            );
          }

          if (quickReplies.length > 13) {
            return yield* Effect.fail(
              new ValidationError({
                field: "quick_replies",
                message: "Maximum of 13 quick replies allowed",
              })
            );
          }

          // Validate each text quick reply has a title
          for (let i = 0; i < quickReplies.length; i++) {
            const quickReply = quickReplies[i];
            if (
              quickReply.content_type === QuickReplyContentType.TEXT &&
              !(quickReply as TextQuickReply).title
            ) {
              return yield* Effect.fail(
                new ValidationError({
                  field: `quick_replies[${i}]`,
                  message: `Quick reply at index ${i} is missing required title`,
                })
              );
            }
          }

          return {
            text: text.trim(),
            quick_replies: quickReplies,
          };
        }),

      /**
       * Create a quick reply message for yes/no questions.
       * 
       * @param text - The question text
       * @param yesPayload - Optional payload for yes button (defaults to "YES")
       * @param noPayload - Optional payload for no button (defaults to "NO")
       * @returns Effect containing MessageWithQuickReplies or ValidationError
       * 
       * @example
       * ```typescript
       * const message = yield* service.createYesNoQuickReplyMessage("Do you agree?");
       * ```
       */
      createYesNoQuickReplyMessage: (
        text: string,
        yesPayload?: string,
        noPayload?: string
      ) =>
        Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const yesReply = yield* service.createTextQuickReply(
            "Yes",
            yesPayload || "YES"
          );
          const noReply = yield* service.createTextQuickReply(
            "No",
            noPayload || "NO"
          );
          return yield* service.createQuickReplyMessage(text, [
            yesReply,
            noReply,
          ]);
        }),

      /**
       * Create a quick reply message for rating/feedback (1-5 stars).
       * 
       * @param text - The message text
       * @param useStarEmojis - Whether to use star emojis in titles (defaults to true)
       * @returns Effect containing MessageWithQuickReplies or ValidationError
       * 
       * @example
       * ```typescript
       * const message = yield* service.createRatingQuickReplyMessage("Rate your experience");
       * ```
       */
      createRatingQuickReplyMessage: (
        text: string,
        useStarEmojis: boolean = true
      ) =>
        Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const ratings = [1, 2, 3, 4, 5];
          const quickReplies: TextQuickReply[] = [];

          for (const rating of ratings) {
            const title = useStarEmojis
              ? "⭐".repeat(rating)
              : `${rating} Star${rating > 1 ? "s" : ""}`;
            const quickReply = yield* service.createTextQuickReply(
              title,
              `RATING_${rating}`
            );
            quickReplies.push(quickReply);
          }

          return yield* service.createQuickReplyMessage(text, quickReplies);
        }),

      /**
       * Create a quick reply message for multiple choice questions.
       * 
       * @param text - The question text
       * @param choices - Array of choice options
       * @returns Effect containing MessageWithQuickReplies or ValidationError
       * 
       * @example
       * ```typescript
       * const message = yield* service.createMultipleChoiceQuickReplyMessage(
       *   "What's your favorite color?",
       *   [
       *     { label: "Red", value: "RED" },
       *     { label: "Blue", value: "BLUE" }
       *   ]
       * );
       * ```
       */
      createMultipleChoiceQuickReplyMessage: (
        text: string,
        choices: Array<{
          label: string;
          value: string;
          imageUrl?: string;
        }>
      ) =>
        Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const quickReplies: TextQuickReply[] = [];

          for (const choice of choices) {
            const quickReply = yield* service.createTextQuickReply(
              choice.label,
              choice.value,
              choice.imageUrl
            );
            quickReplies.push(quickReply);
          }

          return yield* service.createQuickReplyMessage(text, quickReplies);
        }),

      /**
       * Create a quick reply message for collecting contact information.
       * 
       * @param text - The message text
       * @param includePhone - Whether to include phone number quick reply (defaults to true)
       * @param includeEmail - Whether to include email quick reply (defaults to true)
       * @param additionalOptions - Optional additional text quick replies
       * @returns Effect containing MessageWithQuickReplies or ValidationError
       * 
       * @example
       * ```typescript
       * const message = yield* service.createContactQuickReplyMessage(
       *   "How can we contact you?",
       *   true,
       *   true,
       *   [{ title: "Skip", payload: "SKIP" }]
       * );
       * ```
       */
      createContactQuickReplyMessage: (
        text: string,
        includePhone: boolean = true,
        includeEmail: boolean = true,
        additionalOptions?: Array<{
          title: string;
          payload?: string;
          imageUrl?: string;
        }>
      ) =>
        Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const quickReplies: QuickReply[] = [];

          if (includePhone) {
            const phoneReply = yield* service.createUserPhoneNumberQuickReply();
            quickReplies.push(phoneReply);
          }

          if (includeEmail) {
            const emailReply = yield* service.createUserEmailQuickReply();
            quickReplies.push(emailReply);
          }

          if (additionalOptions) {
            const textQuickReplies = yield* service.createTextQuickReplies(
              additionalOptions
            );
            quickReplies.push(...textQuickReplies);
          }

          return yield* service.createQuickReplyMessage(text, quickReplies);
        }),

      /**
       * Check if a quick reply response is from a text quick reply.
       * 
       * @param quickReplyResponse - The quick reply response from webhook
       * @returns Effect containing boolean indicating if it's a text quick reply response
       * 
       * @example
       * ```typescript
       * const isText = yield* service.isTextQuickReplyResponse(response);
       * ```
       */
      isTextQuickReplyResponse: (quickReplyResponse: QuickReplyResponse) =>
        Effect.sync(() => {
          const payload = quickReplyResponse.payload;

          // Phone numbers typically start with + or contain only digits and common phone characters
          const phonePattern = /^[\+]?[0-9\-\(\)\s]+$/;

          // Email pattern
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          return !phonePattern.test(payload) && !emailPattern.test(payload);
        }),

      /**
       * Check if a quick reply response is from a phone number quick reply.
       * 
       * @param quickReplyResponse - The quick reply response from webhook
       * @returns Effect containing boolean indicating if it's a phone number quick reply response
       * 
       * @example
       * ```typescript
       * const isPhone = yield* service.isPhoneNumberQuickReplyResponse(response);
       * ```
       */
      isPhoneNumberQuickReplyResponse: (
        quickReplyResponse: QuickReplyResponse
      ) =>
        Effect.sync(() => {
          const payload = quickReplyResponse.payload;
          const phonePattern = /^[\+]?[0-9\-\(\)\s]+$/;
          return phonePattern.test(payload);
        }),

      /**
       * Check if a quick reply response is from an email quick reply.
       * 
       * @param quickReplyResponse - The quick reply response from webhook
       * @returns Effect containing boolean indicating if it's an email quick reply response
       * 
       * @example
       * ```typescript
       * const isEmail = yield* service.isEmailQuickReplyResponse(response);
       * ```
       */
      isEmailQuickReplyResponse: (quickReplyResponse: QuickReplyResponse) =>
        Effect.sync(() => {
          const payload = quickReplyResponse.payload;
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailPattern.test(payload);
        }),

      /**
       * Extract the phone number from a phone number quick reply response.
       * 
       * @param quickReplyResponse - The quick reply response from webhook
       * @returns Effect containing the phone number or null if not a valid phone response
       * 
       * @example
       * ```typescript
       * const phoneNumber = yield* service.extractPhoneNumber(response);
       * ```
       */
      extractPhoneNumber: (quickReplyResponse: QuickReplyResponse) =>
        Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const isPhone = yield* service.isPhoneNumberQuickReplyResponse(
            quickReplyResponse
          );
          return isPhone ? quickReplyResponse.payload : null;
        }),

      /**
       * Extract the email address from an email quick reply response.
       * 
       * @param quickReplyResponse - The quick reply response from webhook
       * @returns Effect containing the email address or null if not a valid email response
       * 
       * @example
       * ```typescript
       * const email = yield* service.extractEmail(response);
       * ```
       */
      extractEmail: (quickReplyResponse: QuickReplyResponse) =>
        Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const isEmail = yield* service.isEmailQuickReplyResponse(
            quickReplyResponse
          );
          return isEmail ? quickReplyResponse.payload : null;
        }),

      /**
       * Get the custom payload from a text quick reply response.
       * 
       * @param quickReplyResponse - The quick reply response from webhook
       * @returns Effect containing the custom payload or null if not a text quick reply
       * 
       * @example
       * ```typescript
       * const payload = yield* service.getTextQuickReplyPayload(response);
       * ```
       */
      getTextQuickReplyPayload: (quickReplyResponse: QuickReplyResponse) =>
        Effect.gen(function* () {
          const service = yield* QuickRepliesService;
          const isText = yield* service.isTextQuickReplyResponse(
            quickReplyResponse
          );
          return isText ? quickReplyResponse.payload : null;
        }),
    } as const),
  }
) {}
