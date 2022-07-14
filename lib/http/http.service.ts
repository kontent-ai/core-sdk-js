import axios, { AxiosInstance, AxiosRequestConfig, CancelToken } from 'axios';

import * as HttpFunctions from './http.functions';
import { IHttpFunctionsConfig } from './http.functions';
import {
    IResponse,
    IHttpDeleteQueryCall,
    IHttpGetQueryCall,
    IHttpPatchQueryCall,
    IHttpPostQueryCall,
    IHttpPutQueryCall,
    IHttpQueryOptions,
    IHttpCancelRequestToken
} from './http.models';
import { IHttpService } from './ihttp.service';

export class HttpService implements IHttpService<CancelToken> {
    private readonly axiosInstance: AxiosInstance;

    private readonly functionsConfig: IHttpFunctionsConfig;

    constructor(
        private opts?: {
            axiosRequestConfig?: AxiosRequestConfig;
            logErrorsToConsole?: boolean;
        }
    ) {
        this.axiosInstance = axios.create(opts?.axiosRequestConfig);
        this.functionsConfig = this.getFunctionsConfig();
    }

    async getAsync<TRawData>(
        call: IHttpGetQueryCall,
        options?: IHttpQueryOptions<CancelToken>
    ): Promise<IResponse<TRawData>> {
        return await HttpFunctions.getWithRetryAsync<TRawData>(this.axiosInstance, call, this.functionsConfig, options);
    }

    async postAsync<TRawData>(
        call: IHttpPostQueryCall,
        options?: IHttpQueryOptions<CancelToken>
    ): Promise<IResponse<TRawData>> {
        return await HttpFunctions.postWithRetryAsync<TRawData>(
            this.axiosInstance,
            call,
            this.functionsConfig,
            options
        );
    }

    async putAsync<TRawData>(
        call: IHttpPutQueryCall,
        options?: IHttpQueryOptions<CancelToken>
    ): Promise<IResponse<TRawData>> {
        return await HttpFunctions.putWithRetryAsync<TRawData>(this.axiosInstance, call, this.functionsConfig, options);
    }

    async patchAsync<TRawData>(
        call: IHttpPatchQueryCall,
        options?: IHttpQueryOptions<CancelToken>
    ): Promise<IResponse<TRawData>> {
        return await HttpFunctions.patchWithRetryAsync<TRawData>(
            this.axiosInstance,
            call,
            this.functionsConfig,
            options
        );
    }

    async deleteAsync<TRawData>(
        call: IHttpDeleteQueryCall,
        options?: IHttpQueryOptions<CancelToken>
    ): Promise<IResponse<TRawData>> {
        return await HttpFunctions.deleteWithRetryAsync<TRawData>(
            this.axiosInstance,
            call,
            this.functionsConfig,
            options
        );
    }

    createCancelToken(): IHttpCancelRequestToken<CancelToken> {
        return HttpFunctions.createCancelToken();
    }

    private getFunctionsConfig(): IHttpFunctionsConfig {
        return {
            logErrorsToConsole: this.opts?.logErrorsToConsole ?? true
        };
    }
}
