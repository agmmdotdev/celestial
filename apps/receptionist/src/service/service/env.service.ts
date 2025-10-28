// znv re-exports zod as 'z' to save a few keystrokes.
import { Injectable } from "@nestjs/common";
import { parseEnv, z, port } from "znv";
import dotenv from "dotenv";

dotenv.config();
// Environment configuration schema
const envSchema = {
  // Database configuration
  DATABASE_URL: z.string().url({
    message: "DATABASE_URL must be a valid PostgreSQL connection URL",
  }),

  // Application environment
  // APP_ENV: z.enum(["dev", "production", "test", "staging"]).default("dev"),

  // Server port
  PORT: port().default(3000),

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
  // FACEBOOK_PAGE_ID: z.string().min(1, {
  //   message: "FACEBOOK_PAGE_ID is required",
  // }),
  // USER_ACCESS_TOKEN: z.string().min(1, {
  //   message: "USER_ACCESS_TOKEN is required",
  // }),

  // Facebook App credentials for OAuth
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

// Parse environment variables (for external use)
export const Env = (() => {
  try {
    return parseEnv(process.env, envSchema);
  } catch (error) {
    console.error("Error parsing environment variables:", error);

    // process.exit(1);
    throw error; // Re-throw the error to prevent application from running with invalid config
  }
})();

// Type definition for the parsed environment
export type EnvConfig = typeof Env;

/**
 * Environment Service for NestJS dependency injection
 * This service provides access to environment configuration with validation
 */
@Injectable()
export class EnvService {
  private readonly env: EnvConfig;

  constructor() {
    // Parse and validate environment variables on service instantiation
    this.env = parseEnv(process.env, envSchema);
  }

  /**
   * Get the entire environment configuration
   */
  getEnv(): EnvConfig {
    return this.env;
  }

  /**
   * Get database URL
   */
  getDatabaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  // /** * Get application environment
  //  */
  // getAppEnv(): string {
  //   return this.env.APP_ENV;
  // }

  /**
   * Get port number
   */
  getPort(): number {
    return this.env.PORT;
  }

  /**
   * Get cookie secret
   */
  getCookieSecret(): string {
    return this.env.COOKIE_SECRET;
  }

  /**
   * Get superadmin username
   */
  getSuperadminUsername(): string {
    return this.env.SUPERADMIN_USERNAME;
  }

  /**
   * Get superadmin password
   */
  getSuperadminPassword(): string {
    return this.env.SUPERADMIN_PASSWORD;
  }

  /**
   * Get Gemini API key
   */
  getGeminiApiKey(): string {
    return this.env.GEMINI_API_KEY;
  }

  /**
   * Get Messenger verify token
   */
  getMessengerVerifyToken(): string {
    return this.env.MESSENGER_VERIFY_TOKEN;
  }
  getUserAccessToken(): string {
    return this.env.USER_ACCESS_TOKEN;
  }
  /**
   * Get Messenger app secret
   */
  getMessengerAppSecret(): string {
    return this.env.MESSENGER_APP_SECRET;
  }
  getChatBotAppAccessToken(): string {
    return this.env.CHAT_BOT_APP_ACCESS_TOKEN;
  }
  /**
   * Get Facebook Page ID
   */
  // getFacebookPageId(): string {
  //   return this.env.FACEBOOK_PAGE_ID;
  // }

  // /**
  //  * Get Facebook Access Token
  //  */
  // getFacebookAccessToken(): string {
  //   return this.env.USER_ACCESS_TOKEN;
  // }

  /**
   * Get Facebook App ID
   */
  getChatBotAppId(): string {
    return this.env.CHAT_BOT_APP_ID;
  }

  /**
   * Get Facebook App Secret
   */
  getChatBotAppSecret(): string {
    return this.env.CHAT_BOT_APP_SECRET;
  }

  /**
   * Get a specific environment variable by key
   */
  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.env[key];
  }

  /**
   * Check if the application is running in production
   */
  // isProduction(): boolean {
  //   return this.env.APP_ENV === "production";
  // }

  /**
  //  * Check if the application is running in development
  //  */
  // isDevelopment(): boolean {
  //   return this.env.APP_ENV === "dev";
  // }

  /**
   * Check if the application is running in test mode
   */
  // isTest(): boolean {
  //   return this.env.APP_ENV === "test";
  // }

  /**
   * Check if the application is running in staging
   */
  // isStaging(): boolean {
  //   return this.env.APP_ENV === "staging";
  // }
}
