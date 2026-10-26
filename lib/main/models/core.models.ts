import type { ErrorDetailsFor, KontentSdkError } from "./error.models.js";
import type { LiteralUnion, PickStringLiteral } from "./utility.types.js";

/**
 * SDK info for identification of the SDK
 */
export type SdkInfo = {
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

export type KnownHeaderName = "Retry-After" | "X-KC-SDKID" | "Authorization" | "Content-Type" | "Content-Length" | "X-Continuation";

export type ContinuationTokenHeaderName = PickStringLiteral<KnownHeaderName, "X-Continuation">;

export type Header = {
	readonly name: LiteralUnion<KnownHeaderName>;
	readonly value: string;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type RetryStrategyOptions = {
	/**
	 * Maximum number of retry attempts.
	 *
	 * If not provided, the default number of retries defined within the SDK will be used.
	 */
	readonly maxRetries?: number;

	/**
	 * Determines whether an adapter error should be retried.
	 *
	 * Adapter errors occur when the HTTP adapter fails to execute the request
	 * (e.g. network failures, connection timeouts, or other transport-level issues).
	 *
	 * This callback is evaluated only after SDK-defined retry rules are checked.
	 * The SDK handles the following cases directly:
	 *
	 * - Retried automatically:
	 *   - HTTP 429 (rate limit exceeded)
	 *
	 * - Never retried:
	 *   - Any other non-2xx HTTP response, including 5xx and 408 (`invalidResponse`), 404 Not Found (`notFound`)
	 *     and 401 Unauthorized (`unauthorized`). HTTP error responses are not adapter errors, so this callback
	 *     is not consulted for them.
	 *   - API business/validation error response (`kontentErrorResponse`)
	 *   - Invalid request body (`invalidBody`) and invalid URL (`invalidUrl`)
	 *   - Unreadable response body (`invalidResponseBody`), schema mismatch (`schemaMismatch`) and transform errors (`transformError`)
	 *   - Aborted requests (`aborted`), including requests stopped by `AbortSignal.timeout()`
	 *
	 * Retrying transient 5xx responses is intentionally not done by default. To retry them, implement a custom `HttpService`.
	 */
	readonly canRetryAdapterError?: (error: KontentSdkError<ErrorDetailsFor<"adapterError">>) => boolean;

	/**
	 * Controls logging for retry attempts.
	 *
	 * If undefined, no retry logging occurs (default behavior).
	 * If set to `'logToConsole'`, retries are logged to the console.
	 * If a function is provided, it is called with the retry attempt, url and the delay before the retry in milliseconds.
	 */
	readonly logRetryAttempt?: "logToConsole" | ((retryAttempt: number, url: string, retryInMs: number) => void);

	/**
	 * Maximum delay between retries, in milliseconds.
	 *
	 * By default, the delay is derived from the `Retry-After` response header with no upper bound.
	 * When set, a delay that would otherwise exceed this value is clamped to it.
	 */
	readonly maxRetryDelayMs?: number;
};

export type ResolvedRetryStrategyOptions = Pick<Required<RetryStrategyOptions>, "maxRetries" | "canRetryAdapterError"> & {
	readonly logRetryAttempt: undefined | ((retryAttempt: number, url: string, retryInMs: number) => void);
	readonly getDelayBetweenRetriesMs: (error: KontentSdkError) => number;
};
