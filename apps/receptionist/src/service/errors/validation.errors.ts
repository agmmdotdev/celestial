import { Data } from "@celestial/effect";

/**
 * Error thrown when input validation fails.
 * Used for validating user inputs, field lengths, and business rule constraints.
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}
