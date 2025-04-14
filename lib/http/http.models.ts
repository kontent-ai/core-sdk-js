import type { Header, LiteralUnionNumber, RetryStrategyOptions } from '../models/core.models.js';
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
     * The type of the response.
     */
    readonly responseType?: string;

    /**
     * The retry strategy to be used. If not provided, the default retry strategy will be used.
     */
    readonly retryStrategy?: RetryStrategyOptions;
};

export type HttpResponse<TResponseData, TBodyData extends JsonValue> = {
    /**
     * The data of the response.
     */
    readonly data: TResponseData;

    /**
     * The request body data.
     */
    readonly body: TBodyData;

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

export type HttpService = {
    /**
     * Executes a GET request
     */
    getAsync<TResponseData extends JsonValue>(
        url: string,
        options?: HttpQueryOptions
    ): Promise<HttpResponse<TResponseData, null>>;

    /**
     * Executes a POST request
     */
    postAsync<TResponseData extends JsonValue, TBodyData extends JsonValue>(
        url: string,
        body: TBodyData,
        options?: HttpQueryOptions
    ): Promise<HttpResponse<TResponseData, TBodyData>>;
};

export class CoreSdkError extends Error {
    constructor(
        readonly message: string,
        readonly originalError: unknown,
        readonly url: string,
        readonly retryAttempt: number,
        readonly retryStrategyOptions: Required<RetryStrategyOptions>,
        readonly responseHeaders: readonly Header[],
        readonly status: HttpServiceStatus | undefined,
        readonly requestHeaders: readonly Header[]
    ) {
        super(message);
    }
}
