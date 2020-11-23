import { ResponseType } from 'axios';

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
    responseType?: ResponseType;
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

export class IHttpRequestResult<TResponse = any> {
    response?: TResponse;
    error?: any;
}
