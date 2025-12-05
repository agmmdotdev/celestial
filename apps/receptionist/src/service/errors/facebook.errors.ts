import { Data } from "@celestial/effect";
import { ConversationApiErrorMessage } from "./conversation-api.errors.js";
import { MessagingErrorMessage } from "./messaging.errors.js";
import { SenderActionErrorMessage } from "./sender-action.errors.js";
import { WebhookErrorMessage } from "./webhook.errors.js";
import { FacebookOAuthErrorMessage } from "./facebook-oauth.errors.js";

export enum FacebookCommonErrorMessage {
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export type FacebookApiErrorMessage =
  | FacebookCommonErrorMessage
  | ConversationApiErrorMessage
  | MessagingErrorMessage
  | SenderActionErrorMessage
  | WebhookErrorMessage
  | FacebookOAuthErrorMessage;

/**
 * Error thrown when Facebook Graph API returns an error response.
 * Contains the HTTP status code, normalized error message, and optional details.
 */
export class FacebookApiError extends Data.TaggedError("FacebookApiError")<{
  readonly code: number;
  readonly message: FacebookApiErrorMessage;
  readonly details?: string;
  readonly fbtraceId?: string;
}> {}

export const toFacebookErrorDetail = (reason: unknown): string =>
  reason instanceof Error ? reason.message : String(reason);
