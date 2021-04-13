import { AxiosInstance } from 'axios';
import { extractHeadersFromAxiosResponse } from '../helpers/headers-helper';

import { httpDebugger } from './http.debugger';
import {
    IHeader,
    IHttpDeleteQueryCall,
    IHttpGetQueryCall,
    IHttpPatchQueryCall,
    IHttpPostQueryCall,
    IHttpPutQueryCall,
    IHttpQueryOptions,
    IResponse,
    IRetryStrategyOptions
} from './http.models';
import { retryHelper } from '../helpers/retry-helper';

export async function getWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpGetQueryCall,
    options?: IHttpQueryOptions
): Promise<IResponse<TRawData>> {
    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: options?.retryStrategy ?? retryHelper.defaultRetryStrategy,
        call: async () => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.get<TRawData>(call.url, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                cancelToken: options?.cancelToken
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function postWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpPostQueryCall,
    options?: IHttpQueryOptions
): Promise<IResponse<TRawData>> {
    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: options?.retryStrategy ?? retryHelper.defaultRetryStrategy,
        call: async () => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.post<TRawData>(call.url, call.body, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function putWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpPutQueryCall,
    options?: IHttpQueryOptions
): Promise<IResponse<TRawData>> {
    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: options?.retryStrategy ?? retryHelper.defaultRetryStrategy,
        call: async () => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.put<TRawData>(call.url, call.body, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function patchWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpPatchQueryCall,
    options?: IHttpQueryOptions
): Promise<IResponse<TRawData>> {
    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: options?.retryStrategy ?? retryHelper.defaultRetryStrategy,
        call: async () => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.patch<TRawData>(call.url, call.body, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function deletehWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpDeleteQueryCall,
    options?: IHttpQueryOptions
): Promise<IResponse<TRawData>> {
    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: options?.retryStrategy ?? retryHelper.defaultRetryStrategy,
        call: async () => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.delete<TRawData>(call.url, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

async function runWithRetryAsync<TRawData>(data: {
    url: string;
    retryAttempt: number;
    call: () => Promise<IResponse<TRawData>>;
    retryStrategy: IRetryStrategyOptions;
}): Promise<IResponse<TRawData>> {
    try {
        return await data.call();
    } catch (error) {
        const retryResult = retryHelper.getRetryErrorResult({
            error: error,
            retryAttempt: data.retryAttempt,
            retryStrategy: data.retryStrategy
        });

        if (retryResult.canRetry) {
            httpDebugger.debugRetryHttpRequest();

            console.warn(`Attempt '${data.retryAttempt}': retrying in '${retryResult.retryInMs}ms'`);

            // wait time before retrying
            await new Promise((resolve) => setTimeout(resolve, retryResult.retryInMs));

            // retry request
            await runWithRetryAsync({
                call: data.call,
                retryStrategy: data.retryStrategy,
                retryAttempt: data.retryAttempt + 1,
                url: data.url
            });
        }

        console.error(`Executing '${data.url}' failed. Request was retried '${data.retryAttempt}' times. `, error);

        throw error;
    }
}
function getHeadersJson(headers: IHeader[], addContentTypeHeader: boolean): { [header: string]: string } {
    const headerJson: { [header: string]: string } = {};

    headers.forEach((header) => {
        headerJson[header.header] = header.value;
    });

    if (addContentTypeHeader) {
        // add default content type header if not present
        const contentTypeHeader = headers.find((m) => m.header.toLowerCase() === 'Content-Type'.toLowerCase());

        if (!contentTypeHeader) {
            headerJson['Content-Type'] = 'application/json';
        }
    }

    return headerJson;
}
