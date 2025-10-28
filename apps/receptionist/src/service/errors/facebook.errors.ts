import { Data } from "@celestial/effect";

/**
 * Error thrown when Facebook Graph API returns an error response.
 * Contains the HTTP status code, error message, and optional Facebook trace ID
 * for debugging purposes.
 */
export class FacebookApiError extends Data.TaggedError("FacebookApiError")<{
  readonly code: number;
  readonly message: string;
  readonly fbtraceId?: string;
}> {}
