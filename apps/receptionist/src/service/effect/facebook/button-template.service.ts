import { Effect } from "@celestial/effect";
import { ValidationError } from "../../errors/index.js";

/**
 * Button types supported by Facebook Messenger
 */
export enum ButtonType {
  WEB_URL = "web_url",
  POSTBACK = "postback",
  PHONE_NUMBER = "phone_number",
  ACCOUNT_LINK = "account_link",
  ACCOUNT_UNLINK = "account_unlink",
  GAME_PLAY = "game_play",
}

/**
 * Web URL button that opens a URL in a webview or browser
 */
export interface WebUrlButton {
  type: ButtonType.WEB_URL;
  title: string;
  url: string;
  webview_height_ratio?: "compact" | "tall" | "full";
  messenger_extensions?: boolean;
  fallback_url?: string;
  webview_share_button?: "hide";
}

/**
 * Postback button that sends a payload back to the webhook
 */
export interface PostbackButton {
  type: ButtonType.POSTBACK;
  title: string;
  payload: string;
}

/**
 * Phone number button that initiates a phone call
 */
export interface PhoneNumberButton {
  type: ButtonType.PHONE_NUMBER;
  title: string;
  payload: string; // Phone number in format +1234567890
}

/**
 * Account link button for account linking flow
 */
export interface AccountLinkButton {
  type: ButtonType.ACCOUNT_LINK;
  url: string;
}

/**
 * Account unlink button for account unlinking flow
 */
export interface AccountUnlinkButton {
  type: ButtonType.ACCOUNT_UNLINK;
}

/**
 * Game play button for Instant Games
 */
export interface GamePlayButton {
  type: ButtonType.GAME_PLAY;
  title: string;
  payload?: string;
  game_metadata?: {
    player_id?: string;
    context_id?: string;
  };
}

/**
 * Union type of all button types
 */
export type Button =
  | WebUrlButton
  | PostbackButton
  | PhoneNumberButton
  | AccountLinkButton
  | AccountUnlinkButton
  | GamePlayButton;

/**
 * Button template payload structure
 */
export interface ButtonTemplatePayload {
  template_type: "button";
  text: string;
  buttons: Button[];
}

/**
 * Effect-based Button Template Service
 * 
 * This service provides methods for creating Facebook Messenger button templates
 * with validation and type safety through Effect.
 * 
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const service = yield* ButtonTemplateService;
 *   const button = yield* service.createWebUrlButton("Visit", "https://example.com");
 *   const payload = yield* service.createButtonTemplatePayload("Choose an option", [button]);
 *   return payload;
 * });
 * ```
 */
