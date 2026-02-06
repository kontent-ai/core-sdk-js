import type { Header, HttpMethod, LiteralUnionNumber, RetryStrategyOptions } from "../models/core.models.js";
import type { SdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";

type Success<TData> = {
	readonly success: true;
	readonly response: TData;
	readonly error?: never;
};

type Failure = {
	readonly success: false;
	readonly response?: never;
	readonly error: SdkError;
};

export type HttpResult<TData> = Success<TData> | Failure;

/**
 * Helper status codes for the HTTP service.
 * It can be any valid number status code as this type only serves as a helper.
 */
export type HttpServiceStatus = LiteralUnionNumber<200 | 201 | 204 | 500 | 429 | 404 | 403 | 401 | 400>;

export type DefaultHttpServiceConfig = {
	/**
	 * The retry strategy to be used. If not provided, the default retry strategy will be used.
	 */
	readonly retryStrategy?: RetryStrategyOptions;

	/**
	 * The headers appended to all requests.
	 */
	readonly requestHeaders?: readonly Header[];

	/**
	 * The adapter to be used. If not provided, the default adapter will be used.
	 */
	readonly adapter?: HttpAdapter;
};

export type HttpResponse<TResponseData extends JsonValue | Blob, TBodyData extends JsonValue | Blob> = HttpResult<{
	readonly data: TResponseData;
	readonly body: TBodyData;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly adapterResponse: Omit<AdapterResponse, "toJsonAsync" | "toBlobAsync">;
}>;

export type ExecuteRequestOptions<TBodyData extends JsonValue | Blob> = {
	readonly url: string;
	readonly method: HttpMethod;
	readonly body: TBodyData;
	readonly requestHeaders?: readonly Header[];
};

export type UploadFileRequestOptions = Omit<ExecuteRequestOptions<Blob>, "method"> & {
	readonly method: Extract<HttpMethod, "POST" | "PUT" | "PATCH">;
};

export type DownloadFileRequestOptions = Pick<ExecuteRequestOptions<Blob>, "url" | "requestHeaders">;

/**
 * Represents the HTTP service used for making requests to the Kontent.ai API.
 *
 * This service includes built-in retry logic, request validation, and automatic header processing.
 *
 * By default, it uses the `fetch` API for executing requests. However, you can supply a custom `HttpAdapter`
 * to integrate your preferred HTTP client.
 *
 * For full customization—including retry behavior and other request-handling logic—you may implement the `HttpService` directly.
 */
export type HttpService = {
	/**
	 * Executes request with the given method and body.
	 */
	requestAsync<TResponseData extends JsonValue, TBodyData extends JsonValue>(
		opts: ExecuteRequestOptions<TBodyData>,
	): Promise<HttpResponse<TResponseData, TBodyData>>;

	/**
	 * Downloads a file from the given URL as a blob.
	 */
	downloadFileAsync(opts: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>>;

	/**
	 * This method is used to upload a kontent.ai binary file.
	 */
	uploadFileAsync<TResponseData extends JsonValue>(opts: UploadFileRequestOptions): Promise<HttpResponse<TResponseData, Blob>>;
};

export type AdapterResponse<TStatusCode extends HttpServiceStatus = HttpServiceStatus> = {
	readonly toJsonAsync: () => Promise<JsonValue>;
	readonly toBlobAsync: () => Promise<Blob>;

	readonly isValidResponse: boolean;
	readonly responseHeaders: readonly Header[];
	readonly status: TStatusCode;
	readonly statusText: string;
};

export type AdapterRequestOptions = {
	readonly url: string;
	readonly method: HttpMethod;
	readonly body: string | Blob | undefined | null;
	readonly requestHeaders?: readonly Header[];
};

/**
 * Defines the adapter responsible solely for executing HTTP requests.
 *
 * This implementation should focus exclusively on performing the request itself.
 * It should not handle concerns such as retry policies, header manipulation, response parsing, or request body transformation.
 *
 * To extend functionality, you can implement a custom adapter and pass it to the `getDefaultHttpService` function,
 * which handles additional concerns like retries and parsing.
 *
 * Alternatively, you may implement the entire `HttpService` interface to create a fully customized HTTP service.
 */
export type HttpAdapter = {
	readonly requestAsync: (options: AdapterRequestOptions) => Promise<AdapterResponse>;
};
