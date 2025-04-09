import type { Header, RetryStrategyOptions } from '../models/core.models.js';
import { runWithRetryAsync, toRequiredRetryStrategyOptions } from '../utils/retry-helper.js';
import { type HttpQueryOptions, type HttpResponse, type HttpService, CoreSdkError } from './http.models.js';

export function getDefaultErrorMessage({
    url,
    retryAttempts,
    status
}: {
    readonly url: string;
    readonly retryAttempts: number;
    readonly status: number | undefined;
}): string {
    return `Failed to execute request '${url}' after '${retryAttempts}' attempts${
        status ? ` with status '${status}'` : ''
    }`;
}

export const defaultHttpService: HttpService = {
    getAsync: async <TResponseData>(url: string, options?: HttpQueryOptions): Promise<HttpResponse<TResponseData>> => {
        const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(
            options?.retryStrategy
        );

        return await runWithRetryAsync<TResponseData>({
            funcAsync: async () => {
                const response = await fetch(url);
                const headers = mapHeaders(response.headers);

                if (!response.ok) {
                    throw new CoreSdkError(
                        getDefaultErrorMessage({ url, retryAttempts: 0, status: response.status }),
                        undefined,
                        url,
                        0,
                        retryStrategyOptions,
                        headers,
                        response.status
                    );
                }

                return {
                    data: (await response.json()) as TResponseData,
                    responseHeaders: headers,
                    status: response.status
                };
            },
            retryAttempt: 1,
            url,
            retryStrategyOptions
        });
    }
};

function mapHeaders(headers: Headers): readonly Header[] {
    return Array.from(headers.entries()).map(([key, value]) => ({
        header: key,
        value: value
    }));
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
