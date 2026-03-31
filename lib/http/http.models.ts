import type { Header, HttpMethod, RetryStrategyOptions } from "../models/core.models.js";
import type { KontentSdkError } from "../models/error.models.js";
import type { JsonObject, JsonValue } from "../models/json.models.js";
import type { LiteralUnionNumber } from "../models/utility.types.js";
import type { QueryResponse } from "../sdk/sdk-models.js";
import type { Failure, Success } from "../utils/try-catch.utils.js";

export type HttpResult<TResponse> = Success<{ readonly response: TResponse }> | Failure<{ readonly response?: never }, KontentSdkError>;

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

export type HttpPayload = JsonValue | Blob;

export type HttpRequestBody = JsonObject | Blob | null;

export type HttpResponse<TPayload extends AdapterPayload, TRequestBody extends HttpRequestBody> = HttpResult<{
	readonly payload: TPayload;
	readonly body?: TRequestBody;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly adapterResponse: AdapterResponse<TPayload>;
}>;

export type ExecuteRequestOptions<TRequestBody extends HttpRequestBody> = {
	readonly url: URL | string;
	readonly method: HttpMethod;
	readonly body?: TRequestBody;
	readonly requestHeaders?: readonly Header[];
	readonly abortSignal?: AbortSignal | undefined;
};

export type UploadFileRequestOptions = Omit<ExecuteRequestOptions<Blob>, "method"> & {
	readonly method: Extract<HttpMethod, "POST" | "PUT" | "PATCH">;
};

export type DownloadFileRequestOptions = Pick<ExecuteRequestOptions<null>, "url" | "requestHeaders" | "abortSignal">;

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
	request<TResponsePayload extends JsonValue, TRequestBody extends HttpRequestBody>(
		opts: ExecuteRequestOptions<TRequestBody>,
	): Promise<HttpResponse<TResponsePayload, TRequestBody>>;

	/**
	 * Downloads a file from the given URL as a blob.
	 */
	downloadFile(opts: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>>;

	/**
	 * This method is used to upload a kontent.ai binary file.
	 */
	uploadFile<TResponsePayload extends JsonValue>(opts: UploadFileRequestOptions): Promise<HttpResponse<TResponsePayload, Blob>>;
};

export type AdapterResponse<TPayload extends AdapterPayload> = {
	readonly payload: TPayload;
	readonly responseHeaders: readonly Header[];
	readonly status: HttpServiceStatus;
	readonly statusText: string;
	readonly url: string;
};

export type AdapterBody = string | Blob | null;
export type AdapterPayload = JsonValue | Blob;

export type AdapterExecuteRequestOptions = {
	readonly url: string;
	readonly method: HttpMethod;
	readonly body?: AdapterBody;
	readonly requestHeaders?: readonly Header[];
	readonly abortSignal?: AbortSignal | undefined;
};

export type AdapterDownloadFileOptions = Pick<AdapterExecuteRequestOptions, "url" | "requestHeaders" | "abortSignal">;

export type GetNextPageData<TResponsePayload extends JsonValue, TMeta> = (response: QueryResponse<TResponsePayload, TMeta>) => {
	readonly continuationToken?: string | undefined;
	readonly nextPageUrl?: string | undefined;
};

export type PaginationConfig = {
	/**
	 * The maximum number of pages to fetch. If not provided or set to 0, the pagination will continue until the last page is reached.
	 */
	readonly maxPagesCount?: number;
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
	readonly executeRequest?: (options: AdapterExecuteRequestOptions) => Promise<AdapterResponse<JsonValue>>;
	readonly downloadFile?: (options: AdapterDownloadFileOptions) => Promise<AdapterResponse<Blob>>;
};
