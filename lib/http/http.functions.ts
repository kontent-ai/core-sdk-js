import axios, { AxiosInstance, Canceler, CancelToken } from 'axios';
import { extractHeadersFromAxiosResponse } from '../helpers/headers-helper';

import { httpDebugger } from './http.debugger';
import {
    IHttpCancelRequestToken,
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

export interface IHttpFunctionsConfig {
    logErrorsToConsole: boolean;
}

export async function getWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpGetQueryCall,
    functionsConfig: IHttpFunctionsConfig,
    options?: IHttpQueryOptions<CancelToken>
): Promise<IResponse<TRawData>> {
    const retryStrategyOptions = options?.retryStrategy ?? retryHelper.defaultRetryStrategy;

    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: retryStrategyOptions,
        functionsConfig: functionsConfig,
        call: async (retryAttempt) => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.get<TRawData>(call.url, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                cancelToken: options?.cancelToken?.token
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status,
                retryStrategy: {
                    options: retryStrategyOptions,
                    retryAttempts: retryAttempt
                }
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function postWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpPostQueryCall,
    functionsConfig: IHttpFunctionsConfig,
    options?: IHttpQueryOptions<CancelToken>
): Promise<IResponse<TRawData>> {
    const retryStrategyOptions = options?.retryStrategy ?? retryHelper.defaultRetryStrategy;

    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: retryStrategyOptions,
        functionsConfig: functionsConfig,
        call: async (retryAttempt) => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.post<TRawData>(call.url, call.body, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken?.token
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status,
                retryStrategy: {
                    options: retryStrategyOptions,
                    retryAttempts: retryAttempt
                }
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function putWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpPutQueryCall,
    functionsConfig: IHttpFunctionsConfig,
    options?: IHttpQueryOptions<CancelToken>
): Promise<IResponse<TRawData>> {
    const retryStrategyOptions = options?.retryStrategy ?? retryHelper.defaultRetryStrategy;

    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: retryStrategyOptions,
        functionsConfig: functionsConfig,
        call: async (retryAttempt) => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.put<TRawData>(call.url, call.body, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken?.token
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status,
                retryStrategy: {
                    options: retryStrategyOptions,
                    retryAttempts: retryAttempt
                }
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function patchWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpPatchQueryCall,
    functionsConfig: IHttpFunctionsConfig,
    options?: IHttpQueryOptions<CancelToken>
): Promise<IResponse<TRawData>> {
    const retryStrategyOptions = options?.retryStrategy ?? retryHelper.defaultRetryStrategy;

    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: retryStrategyOptions,
        functionsConfig: functionsConfig,
        call: async (retryAttempt) => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.patch<TRawData>(call.url, call.body, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken?.token
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status,
                retryStrategy: {
                    options: retryStrategyOptions,
                    retryAttempts: retryAttempt
                }
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function deleteWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpDeleteQueryCall,
    functionsConfig: IHttpFunctionsConfig,
    options?: IHttpQueryOptions<CancelToken>
): Promise<IResponse<TRawData>> {
    const retryStrategyOptions = options?.retryStrategy ?? retryHelper.defaultRetryStrategy;

    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: retryStrategyOptions,
        functionsConfig: functionsConfig,
        call: async (retryAttempt) => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.delete<TRawData>(call.url, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken?.token
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status,
                retryStrategy: {
                    options: retryStrategyOptions,
                    retryAttempts: retryAttempt
                }
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export function createCancelToken(): IHttpCancelRequestToken<CancelToken> {
    let canceler: Canceler;

    const token = new axios.CancelToken((c) => {
        // An executor function receives a cancel function as a parameter
        canceler = c;
    });

    return {
        cancel: (cancelMessage) =>
            canceler(`${retryHelper.requestCancelledMessagePrefix}: ${cancelMessage ?? 'User cancel'}`),
        token: token
    };
}

async function runWithRetryAsync<TRawData>(data: {
    url: string;
    retryAttempt: number;
    call: (retryAttempt: number) => Promise<IResponse<TRawData>>;
    retryStrategy: IRetryStrategyOptions;
    functionsConfig: IHttpFunctionsConfig;
}): Promise<IResponse<TRawData>> {
    try {
        return await data.call(data.retryAttempt);
    } catch (error) {
        const retryResult = retryHelper.getRetryErrorResult({
            error: error,
            retryAttempt: data.retryAttempt,
            retryStrategy: data.retryStrategy
        });

        if (retryResult.canRetry) {
            httpDebugger.debugRetryHttpRequest();

            // wait time before retrying
            await new Promise((resolve) => setTimeout(resolve, retryResult.retryInMs));

            // retry request
            console.warn(
                `Retry attempt '${data.retryAttempt + 1}' from a maximum of '${
                    retryResult.maxRetries
                }' retries. Request url: '${data.url}'`
            );

            return await runWithRetryAsync({
                call: data.call,
                retryStrategy: data.retryStrategy,
                retryAttempt: data.retryAttempt + 1,
                url: data.url,
                functionsConfig: data.functionsConfig
            });
        }

        if (data.functionsConfig.logErrorsToConsole) {
            console.error(`Executing '${data.url}' failed. Request was retried '${data.retryAttempt}' times. `, error);
        }

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
