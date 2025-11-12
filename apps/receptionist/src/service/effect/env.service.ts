import {
  Effect,
  Config,
  ConfigProvider,
  Layer,
  Redacted,
} from "@celestial/effect";
import { ConfigError } from "../errors/index.js";
import dotenv from "dotenv";

// Environment configuration schema using Effect-TS Config
interface EnvConfig {
  readonly DATABASE_URL: string;
  readonly PORT: number;
  readonly COOKIE_SECRET: Redacted.Redacted<string>;
  readonly SUPERADMIN_USERNAME: string;
  readonly SUPERADMIN_PASSWORD: Redacted.Redacted<string>;
  readonly GEMINI_API_KEY: Redacted.Redacted<string>;
  readonly MESSENGER_VERIFY_TOKEN: string;
  readonly MESSENGER_APP_SECRET: Redacted.Redacted<string>;
  readonly USER_ACCESS_TOKEN: Redacted.Redacted<string>;
  readonly CHAT_BOT_APP_ID: string;
  readonly CHAT_BOT_APP_SECRET: Redacted.Redacted<string>;
  readonly CHAT_BOT_APP_ACCESS_TOKEN: Redacted.Redacted<string>;
}

const envConfig: Config.Config<EnvConfig> = Config.all({
  DATABASE_URL: Config.string("DATABASE_URL").pipe(
    Config.withDescription("PostgreSQL connection URL")
  ),
  PORT: Config.integer("PORT").pipe(
    Config.withDefault(3000),
    Config.withDescription("Server port number")
  ),
  COOKIE_SECRET: Config.redacted(Config.string("COOKIE_SECRET")).pipe(
    Config.withDescription("Cookie secret for session management")
  ),
  SUPERADMIN_USERNAME: Config.string("SUPERADMIN_USERNAME").pipe(
    Config.withDescription("Super admin username")
  ),
  SUPERADMIN_PASSWORD: Config.redacted(
    Config.string("SUPERADMIN_PASSWORD")
  ).pipe(Config.withDescription("Super admin password")),
  GEMINI_API_KEY: Config.redacted(Config.string("GEMINI_API_KEY")).pipe(
    Config.withDescription("Gemini AI API key")
  ),
  MESSENGER_VERIFY_TOKEN: Config.string("MESSENGER_VERIFY_TOKEN").pipe(
    Config.withDescription("Messenger verify token")
  ),
  MESSENGER_APP_SECRET: Config.redacted(
    Config.string("MESSENGER_APP_SECRET")
  ).pipe(Config.withDescription("Messenger app secret")),
  USER_ACCESS_TOKEN: Config.redacted(Config.string("USER_ACCESS_TOKEN")).pipe(
    Config.withDescription("User access token for Facebook Graph API")
  ),
  CHAT_BOT_APP_ID: Config.string("CHAT_BOT_APP_ID").pipe(
    Config.withDescription("Chatbot app ID")
  ),
  CHAT_BOT_APP_SECRET: Config.redacted(
    Config.string("CHAT_BOT_APP_SECRET")
  ).pipe(Config.withDescription("Chatbot app secret")),
  CHAT_BOT_APP_ACCESS_TOKEN: Config.redacted(
    Config.string("CHAT_BOT_APP_ACCESS_TOKEN")
  ).pipe(Config.withDescription("Chatbot app access token")),
});

// Load .env file if not in test environment
// ConfigProvider.fromEnv() reads from process.env, so we need to load .env first
if (process.env.NODE_ENV !== "test") {
  dotenv.config();
}

// Configuration provider layer that reads from environment variables
// In test mode, environment variables are set by the test setup file
// In production, dotenv.config() loads them from .env file above
const configProviderLayer = Layer.succeed(
  ConfigProvider.ConfigProvider,
  ConfigProvider.fromEnv()
);

/**
 * Effect-based Environment Service
 *
 * This service provides type-safe access to environment configuration with validation.
 * Environment variables are parsed and validated using Effect-TS Config system.
 * Sensitive values (secrets, API keys, passwords) are automatically redacted in logs.
 *
 * @example
 * ```typescript
 * import { EnvServiceLive } from "./env.service.js";
 *
 * const program = Effect.gen(function* () {
 *   const envService = yield* EnvService;
 *   const dbUrl = yield* envService.getDatabaseUrl();
 *   console.log("Database URL:", dbUrl);
 * });
 *
 * Effect.runPromise(program.pipe(Effect.provide(EnvServiceLive)));
 * ```
 */
export class EnvService extends Effect.Service<EnvService>()("app/EnvService", {
  effect: Effect.gen(function* () {
    // Load and validate environment configuration
    const config = yield* envConfig.pipe(
      Effect.mapError(
        (error) =>
          new ConfigError({
            message: "Failed to parse environment variables",
            cause: error,
          })
      )
    );

    return {
      /**
       * Get database URL
       * @returns Effect containing the database connection URL
       */
      getDatabaseUrl: () => Effect.succeed(config.DATABASE_URL),

      /**
       * Get server port number
       * @returns Effect containing the port number
       */
      getPort: () => Effect.succeed(config.PORT),

      /**
       * Get cookie secret for session management
       * @returns Effect containing the cookie secret
       */
      getCookieSecret: () =>
        Effect.succeed(Redacted.value(config.COOKIE_SECRET)),

      /**
       * Get superadmin username
       * @returns Effect containing the superadmin username
       */
      getSuperadminUsername: () => Effect.succeed(config.SUPERADMIN_USERNAME),

      /**
       * Get superadmin password
       * @returns Effect containing the superadmin password
       */
      getSuperadminPassword: () =>
        Effect.succeed(Redacted.value(config.SUPERADMIN_PASSWORD)),

      /**
       * Get Gemini API key
       * @returns Effect containing the Gemini API key
       */
      getGeminiApiKey: () =>
        Effect.succeed(Redacted.value(config.GEMINI_API_KEY)),

      /**
       * Get Messenger verify token
       * @returns Effect containing the Messenger verify token
       */
      getMessengerVerifyToken: () =>
        Effect.succeed(config.MESSENGER_VERIFY_TOKEN),

      /**
       * Get Messenger app secret
       * @returns Effect containing the Messenger app secret
       */
      getMessengerAppSecret: () =>
        Effect.succeed(Redacted.value(config.MESSENGER_APP_SECRET)),

      /**
       * Get user access token for Facebook Graph API
       * @returns Effect containing the user access token
       */
      getUserAccessToken: () =>
        Effect.succeed(Redacted.value(config.USER_ACCESS_TOKEN)),

      /**
       * Get chatbot app ID
       * @returns Effect containing the chatbot app ID
       */
      getChatBotAppId: () => Effect.succeed(config.CHAT_BOT_APP_ID),

      /**
       * Get chatbot app secret
       * @returns Effect containing the chatbot app secret
       */
      getChatBotAppSecret: () =>
        Effect.succeed(Redacted.value(config.CHAT_BOT_APP_SECRET)),

      /**
       * Get chatbot app access token
       * @returns Effect containing the chatbot app access token
       */
      getChatBotAppAccessToken: () =>
        Effect.succeed(Redacted.value(config.CHAT_BOT_APP_ACCESS_TOKEN)),
    } as const;
  }),
  dependencies: [configProviderLayer],
}) {}

// Default layer that includes the config provider
// This ensures EnvService.Default works out of the box
export const EnvServiceLive = EnvService.Default;

// `EnvService.Default` already includes the config provider dependencies.
// `EnvServiceLive` is exported for backward compatibility with existing imports.
