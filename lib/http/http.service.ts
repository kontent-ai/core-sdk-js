import axios, { AxiosInstance, AxiosRequestConfig, CancelToken } from 'axios';

import * as HttpFunctions from './http.functions';
import {
    IResponse,
    IHttpDeleteQueryCall,
    IHttpGetQueryCall,
    IHttpPatchQueryCall,
    IHttpPostQueryCall,
    IHttpPutQueryCall,
    IHttpQueryOptions,
    IHttpCancelRequestToken,
} from './http.models';
import { IHttpService } from './ihttp.service';

export class HttpService implements IHttpService<CancelToken> {
    private readonly axiosInstance: AxiosInstance;

    constructor(opts?: {
        axiosRequestConfig?: AxiosRequestConfig;
    }) {
        this.axiosInstance = axios.create(opts?.axiosRequestConfig);
    }

    async getAsync<TRawData>(call: IHttpGetQueryCall, options?: IHttpQueryOptions<CancelToken>): Promise<IResponse<TRawData>> {
        return await HttpFunctions.getWithRetryAsync<TRawData>(this.axiosInstance, call, options);
    }

    async postAsync<TRawData>(call: IHttpPostQueryCall, options?: IHttpQueryOptions<CancelToken>): Promise<IResponse<TRawData>> {
        return await HttpFunctions.postWithRetryAsync<TRawData>(this.axiosInstance, call, options);
    }

    async putAsync<TRawData>(call: IHttpPutQueryCall, options?: IHttpQueryOptions<CancelToken>): Promise<IResponse<TRawData>> {
        return await HttpFunctions.putWithRetryAsync<TRawData>(this.axiosInstance, call, options);
    }

    async patchAsync<TRawData>(call: IHttpPatchQueryCall, options?: IHttpQueryOptions<CancelToken>): Promise<IResponse<TRawData>> {
        return await HttpFunctions.patchWithRetryAsync<TRawData>(this.axiosInstance, call, options);
    }

    async deleteAsync<TRawData>(call: IHttpDeleteQueryCall, options?: IHttpQueryOptions<CancelToken>): Promise<IResponse<TRawData>> {
        return await HttpFunctions.deletehWithRetryAsync<TRawData>(this.axiosInstance, call, options);
    }

    createCancelToken(): IHttpCancelRequestToken<CancelToken> {
        return HttpFunctions.createCancelToken();
    }
}
