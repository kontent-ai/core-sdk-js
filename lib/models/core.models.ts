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

export type CommonHeaderNames = 'Retry-After' | 'X-KC-SDKID' | 'Authorization' | 'Content-Type' | 'Content-Length';

export type Header = {
	/**
	 * The header name.
	 */
	readonly name: string;

	/**
	 * The header value.
	 */
	readonly value: string;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

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

/**
 * Contextual data in SDK errors
 */
export type CoreSdkErrorData = {
	/**
	 * The URL of the request.
	 */
	readonly url: string;

	/**
	 * The number of times the request has been retried.
	 */
	readonly retryAttempt: number;

	/**
	 * The retry strategy options used for the request.
	 */
	readonly retryStrategyOptions: Required<RetryStrategyOptions>;

	/**
	 * The headers of the request.
	 */
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

export class CoreSdkError extends Error {
	constructor(
		/**
		 * The message of the error
		 */
		readonly message: string,

		/**
		 * Contains contextual data about the error provided by the SDK
		 */
		readonly sdk: CoreSdkErrorData,

		/**
		 * The original error that caused the request to fail
		 */
		readonly originalError: HttpServiceInvalidResponseError | HttpServiceParsingError | unknown,
	) {
		super(message);
	}
}

export class HttpServiceParsingError extends Error {
	constructor(readonly message: string) {
		super(message);
	}
}

export class HttpServiceInvalidResponseError extends Error {
	readonly statusCode: number;
	readonly statusText: string;
	readonly kontentErrorResponse: KontentErrorResponseData | undefined;
	readonly responseHeaders: readonly Header[];

	constructor(data: {
		readonly statusCode: number;
		readonly statusText: string;
		readonly kontentErrorData: KontentErrorResponseData | undefined;
		readonly responseHeaders: readonly Header[];
	}) {
		super(`Invalid response from HTTP service with status ${data.statusCode}: ${data.statusText}`);

		this.statusCode = data.statusCode;
		this.statusText = data.statusText;
		this.kontentErrorResponse = data.kontentErrorData;
		this.responseHeaders = data.responseHeaders;
	}
}
