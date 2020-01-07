import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { defer, from, Observable, throwError } from 'rxjs';
import { catchError, map, retryWhen } from 'rxjs/operators';

import { extractHeadersFromAxiosResponse } from './headers-helper';
import * as HttpFunctions from './http.functions';
import {
    IBaseResponse,
    IBaseResponseError,
    IHttpDeleteQueryCall,
    IHttpGetQueryCall,
    IHttpPatchQueryCall,
    IHttpPostQueryCall,
    IHttpPutQueryCall,
    IHttpQueryCall,
    IHttpQueryOptions,
    IHttpRequestConfig,
    IHttpRequestResponse,
    IHttpRequestResult,
} from './http.models';
import { IHttpService } from './ihttp.service';
import { observableRetryStrategy } from './observable-retry-strategy';
import { retryService } from './retry-service';

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

    get<TError extends any, TRawData extends any>(
        call: IHttpGetQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = defer(() => from(HttpFunctions.getCallback(this.axiosInstance, call, options)));

        // map axios observable
        return this.mapAxiosObservable(axiosObservable, call, options);
    }

    post<TError extends any, TRawData extends any>(
        call: IHttpPostQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = defer(() => from(HttpFunctions.postCallback(this.axiosInstance, call, options)));

        // map axios observable
        return this.mapAxiosObservable(axiosObservable, call, options);
    }

    put<TError extends any, TRawData extends any>(
        call: IHttpPutQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = defer(() => from(HttpFunctions.putCallback(this.axiosInstance, call, options)));

        // map axios observable
        return this.mapAxiosObservable(axiosObservable, call, options);
    }

    patch<TError extends any, TRawData extends any>(
        call: IHttpPatchQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = defer(() => from(HttpFunctions.patchCallback(this.axiosInstance, call, options)));

        // map axios observable
        return this.mapAxiosObservable(axiosObservable, call, options);
    }

    delete<TError extends any, TRawData extends any>(
        call: IHttpDeleteQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = defer(() => from(HttpFunctions.deleteCallback(this.axiosInstance, call, options)));

        // map axios observable
        return this.mapAxiosObservable(axiosObservable, call, options);
    }

    private mapAxiosObservable<TRawData, TError>(
        axiosObservable: Observable<any>,
        call: IHttpQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        return axiosObservable.pipe(
            map((result: IHttpRequestResult<AxiosResponse>) => this.mapResult<TRawData>(result)),
            retryWhen(
                observableRetryStrategy.strategy(retryService.getRetryStrategyFromStrategyOptions(options?.retryStrategy), {
                    startTime: new Date()
                })
            ),
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
            headers: extractHeadersFromAxiosResponse(result.response),
            status: result.response.status
        };
    }
}
