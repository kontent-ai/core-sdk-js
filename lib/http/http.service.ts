import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { defer, from, Observable, throwError } from 'rxjs';
import { catchError, map, retryWhen } from 'rxjs/operators';

import { extractHeadersFromAxiosResponse } from './headers-helper';
import * as HttpFunctions from './http.functions';
import {
    IBaseResponse,
    IHttpDeleteQueryCall,
    IHttpGetQueryCall,
    IHttpPatchQueryCall,
    IHttpPostQueryCall,
    IHttpPutQueryCall,
    IHttpQueryOptions,
    IHttpRequestResult,
} from './http.models';
import { IHttpService } from './ihttp.service';
import { observableRetryStrategy } from './observable-retry-strategy';
import { retryService } from './retry-service';

export class HttpService implements IHttpService {
    private readonly axiosInstance: AxiosInstance;

    constructor(opts?: {
        requestInterceptor?: (config: AxiosRequestConfig) => AxiosRequestConfig;
        responseInterceptor?: (config: AxiosResponse<any>) => AxiosResponse<any>;
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

    get<TRawData extends any>(
        call: IHttpGetQueryCall,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = defer(() => from(HttpFunctions.getCallback(this.axiosInstance, call, options)));

        // map axios observable
        return this.mapAxiosObservable(axiosObservable, options);
    }

    post<TRawData extends any>(
        call: IHttpPostQueryCall,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = defer(() => from(HttpFunctions.postCallback(this.axiosInstance, call, options)));

        // map axios observable
        return this.mapAxiosObservable(axiosObservable, options);
    }

    put<TRawData extends any>(
        call: IHttpPutQueryCall,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = defer(() => from(HttpFunctions.putCallback(this.axiosInstance, call, options)));

        // map axios observable
        return this.mapAxiosObservable(axiosObservable, options);
    }

    patch<TRawData extends any>(
        call: IHttpPatchQueryCall,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = defer(() => from(HttpFunctions.patchCallback(this.axiosInstance, call, options)));

        // map axios observable
        return this.mapAxiosObservable(axiosObservable, options);
    }

    delete<TRawData extends any>(
        call: IHttpDeleteQueryCall,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // bind callback from axios promise
        const axiosObservable = defer(() => from(HttpFunctions.deleteCallback(this.axiosInstance, call, options)));

        // map axios observable
        return this.mapAxiosObservable(axiosObservable, options);
    }

    private mapAxiosObservable<TRawData>(
        axiosObservable: Observable<any>,
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

                return throwError(error);
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
