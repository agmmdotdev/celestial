import { Effect } from "@celestial/effect";
import { parseEnv, z, port } from "znv";
import { ConfigError } from "../errors/index.js";
import dotenv from "dotenv";

// Only load .env file if not in test environment
if (process.env.NODE_ENV !== "test") {
    dotenv.config();
}

// Environment configuration schema
const envSchema = {
    // Database configuration
    DATABASE_URL: z.string().url({
        message: "DATABASE_URL must be a valid PostgreSQL connection URL",
    }),

    // Server port
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    // Cookie secret for session management
    COOKIE_SECRET: z.string().min(16, {
        message: "COOKIE_SECRET must be at least 16 characters long",
    }),

    // Super admin credentials
    SUPERADMIN_USERNAME: z.string().min(1, {
        message: "SUPERADMIN_USERNAME is required",
    }),

    SUPERADMIN_PASSWORD: z.string().min(1, {
        message: "SUPERADMIN_PASSWORD is required",
    }),

    // Gemini AI API key
    GEMINI_API_KEY: z.string().min(1, {
        message: "GEMINI_API_KEY is required",
    }),

    // Messenger configuration
    MESSENGER_VERIFY_TOKEN: z.string().min(1, {
        message: "MESSENGER_VERIFY_TOKEN is required",
    }),

    MESSENGER_APP_SECRET: z.string().min(1, {
        message: "MESSENGER_APP_SECRET is required",
    }),

    // Facebook Graph API configuration
    USER_ACCESS_TOKEN: z.string().min(1, {
        message: "USER_ACCESS_TOKEN is required",
    }),
    CHAT_BOT_APP_ID: z.string().min(1, {
        message: "CHAT_BOT_APP_ID is required",
    }),
    CHAT_BOT_APP_SECRET: z.string().min(1, {
        message: "CHAT_BOT_APP_SECRET is required",
    }),
    CHAT_BOT_APP_ACCESS_TOKEN: z.string().min(1, {
        message: "CHAT_BOT_APP_ACCESS_TOKEN is required",
    }),
};

// Type definition for the parsed environment
export type EnvConfig = ReturnType<typeof parseEnv<typeof envSchema>>;

/**
 * Effect-based Environment Service
 * 
 * This service provides type-safe access to environment configuration with validation.
 * Environment variables are parsed and validated during service initialization.
 * 
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const envService = yield* EnvService;
 *   const dbUrl = yield* envService.getDatabaseUrl();
 *   console.log("Database URL:", dbUrl);
 * });
 * 
 * Effect.runPromise(program);
 * ```
 */
export class EnvService extends Effect.Service<EnvService>()("app/EnvService", {
    effect: Effect.gen(function* () {
        // Parse and validate environment variables
        const config = yield* Effect.try({
            try: () => parseEnv(process.env, envSchema),
            catch: (error) =>
                new ConfigError({
                    message: "Failed to parse environment variables",
                    cause: error,
                }),
        });

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
            getCookieSecret: () => Effect.succeed(config.COOKIE_SECRET),

            /**
             * Get superadmin username
             * @returns Effect containing the superadmin username
             */
            getSuperadminUsername: () => Effect.succeed(config.SUPERADMIN_USERNAME),

            /**
             * Get superadmin password
             * @returns Effect containing the superadmin password
             */
            getSuperadminPassword: () => Effect.succeed(config.SUPERADMIN_PASSWORD),

            /**
             * Get Gemini API key
             * @returns Effect containing the Gemini API key
             */
            getGeminiApiKey: () => Effect.succeed(config.GEMINI_API_KEY),

            /**
             * Get Messenger verify token
             * @returns Effect containing the Messenger verify token
             */
            getMessengerVerifyToken: () => Effect.succeed(config.MESSENGER_VERIFY_TOKEN),

            /**
             * Get Messenger app secret
             * @returns Effect containing the Messenger app secret
             */
            getMessengerAppSecret: () => Effect.succeed(config.MESSENGER_APP_SECRET),

            /**
             * Get user access token for Facebook Graph API
             * @returns Effect containing the user access token
             */
            getUserAccessToken: () => Effect.succeed(config.USER_ACCESS_TOKEN),

            /**
             * Get chatbot app ID
             * @returns Effect containing the chatbot app ID
             */
            getChatBotAppId: () => Effect.succeed(config.CHAT_BOT_APP_ID),

            /**
             * Get chatbot app secret
             * @returns Effect containing the chatbot app secret
             */
            getChatBotAppSecret: () => Effect.succeed(config.CHAT_BOT_APP_SECRET),

            /**
             * Get chatbot app access token
             * @returns Effect containing the chatbot app access token
             */
            getChatBotAppAccessToken: () => Effect.succeed(config.CHAT_BOT_APP_ACCESS_TOKEN),
        } as const;
    }),
}) { }
