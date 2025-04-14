import type { Header, HttpMethod, RetryStrategyOptions } from '../models/core.models.js';
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
                return await executeFetchRequestAsync({
                    url,
                    method: 'GET',
                    body: null,
                    requestHeaders,
                    retryStrategyOptions
                });
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
                return await executeFetchRequestAsync({
                    url,
                    method: 'POST',
                    body,
                    requestHeaders,
                    retryStrategyOptions
                });
            },
            retryAttempt: 0,
            url,
            retryStrategyOptions,
            requestHeaders
        });
    }
};

async function executeFetchRequestAsync<TResponseData, TBodyData extends JsonValue>({
    url,
    method,
    body,
    requestHeaders,
    retryStrategyOptions
}: {
    readonly url: string;
    readonly method: HttpMethod;
    readonly body: TBodyData;
    readonly requestHeaders: readonly Header[];
    readonly retryStrategyOptions: Required<RetryStrategyOptions>;
}): Promise<HttpResponse<TResponseData, TBodyData>> {
    const response = await fetch(url, {
        headers: toFetchHeaders(requestHeaders),
        method: method,
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
}

function getRequestHeaders(headers: readonly Header[] | undefined): readonly Header[] {
    const allHeaders: readonly Header[] = [
        ...(headers ?? []),
        // add tracking header if not already present
        ...(headers?.find((header) => header.name === 'X-KC-SDKID') ? [] : [getSdkIdHeader(sdkInfo)])
    ];
    return allHeaders;
}
