import type { Header, HttpMethod, LiteralUnionNumber, RetryStrategyOptions, SdkErrorData } from '../models/core.models.js';
import type { JsonValue } from '../models/json.models.js';

/**
 * Helper status codes for the HTTP service.
 * It can be any valid number status code as this type only serves as a helper.
 */
export type HttpServiceStatus = LiteralUnionNumber<200 | 500 | 429 | 404 | 403 | 401 | 400>;

export type HttpQueryOptions = {
	/**
	 * The headers to be sent with the request.
	 */
	readonly requestHeaders?: readonly Header[];

	/**
	 * The retry strategy to be used. If not provided, the default retry strategy will be used.
	 */
	readonly retryStrategy?: RetryStrategyOptions;
};

export type HttpResponse<TResponseData extends JsonValue | Blob, TBodyData extends JsonValue | Blob> = {
	/**
	 * The data of the response.
	 */
	readonly data: TResponseData;

	/**
	 * The request body data.
	 */
	readonly body: TBodyData;

	/**
	 * The request method.
	 */
	readonly method: HttpMethod;

	/**
	 * The request headers.
	 */
	readonly requestHeaders: readonly Header[];

	/**
	 * The headers of the response.
	 */
	readonly responseHeaders: readonly Header[];

	/**
	 * The status of the response.
	 */
	readonly status: HttpServiceStatus;
};

export type ExecuteRequestOptions<TBodyData extends JsonValue> = {
	readonly url: string;
	readonly method: HttpMethod;
	readonly body: TBodyData;
	readonly options?: HttpQueryOptions;
};

export type UploadFileRequestOptions = {
	readonly url: string;
	readonly method: Extract<HttpMethod, 'POST' | 'PUT' | 'PATCH'>;
	readonly file: Blob;
	readonly options?: HttpQueryOptions;
};

export type DownloadFileRequestOptions = {
	readonly url: string;
	readonly options?: HttpQueryOptions;
};

export type HttpService = {
	/**
	 * Executes request with the given method
	 */
	executeAsync<TResponseData extends JsonValue, TBodyData extends JsonValue>(
		opts: ExecuteRequestOptions<TBodyData>,
	): Promise<HttpResponse<TResponseData, TBodyData>>;

	/**
	 * Downloads a file from the given url and gets binary data
	 */
	downloadFileAsync(opts: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>>;

	/**
	 * Uploads a file to the given url
	 */
	uploadFileAsync<TResponseData extends JsonValue>(opts: UploadFileRequestOptions): Promise<HttpResponse<TResponseData, Blob>>;
};

export class CoreSdkError extends Error {
	constructor(
		readonly message: string,
		readonly sdk: SdkErrorData,
	) {
		super(message);
	}
}
