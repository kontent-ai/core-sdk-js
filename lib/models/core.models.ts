import type { CoreSdkError } from "./error.models.js";
import type { PickStringLiteral } from "./utility.models.js";

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

export type KontentValidationError = {
	readonly message: string;
	readonly path?: string;
	readonly line?: number;
	readonly position?: number;
};

export type KontentErrorResponseData = {
	readonly message: string;
	readonly requestId?: string;
	readonly error_code?: number;
	readonly validation_errors?: readonly KontentValidationError[];
};

export type RetryStrategyOptions = {
	/**
	 * Maximum number of retry attempts.
	 *
	 * If not provided, the default implementation will be used.
	 */
	readonly maxRetries?: number;

	/**
	 * Function to determine if the error should be retried.
	 *
	 * If not provided, the default implementation will be used.
	 */
	readonly canRetryError?: (error: CoreSdkError) => boolean;

	/**
	 * Function to determine the delay between requests in milliseconds.
	 *
	 * If not provided, the default implementation will be used.
	 */
	readonly getDelayBetweenRetriesMs?: (error: CoreSdkError) => number;

	/**
	 * Whether to log the retry attempt.
	 *
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
