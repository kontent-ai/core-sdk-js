import type { Header, LiteralUnionNumber, RetryStrategyOptions } from '../models/core.models.js';

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

export type HttpResponse<TResponseData> = {
    /**
     * The data of the response.
     */
    readonly data: TResponseData;

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
    getAsync<TResponseData>(url: string, options?: HttpQueryOptions): Promise<HttpResponse<TResponseData>>;
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

// export interface IResponseRetryStrategyResult {
//     options: IRetryStrategyOptions;
//     retryAttempts: number;
// }

// export interface IResponse<TRawData> {
//     data: TRawData;
//     headers: IHeader[];
//     rawResponse: any;
//     status: number;
//     retryStrategy: IResponseRetryStrategyResult;
// }

// export interface IRetryStrategyOptions {
//     /**
//      * back-off interval between retries
//      */
//     deltaBackoffMs?: number;
//     /**
//      * Maximum allowed number of attempts
//      */
//     maxAttempts?: number;
//     /**
//      * Indicates if jitter is added to retry
//      */
//     addJitter?: boolean;
//     /**
//      * Determines if error can be retried. There are errors that are never retried
//      * such as when request is cancelled or the response status is 404 and so on...
//      */
//     canRetryError?: (error: any) => boolean;
// }

// export interface IHttpQueryCall {
//     url: string;
// }

// export interface IHttpPostQueryCall extends IHttpQueryCall {
//     body: any;
// }

// export interface IHttpPutQueryCall extends IHttpQueryCall {
//     body: any;
// }

// export interface IHttpPatchQueryCall extends IHttpQueryCall {
//     body: any;
// }

// export interface IHttpDeleteQueryCall extends IHttpQueryCall {}

// export interface IHttpGetQueryCall extends IHttpQueryCall {}

// export interface IHttpCancelRequestToken<TCancelToken> {
//     token: TCancelToken;
//     cancel: (cancelMessage?: string) => void;
// }

// export interface IHttpQueryOptions<TCancelToken> {
//     /**
//      * retry strategy
//      */
//     retryStrategy?: IRetryStrategyOptions;
//     /**
//      * Request headers
//      */
//     headers?: IHeader[];
//     /**
//      * Response type
//      */
//     responseType?: ResponseType;
//     /**
//      * Cancel token
//      */
//     cancelToken?: IHttpCancelRequestToken<TCancelToken>;
// }

// export interface IHeader {
//     header: string;
//     value: string;
// }
