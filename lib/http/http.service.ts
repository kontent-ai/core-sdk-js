import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import { bindCallback, Observable, throwError } from 'rxjs';
import { catchError, map, retryWhen } from 'rxjs/operators';

import * as HttpFunctions from './http.functions';
import {
    IBaseResponse,
    IBaseResponseError,
    IHttpDeleteQueryCall,
    IHttpGetQueryCall,
    IHttpPostQueryCall,
    IHttpPutQueryCall,
    IHttpQueryCall,
    IHttpQueryOptions,
    IHttpRequestConfig,
    IHttpRequestResponse,
    IHttpRequestResult,
    IHttpPatchQueryCall,
    IHeader,
    IRetryStrategyOptions
} from './http.models';
import { IHttpService } from './ihttp.service';
import { retryService } from './retry-service';
import { observableRetryStrategy } from './observable-retry-strategy';
import { promiseRetryStrategy } from './promise-retry-strategy';

export class HttpService implements IHttpService {

    private readonly axiosInstance: AxiosInstance;

    constructor(opts?: {
        requestInterceptor?: (config: IHttpRequestConfig) => IHttpRequestConfig;
        responseInterceptor?: (config: IHttpRequestResponse) => IHttpRequestResponse;
        axiosRequestConfig?: AxiosRequestConfig;
    }) {
        this.axiosInstance = axios.create(opts && opts.axiosRequestConfig ? opts.axiosRequestConfig : undefined);

        if (opts) {
            if (opts.requestInterceptor) {
                HttpFunctions.registerRequestInterceptor(this.axiosInstance, opts.requestInterceptor);
            }
            if (opts.responseInterceptor) {
                HttpFunctions.registerResponseInterceptor(this.axiosInstance, opts.responseInterceptor);
            }
        }
    }

    /**
     * Retries given promise based on given configuration
     * @param promise Promise to retry
     * @param options Configuration options
     */
    retryPromise<T>(
        promise: Promise<T>,
        options?: IRetryStrategyOptions
    ): Promise<T> {
        return promiseRetryStrategy.getPromiseWithRetryStrategy(promise, retryService.getRetryStrategyOptions(options), {
            retryAttempt: 0,
            startTime: new Date()
        });
    }

    get<TError extends any, TRawData extends any>(
        call: IHttpGetQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = bindCallback(HttpFunctions.getCallback);

        // map axios observable
        return this.mapAxiosObservable(this.axiosInstance, axiosObservable, call, options);
    }

    post<TError extends any, TRawData extends any>(
        call: IHttpPostQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = bindCallback(HttpFunctions.postCallback);

        // map axios observable
        return this.mapAxiosObservable(this.axiosInstance, axiosObservable, call, options);
    }

    put<TError extends any, TRawData extends any>(
        call: IHttpPutQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = bindCallback(HttpFunctions.putCallback);

        // map axios observable
        return this.mapAxiosObservable(this.axiosInstance, axiosObservable, call, options);
    }

    patch<TError extends any, TRawData extends any>(
        call: IHttpPatchQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = bindCallback(HttpFunctions.putCallback);

        // map axios observable
        return this.mapAxiosObservable(this.axiosInstance, axiosObservable, call, options);
    }

    delete<TError extends any, TRawData extends any>(
        call: IHttpDeleteQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = bindCallback(HttpFunctions.deleteCallback);

        // map axios observable
        return this.mapAxiosObservable(this.axiosInstance, axiosObservable, call, options);
    }

    private mapAxiosObservable<TRawData, TError>(
        axiosInstance: AxiosInstance,
        axiosObservable: (...args: any[]) => Observable<any>,
        call: IHttpQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        return axiosObservable(axiosInstance, call, options).pipe(
            retryWhen(
                observableRetryStrategy.strategy(retryService.getRetryStrategyOptions(options), {
                    startTime:  new Date()
                })
            ),
            map((result: IHttpRequestResult<AxiosResponse>) => this.mapResult<TRawData>(result)),
            catchError(error => {
                // Handling errors: https://github.com/axios/axios#handling-errors
                if (options && options.logErrorToConsole) {
                    console.error(`Kentico Kontent Core SDK encountered an error: `, error);
                }

                return throwError(<IBaseResponseError<TError>>{
                    originalError: error,
                    mappedError: call.mapError(error)
                });
            })
        );
    }

    private mapResult<TRawData>(result: IHttpRequestResult<AxiosResponse>): IBaseResponse<TRawData> {
        // if error is set, throw it
        if (result.error) {
            throw result.error;
        }

        // if neither error nor response is set, throw an error
        if (!result.response) {
            throw Error('Response is not set and no error was thrown');
        }

        return <IBaseResponse<TRawData>>{
            data: result.response.data,
            response: result.response,
            headers: this.extractHeadersFromAxiosResponse(result.response),
            status: result.response.status
        };
    }

    private extractHeadersFromAxiosResponse(response: AxiosResponse): IHeader[] {
        const headers: IHeader[] = [];

        for (const headerKey of Object.keys(response.headers)) {
            headers.push({
                header: headerKey,
                value: response.headers[headerKey]
            });
        }

        return headers;
    }
}
