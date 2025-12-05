/**
 * Centralized error type definitions for Effect services.
 *
 * This module exports all custom error types used throughout the Effect service layer:
 * - ConfigError: Environment configuration and validation errors
 * - ValidationError: Input validation and business rule errors
 * - FacebookApiError: Facebook Graph API error responses
 *
 * HTTP errors are provided by @effect/platform's HttpClient:
 * - HttpClientError.RequestError: Network and request errors
 * - HttpClientError.ResponseError: HTTP response errors
 */

export * from "./config.errors.js";
export * from "./validation.errors.js";
export * from "./conversation-api.errors.js";
export * from "./messaging.errors.js";
export * from "./sender-action.errors.js";
export * from "./webhook.errors.js";
export * from "./facebook-oauth.errors.js";
export * from "./facebook.errors.js";
