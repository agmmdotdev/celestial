import { Effect, Layer } from "@celestial/effect";
import { HttpClient } from "@effect/platform";
import { describe, it, expect } from "vitest";
import { WebhookService, PageWebhookFields } from "./webhook.service.js";
import { EnvService } from "../env.service.js";

// Create mock responses for different endpoints
const createMockPageDetailsResponse = () => ({
    json: Effect.succeed({
        id: "mock-page-id",
        name: "Mock Page Name",
        category: "Brand",
    }),
});

const createMockSubscriptionResponse = () => ({
    json: Effect.succeed({
        success: "true",
    }),
});

const createMockSubscribedAppsResponse = () => ({
    json: Effect.succeed({
        data: [
            {
                category: "Business",
                link: "https://example.com/app1",
                name: "Test App 1",
                id: "app-id-1",
            },
            {
                category: "Social",
                link: "https://example.com/app2",
                name: "Test App 2",
                id: "app-id-2",
            },
        ],
    }),
});

// Mock HttpClient layer
const MockHttpClient = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.HttpClient.of({
        execute: () => Effect.succeed({} as any),
        get: () => Effect.succeed(createMockPageDetailsResponse() as any),
        head: () => Effect.succeed(createMockPageDetailsResponse() as any),
        post: () => Effect.succeed(createMockSubscriptionResponse() as any),
        patch: () => Effect.succeed(createMockSubscriptionResponse() as any),
        put: () => Effect.succeed(createMockSubscriptionResponse() as any),
        del: () => Effect.succeed(createMockSubscriptionResponse() as any),
        options: () => Effect.succeed(createMockSubscriptionResponse() as any),
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

// Test layer with mocks
const TestLayer = WebhookService.Default.pipe(
    Layer.provide(
        Layer.mergeAll(
            MockHttpClient,
            MockEnvService
        )
    )
);

describe("WebhookService", () => {
    describe("getPageDetails", () => {
        it("should fetch page details successfully", async () => {
            const program = Effect.gen(function* () {
                const webhook = yield* WebhookService;
                return yield* webhook.getPageDetails("test-page-id");
            }).pipe(Effect.provide(TestLayer));

            const result = await Effect.runPromise(program);
            expect(result.id).toBe("mock-page-id");
            expect(result.name).toBe("Mock Page Name");
            expect(result.category).toBe("Brand");
        });

        it("should fetch page details with custom access token", async () => {
            const program = Effect.gen(function* () {
                const webhook = yield* WebhookService;
                return yield* webhook.getPageDetails(
                    "test-page-id",
                    "custom-access-token"
                );
            }).pipe(Effect.provide(TestLayer));

            const result = await Effect.runPromise(program);
            expect(result.id).toBe("mock-page-id");
        });
    });

    describe("subscribePageToWebhooks", () => {
        it("should subscribe page to webhooks with default fields", async () => {
            const program = Effect.gen(function* () {
                const webhook = yield* WebhookService;
                return yield* webhook.subscribePageToWebhooks("test-page-id");
            }).pipe(Effect.provide(TestLayer));

            const result = await Effect.runPromise(program);
            expect(result.success).toBe("true");
        });

        it("should subscribe page to webhooks with custom fields", async () => {
            const program = Effect.gen(function* () {
                const webhook = yield* WebhookService;
                return yield* webhook.subscribePageToWebhooks(
                    "test-page-id",
                    [PageWebhookFields.MESSAGES, PageWebhookFields.FEED]
                );
            }).pipe(Effect.provide(TestLayer));

            const result = await Effect.runPromise(program);
            expect(result.success).toBe("true");
        });

        it("should subscribe page to webhooks with custom access token", async () => {
            const program = Effect.gen(function* () {
                const webhook = yield* WebhookService;
                return yield* webhook.subscribePageToWebhooks(
                    "test-page-id",
                    [PageWebhookFields.MESSAGES],
                    "custom-access-token"
                );
            }).pipe(Effect.provide(TestLayer));

            const result = await Effect.runPromise(program);
            expect(result.success).toBe("true");
        });
    });

    describe("getSubscribedApps", () => {
        it("should get subscribed apps successfully", async () => {
            // Create a custom mock for this test
            const MockHttpClientForApps = Layer.succeed(
                HttpClient.HttpClient,
                HttpClient.HttpClient.of({
                    execute: () => Effect.succeed({} as any),
                    get: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    head: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    post: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    patch: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    put: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    del: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    options: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                } as any)
            );

            const TestLayerForApps = WebhookService.Default.pipe(
                Layer.provide(
                    Layer.mergeAll(
                        MockHttpClientForApps,
                        MockEnvService
                    )
                )
            );

            const program = Effect.gen(function* () {
                const webhook = yield* WebhookService;
                return yield* webhook.getSubscribedApps("test-page-id");
            }).pipe(Effect.provide(TestLayerForApps));

            const result = await Effect.runPromise(program);
            expect(result.data).toHaveLength(2);
            expect(result.data[0].name).toBe("Test App 1");
            expect(result.data[1].name).toBe("Test App 2");
        });

        it("should get subscribed apps with custom access token", async () => {
            const MockHttpClientForApps = Layer.succeed(
                HttpClient.HttpClient,
                HttpClient.HttpClient.of({
                    execute: () => Effect.succeed({} as any),
                    get: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    head: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    post: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    patch: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    put: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    del: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                    options: () => Effect.succeed(createMockSubscribedAppsResponse() as any),
                } as any)
            );

            const TestLayerForApps = WebhookService.Default.pipe(
                Layer.provide(
                    Layer.mergeAll(
                        MockHttpClientForApps,
                        MockEnvService
                    )
                )
            );

            const program = Effect.gen(function* () {
                const webhook = yield* WebhookService;
                return yield* webhook.getSubscribedApps(
                    "test-page-id",
                    "custom-access-token"
                );
            }).pipe(Effect.provide(TestLayerForApps));

            const result = await Effect.runPromise(program);
            expect(result.data).toHaveLength(2);
        });
    });
});
