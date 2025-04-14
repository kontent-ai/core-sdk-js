import type { Header, RetryStrategyOptions } from '../models/core.models.js';
import type { JsonValue } from '../models/json.models.js';
import { sdkInfo } from '../sdk.generated.js';
import { getDefaultErrorMessage } from '../utils/error.utils.js';
import { getSdkIdHeader, toFetchHeaders, toSdkHeaders } from '../utils/header.utils.js';
import { runWithRetryAsync, toRequiredRetryStrategyOptions } from '../utils/retry.utils.js';
import { type HttpQueryOptions, type HttpResponse, type HttpService, CoreSdkError } from './http.models.js';

export const defaultHttpService: HttpService = {
    getAsync: async <TResponseData>(
        url: string,
        options?: HttpQueryOptions
    ): Promise<HttpResponse<TResponseData, null>> => {
        const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(
            options?.retryStrategy
        );
        const requestHeaders: readonly Header[] = getRequestHeaders(options?.requestHeaders);

        return await runWithRetryAsync<HttpResponse<TResponseData, null>>({
            funcAsync: async () => {
                const response = await fetch(url, {
                    headers: toFetchHeaders(requestHeaders)
                });
                const headers = toSdkHeaders(response.headers);

                if (!response.ok) {
                    throw new CoreSdkError(
                        getDefaultErrorMessage({ url, retryAttempts: 0, status: response.status }),
                        undefined,
                        url,
                        0,
                        retryStrategyOptions,
                        headers,
                        response.status,
                        requestHeaders
                    );
                }

                return {
                    data: (await response.json()) as TResponseData,
                    body: null,
                    responseHeaders: headers,
                    status: response.status,
                    requestHeaders
                };
            },
            retryAttempt: 0,
            url,
            retryStrategyOptions,
            requestHeaders
        });
    },
    postAsync: async <TResponseData, TBodyData extends JsonValue>(
        url: string,
        body: TBodyData,
        options?: HttpQueryOptions
    ): Promise<HttpResponse<TResponseData, TBodyData>> => {
        const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(
            options?.retryStrategy
        );
        const requestHeaders: readonly Header[] = getRequestHeaders(options?.requestHeaders);

        return await runWithRetryAsync<HttpResponse<TResponseData, TBodyData>>({
            funcAsync: async () => {
                const response = await fetch(url, {
                    headers: toFetchHeaders(requestHeaders),
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                const headers = toSdkHeaders(response.headers);

                if (!response.ok) {
                    throw new CoreSdkError(
                        getDefaultErrorMessage({ url, retryAttempts: 0, status: response.status }),
                        undefined,
                        url,
                        0,
                        retryStrategyOptions,
                        headers,
                        response.status,
                        requestHeaders
                    );
                }

                return {
                    data: (await response.json()) as TResponseData,
                    body: body,
                    responseHeaders: headers,
                    status: response.status,
                    requestHeaders
                };
            },
            retryAttempt: 0,
            url,
            retryStrategyOptions,
            requestHeaders
        });
    }
};

function getRequestHeaders(headers: readonly Header[] | undefined): readonly Header[] {
    const allHeaders: readonly Header[] = [
        ...(headers ?? []),
        // add tracking header if not already present
        ...(headers?.find((header) => header.name === 'X-KC-SDKID') ? [] : [getSdkIdHeader(sdkInfo)])
    ];
    return allHeaders;
}

// export class HttpService2 implements IHttpService<CancelToken> {
//     private readonly axiosInstance: AxiosInstance;

//     private readonly functionsConfig: IHttpFunctionsConfig;

//     constructor(
//         private opts?: {
//             axiosRequestConfig?: AxiosRequestConfig;
//             logErrorsToConsole?: boolean;
//         }
//     ) {
//         this.axiosInstance = axios.create(opts?.axiosRequestConfig);
//         this.functionsConfig = this.getFunctionsConfig();
//     }

//     async getAsync<TRawData>(
//         call: IHttpGetQueryCall,
//         options?: IHttpQueryOptions<CancelToken>
//     ): Promise<IResponse<TRawData>> {
//         return await HttpFunctions.getWithRetryAsync<TRawData>(this.axiosInstance, call, this.functionsConfig, options);
//     }

//     async postAsync<TRawData>(
//         call: IHttpPostQueryCall,
//         options?: IHttpQueryOptions<CancelToken>
//     ): Promise<IResponse<TRawData>> {
//         return await HttpFunctions.postWithRetryAsync<TRawData>(
//             this.axiosInstance,
//             call,
//             this.functionsConfig,
//             options
//         );
//     }

//     async putAsync<TRawData>(
//         call: IHttpPutQueryCall,
//         options?: IHttpQueryOptions<CancelToken>
//     ): Promise<IResponse<TRawData>> {
//         return await HttpFunctions.putWithRetryAsync<TRawData>(this.axiosInstance, call, this.functionsConfig, options);
//     }

//     async patchAsync<TRawData>(
//         call: IHttpPatchQueryCall,
//         options?: IHttpQueryOptions<CancelToken>
//     ): Promise<IResponse<TRawData>> {
//         return await HttpFunctions.patchWithRetryAsync<TRawData>(
//             this.axiosInstance,
//             call,
//             this.functionsConfig,
//             options
//         );
//     }

//     async deleteAsync<TRawData>(
//         call: IHttpDeleteQueryCall,
//         options?: IHttpQueryOptions<CancelToken>
//     ): Promise<IResponse<TRawData>> {
//         return await HttpFunctions.deleteWithRetryAsync<TRawData>(
//             this.axiosInstance,
//             call,
//             this.functionsConfig,
//             options
//         );
//     }

//     createCancelToken(): IHttpCancelRequestToken<CancelToken> {
//         return HttpFunctions.createCancelToken();
//     }

//     private getFunctionsConfig(): IHttpFunctionsConfig {
//         return {
//             logErrorsToConsole: this.opts?.logErrorsToConsole ?? true
//         };
//     }
// }
