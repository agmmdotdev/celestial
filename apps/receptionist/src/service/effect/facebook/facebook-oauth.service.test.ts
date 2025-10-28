import { Effect, Layer } from "@celestial/effect";
import { HttpClient } from "@effect/platform";
import { describe, it, expect } from "vitest";
import { FacebookOAuthService, FacebookTokenResponse, FacebookErrorResponse } from "./facebook-oauth.service.js";
import { EnvService } from "../env.service.js";
import { FacebookApiError } from "../../errors/index.js";

// Create mock responses for different scenarios
const createMockSuccessTokenResponse = (): FacebookTokenResponse => ({
    access_token: "mock-long-lived-token",
    token_type: "bearer",
    expires_in: 5184000, // 60 days in seconds
});

const createMockErrorResponse = (): FacebookErrorResponse => ({
    error: {
        message: "Invalid OAuth access token",
        type: "OAuthException",
        code: 190,
        fbtrace_id: "mock-trace-id",
    },
});

// Mock HttpClient layer for successful token exchange
const MockHttpClientSuccess = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.HttpClient.of({
        execute: () => Effect.succeed({} as any),
        get: () => Effect.succeed({
            json: Effect.succeed(createMockSuccessTokenResponse()),
        } as any),
        head: () => Effect.succeed({} as any),
        post: () => Effect.succeed({} as any),
        patch: () => Effect.succeed({} as any),
        put: () => Effect.succeed({} as any),
        del: () => Effect.succeed({} as any),
        options: () => Effect.succeed({} as any),
    } as any)
);

// Mock HttpClient layer for error response
const MockHttpClientError = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.HttpClient.of({
        execute: () => Effect.succeed({} as any),
        get: () => Effect.succeed({
            json: Effect.succeed(createMockErrorResponse()),
        } as any),
        head: () => Effect.succeed({} as any),
        post: () => Effect.succeed({} as any),
        patch: () => Effect.succeed({} as any),
        put: () => Effect.succeed({} as any),
        del: () => Effect.succeed({} as any),
        options: () => Effect.succeed({} as any),
    } as any)
);

// Mock HttpClient layer for missing access_token
const MockHttpClientNoToken = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.HttpClient.of({
        execute: () => Effect.succeed({} as any),
        get: () => Effect.succeed({
            json: Effect.succeed({ token_type: "bearer" }),
        } as any),
        head: () => Effect.succeed({} as any),
        post: () => Effect.succeed({} as any),
        patch: () => Effect.succeed({} as any),
        put: () => Effect.succeed({} as any),
        del: () => Effect.succeed({} as any),
        options: () => Effect.succeed({} as any),
    } as any)
);

// Mock EnvService layer
const MockEnvService = Layer.succeed(
    EnvService,
    {
        getDatabaseUrl: () => Effect.succeed("mock-db-url"),
        getPort: () => Effect.succeed(3000),
        getCookieSecret: () => Effect.succeed("mock-secret"),
        getSuperadminUsername: () => Effect.succeed("admin"),
        getSuperadminPassword: () => Effect.succeed("password"),
        getGeminiApiKey: () => Effect.succeed("mock-api-key"),
        getMessengerVerifyToken: () => Effect.succeed("mock-verify-token"),
        getMessengerAppSecret: () => Effect.succeed("mock-app-secret"),
        getUserAccessToken: () => Effect.succeed("mock-access-token"),
        getChatBotAppId: () => Effect.succeed("mock-app-id"),
        getChatBotAppSecret: () => Effect.succeed("mock-bot-secret"),
        getChatBotAppAccessToken: () => Effect.succeed("mock-bot-token"),
    } as any
);

// Test layer with successful mock
const TestLayerSuccess = FacebookOAuthService.Default.pipe(
    Layer.provide(
        Layer.mergeAll(
            MockHttpClientSuccess,
            MockEnvService
        )
    )
);

// Test layer with error mock
const TestLayerError = FacebookOAuthService.Default.pipe(
    Layer.provide(
        Layer.mergeAll(
            MockHttpClientError,
            MockEnvService
        )
    )
);

// Test layer with no token mock
const TestLayerNoToken = FacebookOAuthService.Default.pipe(
    Layer.provide(
        Layer.mergeAll(
            MockHttpClientNoToken,
            MockEnvService
        )
    )
);

describe("FacebookOAuthService", () => {
    describe("exchangeShortLivedToken", () => {
        it("should exchange short-lived token for long-lived token successfully", async () => {
            const program = Effect.gen(function* () {
                const oauth = yield* FacebookOAuthService;
                return yield* oauth.exchangeShortLivedToken("short-lived-token");
            }).pipe(Effect.provide(TestLayerSuccess));

            const result = await Effect.runPromise(program);
            expect(result).toBe("mock-long-lived-token");
        });

        it("should fail with FacebookApiError when API returns error", async () => {
            const program = Effect.gen(function* () {
                const oauth = yield* FacebookOAuthService;
                return yield* oauth.exchangeShortLivedToken("invalid-token");
            }).pipe(Effect.provide(TestLayerError));

            const result = await Effect.runPromise(Effect.either(program));
            
            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                const error = result.left as FacebookApiError;
                expect(error._tag).toBe("FacebookApiError");
                expect(error.code).toBe(190);
                expect(error.message).toBe("Invalid OAuth access token");
                expect(error.fbtraceId).toBe("mock-trace-id");
            }
        });

        it("should fail when response has no access_token", async () => {
            const program = Effect.gen(function* () {
                const oauth = yield* FacebookOAuthService;
                return yield* oauth.exchangeShortLivedToken("short-lived-token");
            }).pipe(Effect.provide(TestLayerNoToken));

            const result = await Effect.runPromise(Effect.either(program));
            
            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                const error = result.left as FacebookApiError;
                expect(error._tag).toBe("FacebookApiError");
                expect(error.message).toBe("No access_token in response");
            }
        });
    });

    describe("refreshLongLivedToken", () => {
        it("should refresh long-lived token successfully", async () => {
            const program = Effect.gen(function* () {
                const oauth = yield* FacebookOAuthService;
                return yield* oauth.refreshLongLivedToken("existing-long-lived-token");
            }).pipe(Effect.provide(TestLayerSuccess));

            const result = await Effect.runPromise(program);
            expect(result).toBe("mock-long-lived-token");
        });

        it("should fail with FacebookApiError when API returns error", async () => {
            const program = Effect.gen(function* () {
                const oauth = yield* FacebookOAuthService;
                return yield* oauth.refreshLongLivedToken("invalid-token");
            }).pipe(Effect.provide(TestLayerError));

            const result = await Effect.runPromise(Effect.either(program));
            
            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                const error = result.left as FacebookApiError;
                expect(error._tag).toBe("FacebookApiError");
                expect(error.code).toBe(190);
                expect(error.message).toBe("Invalid OAuth access token");
            }
        });

        it("should fail when response has no access_token", async () => {
            const program = Effect.gen(function* () {
                const oauth = yield* FacebookOAuthService;
                return yield* oauth.refreshLongLivedToken("existing-long-lived-token");
            }).pipe(Effect.provide(TestLayerNoToken));

            const result = await Effect.runPromise(Effect.either(program));
            
            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                const error = result.left as FacebookApiError;
                expect(error._tag).toBe("FacebookApiError");
                expect(error.message).toBe("No access_token in response");
            }
        });
    });
});
