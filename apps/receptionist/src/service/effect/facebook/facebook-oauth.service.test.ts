import { Effect, Layer } from "@celestial/effect";
import { describe, it, expect } from "vitest";
import { FacebookOAuthService } from "./facebook-oauth.service.js";
import {
  FacebookApiError,
  FacebookOAuthErrorMessage,
} from "../../errors/index.js";
import { createMockHttpClient, MockEnvService } from "./test-utils.js";

// Create mock responses for different scenarios
const createMockSuccessTokenResponse = () => ({
  access_token: "mock-long-lived-token",
  token_type: "bearer",
  expires_in: 5184000, // 60 days in seconds
});

const createMockErrorResponse = () => ({
  error: {
    message: "Invalid OAuth access token",
    type: "OAuthException",
    code: 190,
    fbtrace_id: "mock-trace-id",
  },
});

// Mock HttpClient layer for successful token exchange
const MockHttpClientSuccess = createMockHttpClient(() => ({
  body: createMockSuccessTokenResponse(),
}));

// Mock HttpClient layer for error response
const MockHttpClientError = createMockHttpClient(() => ({
  body: createMockErrorResponse(),
}));

// Mock HttpClient layer for missing access_token
const MockHttpClientNoToken = createMockHttpClient(() => ({
  body: { token_type: "bearer" },
}));

// Test layer with successful mock
const TestLayerSuccess = FacebookOAuthService.DefaultWithoutDependencies.pipe(
  Layer.provide(Layer.mergeAll(MockHttpClientSuccess, MockEnvService))
);

// Test layer with error mock
const TestLayerError = FacebookOAuthService.DefaultWithoutDependencies.pipe(
  Layer.provide(Layer.mergeAll(MockHttpClientError, MockEnvService))
);

// Test layer with no token mock
const TestLayerNoToken = FacebookOAuthService.DefaultWithoutDependencies.pipe(
  Layer.provide(Layer.mergeAll(MockHttpClientNoToken, MockEnvService))
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
        expect(error.message).toBe(FacebookOAuthErrorMessage.GRAPH_API_ERROR);
        expect(error.details).toBe(
          "OAuthException: Invalid OAuth access token"
        );
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
        expect(error.message).toBe(
          FacebookOAuthErrorMessage.ACCESS_TOKEN_MISSING
        );
        expect(error.details).toBe(
          "Failed to exchange short-lived token: access_token missing in response"
        );
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
        expect(error.message).toBe(FacebookOAuthErrorMessage.GRAPH_API_ERROR);
        expect(error.details).toBe(
          "OAuthException: Invalid OAuth access token"
        );
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
        expect(error.message).toBe(
          FacebookOAuthErrorMessage.ACCESS_TOKEN_MISSING
        );
        expect(error.details).toBe(
          "Failed to refresh long-lived token: access_token missing in response"
        );
      }
    });
  });
});
