import type { ErrorDetailsFor, KontentSdkError } from "./error.models.js";
import type { LiteralUnion, PickStringLiteral } from "./utility.models.js";

/**
 * SDK info for identification of the SDK
 */
export type SDKInfo = {
	/**
	 * The name of the SDK.
	 */
	readonly name: string;

	/**
	 * The version of the SDK.
	 */
	readonly version: string;

	/**
	 * The host of the SDK.
	 */
	readonly host: LiteralUnion<"npmjs.com">;
};

export type CommonHeaderNames = "Retry-After" | "X-KC-SDKID" | "Authorization" | "Content-Type" | "Content-Length" | "X-Continuation";

export type ContinuationHeaderName = PickStringLiteral<CommonHeaderNames, "X-Continuation">;

export type Header = {
	readonly name: string;
	readonly value: string;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type ValidationError = {
	readonly message: string;
	readonly path?: string;
	readonly line?: number;
	readonly position?: number;
};

export type ErrorResponseData = {
	readonly message: string;
	readonly request_id: string;
	readonly error_code: number;
	readonly validation_errors?: readonly ValidationError[];
};

export type RetryStrategyOptions = {
	/**
	 * Maximum number of retry attempts.
	 *
	 * If not provided, the default number of retries defined within the SDK will be used.
	 */
	readonly maxRetries?: number;

	/**
	 * Determines whether an error should be retried.
	 *
	 * This callback is evaluated only after SDK-defined retry rules are checked.
	 * The SDK handles the following cases directly:
	 *
	 * - Retried automatically:
	 *   - HTTP 429 (rate limit exceeded)
	 *
	 * - Not retried automatically:
	 *   - Invalid request body (`invalidBody`)
	 *   - Invalid URL (`invalidUrl`)
	 *   - 404 Not Found (`notFound`)
	 *   - 401 Unauthorized (`unauthorized`)
	 *   - API business/validation error response (`kontentErrorResponse`)
	 *
	 * For other error types, return `true` to retry or `false` to stop.
	 */
	readonly canRetryUnhandledError?: (error: KontentSdkError<ErrorDetailsFor<"unknown">>) => boolean;

	/**
	 * Controls logging for retry attempts.
	 *
	 * If undefined, no retry logging occurs (default behavior).
	 * If set to `'logToConsole'`, retries are logged to the console.
	 * If a function is provided, it is called with the retry attempt and url.
	 */
	readonly logRetryAttempt?: "logToConsole" | ((retryAttempt: number, url: string) => void);
};

export type ResolvedRetryStrategyOptions = Pick<Required<RetryStrategyOptions>, "maxRetries" | "canRetryUnhandledError"> & {
	readonly logRetryAttempt: undefined | ((retryAttempt: number, url: string) => void);
	readonly getDelayBetweenRetriesMs: (error: KontentSdkError) => number;
};