export class ButtonTemplateService extends Effect.Service<ButtonTemplateService>()(
  "app/ButtonTemplateService",
  {
    effect: Effect.succeed({
      /**
       * Create a web URL button that opens a URL in a webview or browser
       * 
       * @param title - Button title (max 20 characters)
       * @param url - URL to open
       * @param options - Optional webview configuration
       * @returns Effect containing the WebUrlButton or ValidationError
       * 
       * @example
       * ```typescript
       * const button = yield* service.createWebUrlButton("Visit Site", "https://example.com");
       * ```
       */
      createWebUrlButton: (
        title: string,
        url: string,
        options?: {
          webview_height_ratio?: "compact" | "tall" | "full";
          messenger_extensions?: boolean;
          fallback_url?: string;
          webview_share_button?: "hide";
        }
      ) =>
        title.length > 20
          ? Effect.fail(
              new ValidationError({
                field: "title",
                message: "Button title must be 20 characters or less",
              })
            )
          : Effect.succeed({
              type: ButtonType.WEB_URL,
              title,
              url,
              ...options,
            } as WebUrlButton),

      /**
       * Create a postback button that sends a payload back to the webhook
       * 
       * @param title - Button title (max 20 characters)
       * @param payload - Payload to send (max 1000 characters)
       * @returns Effect containing the PostbackButton or ValidationError
       * 
       * @example
       * ```typescript
       * const button = yield* service.createPostbackButton("Get Started", "GET_STARTED");
       * ```
       */
      createPostbackButton: (title: string, payload: string) =>
        Effect.gen(function* () {
          if (title.length > 20) {
            return yield* Effect.fail(
              new ValidationError({
                field: "title",
                message: "Button title must be 20 characters or less",
              })
            );
          }
          if (payload.length > 1000) {
            return yield* Effect.fail(
              new ValidationError({
                field: "payload",
                message: "Button payload must be 1000 characters or less",
              })
            );
          }
          return {
            type: ButtonType.POSTBACK,
            title,
            payload,
          } as PostbackButton;
        }),

      /**
       * Create a phone number button that initiates a phone call
       * 
       * @param title - Button title (max 20 characters)
       * @param phoneNumber - Phone number with country code (must start with +)
       * @returns Effect containing the PhoneNumberButton or ValidationError
       * 
       * @example
       * ```typescript
       * const button = yield* service.createPhoneNumberButton("Call Us", "+1234567890");
       * ```
       */
      createPhoneNumberButton: (title: string, phoneNumber: string) =>
        Effect.gen(function* () {
          if (title.length > 20) {
            return yield* Effect.fail(
              new ValidationError({
                field: "title",
                message: "Button title must be 20 characters or less",
              })
            );
          }
          if (!phoneNumber.startsWith("+")) {
            return yield* Effect.fail(
              new ValidationError({
                field: "phoneNumber",
                message: "Phone number must start with + and include country code",
              })
            );
          }
          return {
            type: ButtonType.PHONE_NUMBER,
            title,
            payload: phoneNumber,
          } as PhoneNumberButton;
        }),

      /**
       * Create an account link button for account linking flow
       * 
       * @param url - Authorization URL for account linking
       * @returns Effect containing the AccountLinkButton
       * 
       * @example
       * ```typescript
       * const button = yield* service.createAccountLinkButton("https://example.com/auth");
       * ```
       */
      createAccountLinkButton: (url: string) =>
        Effect.succeed({
          type: ButtonType.ACCOUNT_LINK,
          url,
        } as AccountLinkButton),

      /**
       * Create an account unlink button for account unlinking flow
       * 
       * @returns Effect containing the AccountUnlinkButton
       * 
       * @example
       * ```typescript
       * const button = yield* service.createAccountUnlinkButton();
       * ```
       */
      createAccountUnlinkButton: () =>
        Effect.succeed({
          type: ButtonType.ACCOUNT_UNLINK,
        } as AccountUnlinkButton),

      /**
       * Create a game play button for Instant Games
       * 
       * @param title - Button title (max 20 characters)
       * @param payload - Optional game payload
       * @param gameMetadata - Optional game metadata
       * @returns Effect containing the GamePlayButton or ValidationError
       * 
       * @example
       * ```typescript
       * const button = yield* service.createGamePlayButton("Play Game", "level_1");
       * ```
       */
      createGamePlayButton: (
        title: string,
        payload?: string,
        gameMetadata?: {
          player_id?: string;
          context_id?: string;
        }
      ) =>
        title.length > 20
          ? Effect.fail(
              new ValidationError({
                field: "title",
                message: "Button title must be 20 characters or less",
              })
            )
          : Effect.succeed({
              type: ButtonType.GAME_PLAY,
              title,
              payload,
              game_metadata: gameMetadata,
            } as GamePlayButton),

      /**
       * Create a button template payload with validation
       * 
       * @param text - Template text (max 640 characters)
       * @param buttons - Array of buttons (1-3 buttons required)
       * @returns Effect containing the ButtonTemplatePayload or ValidationError
       * 
       * @example
       * ```typescript
       * const button1 = yield* service.createWebUrlButton("Visit", "https://example.com");
       * const button2 = yield* service.createPostbackButton("Get Started", "START");
       * const payload = yield* service.createButtonTemplatePayload("Choose an option", [button1, button2]);
       * ```
       */
      createButtonTemplatePayload: (text: string, buttons: Button[]) =>
        Effect.gen(function* () {
          if (!text || text.length === 0) {
            return yield* Effect.fail(
              new ValidationError({
                field: "text",
                message: "Text is required for button template message",
              })
            );
          }
          if (text.length > 640) {
            return yield* Effect.fail(
              new ValidationError({
                field: "text",
                message: "Text must be 640 characters or less",
              })
            );
          }
          if (buttons.length < 1) {
            return yield* Effect.fail(
              new ValidationError({
                field: "buttons",
                message: "At least one button is required",
              })
            );
          }
          if (buttons.length > 3) {
            return yield* Effect.fail(
              new ValidationError({
                field: "buttons",
                message: "Maximum of 3 buttons allowed per button template",
              })
            );
          }
          return {
            template_type: "button" as const,
            text,
            buttons,
          };
        }),
    } as const),
  }
) {}
