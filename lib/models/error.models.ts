import type { AdapterResponse, HttpServiceStatus } from '../http/http.models.js';
import type { Header, KontentErrorResponseData, RetryStrategyOptions } from './core.models.js';

/**
 * Represent an error that is thrown by the SDK
 */
export class CoreSdkError<TOriginalError extends HttpServiceInvalidResponseError | HttpServiceParsingError | unknown = unknown> extends Error {
	constructor(
		/**
		 * The message of the error
		 */
		readonly message: string,

		/**
		 * The URL of the request.
		 */
		readonly url: string,

		/**
		 * The number of times the request has been retried.
		 */
		readonly retryAttempt: number,

		/**
		 * The retry strategy options used for the request.
		 */
		readonly retryStrategyOptions: Required<RetryStrategyOptions>,

		/**
		 * The headers of the request.
		 */
		readonly requestHeaders: readonly Header[],

		/**
		 * The original error that caused the request to fail
		 */
		readonly originalError: TOriginalError,
	) {
		super(message);
	}
}

/**
 * Represent an error that is thrown by the HTTP service when parsing the URL or body data failed
 */
export class HttpServiceParsingError extends Error {
	constructor(readonly message: string) {
		super(message);
	}
}

/**
 * Represent an error that is thrown by the HTTP service when the response is not valid
 */
export class HttpServiceInvalidResponseError<TStatusCode extends HttpServiceStatus = HttpServiceStatus> extends Error {
	readonly kontentErrorResponse: KontentErrorResponseData | undefined;
	readonly adapterResponse: AdapterResponse<TStatusCode>;

	constructor(data: {
		readonly adapterResponse: AdapterResponse<TStatusCode>;
		readonly kontentErrorData: KontentErrorResponseData | undefined;
	}) {
		super(`Invalid response from HTTP service with status ${data.adapterResponse.status}: ${data.adapterResponse.statusText}`);

		this.kontentErrorResponse = data.kontentErrorData;
		this.adapterResponse = data.adapterResponse;
	}
}
