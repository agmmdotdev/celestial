import { Data } from "@celestial/effect";

/**
 * Error thrown when environment configuration is invalid or missing required values.
 * This error occurs during service initialization when environment variables
 * cannot be parsed or validated.
 */
export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
