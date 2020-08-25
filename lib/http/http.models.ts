export interface IBaseResponse<TRawData> {
    data: TRawData;
    headers: IHeader[];
    response: any;
    status: number;
}

export interface IRetryStrategyOptions {
    /**
     * back-off interval between retries
     */
    deltaBackoffMs: number;
    /**
     * If the cumulative wait time exceeds this value, the client will stop retrying and return the error to the application.
     */
    maxCumulativeWaitTimeMs: number;
    /**
     * Maximum allowed number of attempts
     */
    maxAttempts: number;
    /**
     * Indicates if jitter is added to retry
     */
    addJitter: boolean;
    /**
     * Determines if error can be retried. By default only axios errors are retried.
     */
    canRetryError: (error: any) => boolean;
}

export interface IHttpQueryCall {
    url: string;
}

export interface IHttpPostQueryCall extends IHttpQueryCall {
    body: any;
}

export interface IHttpPutQueryCall extends IHttpQueryCall {
    body: any;
}

export interface IHttpPatchQueryCall extends IHttpQueryCall {
    body: any;
}

export interface IHttpDeleteQueryCall extends IHttpQueryCall {}

export interface IHttpGetQueryCall extends IHttpQueryCall {}

export interface IHttpQueryOptions {
    // retry strategy
    retryStrategy?: IRetryStrategyOptions;
    /**
     * Request headers
     * */
    headers?: IHeader[];
    /**
     * Indicates if errors are logged to console
     */
    logErrorToConsole?: boolean;
    /**
     * Response type
     */
    responseType?: HttpResponseType;
}

export interface IHeader {
    header: string;
    value: string;
}

export interface IHttpRequestCredentials {
    username: string;
    password: string;
}

export interface IHttpRequestProfxyConfig {
    host: string;
    port: number;
    auth?: {
        username: string;
        password: string;
    };
}

export type HttpRequestMethod =
    | 'get'
    | 'GET'
    | 'delete'
    | 'DELETE'
    | 'head'
    | 'HEAD'
    | 'options'
    | 'OPTIONS'
    | 'post'
    | 'POST'
    | 'put'
    | 'PUT'
    | 'patch'
    | 'PATCH'
    | 'link'
    | 'LINK'
    | 'unlink'
    | 'UNLINK';

export type HttpResponseType = 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';

export interface IHttpRequestConfig {
    url?: string;
    method?: HttpRequestMethod;
    baseURL?: string;
    headers?: any;
    params?: any;
    paramsSerializer?: (params: any) => string;
    data?: any;
    timeout?: number;
    withCredentials?: boolean;
    auth?: IHttpRequestCredentials;
    responseType?: HttpResponseType;
    xsrfCookieName?: string;
    xsrfHeaderName?: string;
    maxContentLength?: number;
    validateStatus?: (status: number) => boolean;
    maxRedirects?: number;
    httpAgent?: any;
    httpsAgent?: any;
    proxy?: IHttpRequestProfxyConfig | false;
}

export interface IHttpRequestResponse {
    data: any;
    status: number;
    statusText: string;
    headers: any;
    config: IHttpRequestConfig;
    request?: any;
}

export class IHttpRequestResult<TResponse = any> {
    response?: TResponse;
    error?: any;
}
