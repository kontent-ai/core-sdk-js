import type { HttpServiceStatus } from '../http/http.models.js';

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
	readonly host: LiteralUnion<'npmjs.com'>;
};

export type Header = {
	/**
	 * The header name.
	 */
	readonly name: LiteralUnion<'Retry-After' | 'X-KC-SDKID' | 'Authorization'>;

	/**
	 * The header value.
	 */
	readonly value: string;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Contextual data in SDK errors
 */
export type SdkErrorData = {
	readonly responseData: unknown | undefined;
	readonly originalError: unknown;
	readonly url: string;
	readonly retryAttempt: number;
	readonly retryStrategyOptions: Required<RetryStrategyOptions>;
	readonly responseHeaders: readonly Header[];
	readonly status: HttpServiceStatus | undefined;
	readonly requestHeaders: readonly Header[];
};

export type RetryStrategyOptions = {
	/**
	 * Maximum number of attempts to retry the request.
	 * If not provided, the default implementation will be used.
	 */
	readonly maxAttempts?: number;

	/**
	 * Function to determine if the error should be retried.
	 * If not provided, the default implementation will be used.
	 */
	readonly canRetryError?: (error: unknown) => boolean;

	/**
	 * Default delay between requests in milliseconds.
	 * Only used if the `Retry-after` header is not present.
	 * The `Retry-after` header is sent by the Kontent.ai API to
	 * indicate the time to wait before retrying the request.
	 */
	readonly defaultDelayBetweenRequestsMs?: number;

	/**
	 * Whether to log the retry attempt.
	 * If false, the retry attempt will not be logged.
	 * If undefined, the default implementation will be used.
	 * Otherwise, the function will be called with the retry attempt and url.
	 */
	readonly logRetryAttempt?: false | ((retryAttempt: number, url: string) => void);
};

/**
 * Adds intellisense for string union type, but also allows any string
 */
export type LiteralUnion<T extends string | undefined> = T | (string & NonNullable<unknown>);

/**
 * Adds intellisense for number union type, but also allows any number
 */
export type LiteralUnionNumber<T extends number | undefined> = T | (number & NonNullable<unknown>);
