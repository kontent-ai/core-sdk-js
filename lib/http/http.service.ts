import type { Header, HttpMethod, RetryStrategyOptions } from '../models/core.models.js';
import type { JsonValue } from '../models/json.models.js';
import { sdkInfo } from '../sdk.generated.js';
import { getDefaultErrorMessage } from '../utils/error.utils.js';
import { getSdkIdHeader, toFetchHeaders, toSdkHeaders } from '../utils/header.utils.js';
import { runWithRetryAsync, toRequiredRetryStrategyOptions } from '../utils/retry.utils.js';
import type { DownloadFileRequestOptions, ExecuteRequestOptions, UploadFileRequestOptions } from './http.models.js';
import { CoreSdkError, type HttpResponse, type HttpService } from './http.models.js';

export const defaultHttpService: HttpService = {
	executeAsync: async <TResponseData extends JsonValue, TBodyData extends JsonValue>({
		url,
		method,
		body,
		options,
	}: ExecuteRequestOptions<TBodyData>): Promise<HttpResponse<TResponseData, TBodyData>> => {
		const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(options?.retryStrategy);
		const requestHeaders: readonly Header[] = getRequestHeaders(options?.requestHeaders);

		return await runWithRetryAsync<HttpResponse<TResponseData, TBodyData>>({
			funcAsync: async () => {
				return await executeFetchRequestAsync({
					url,
					method: method,
					body,
					requestHeaders,
					retryStrategyOptions,
					resolveDataAsync: async (response) => (await response.json()) as TResponseData,
				});
			},
			retryAttempt: 0,
			url,
			retryStrategyOptions,
			requestHeaders,
		});
	},

	downloadFileAsync: async ({ url, options }: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>> => {
		const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(options?.retryStrategy);
		const requestHeaders: readonly Header[] = getRequestHeaders(options?.requestHeaders);

		return await runWithRetryAsync<HttpResponse<Blob, null>>({
			funcAsync: async () => {
				return await executeFetchRequestAsync({
					url,
					method: 'GET',
					body: null,
					requestHeaders,
					retryStrategyOptions,
					resolveDataAsync: async (response) => await response.blob(),
				});
			},
			retryAttempt: 0,
			url,
			retryStrategyOptions,
			requestHeaders,
		});
	},

	uploadFileAsync: async <TResponseData extends JsonValue>({
		url,
		method,
		file,
		options,
	}: UploadFileRequestOptions): Promise<HttpResponse<TResponseData, Blob>> => {
		const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(options?.retryStrategy);
		const requestHeaders: readonly Header[] = getRequestHeaders(options?.requestHeaders);

		return await runWithRetryAsync<HttpResponse<TResponseData, Blob>>({
			funcAsync: async () => {
				return await executeFetchRequestAsync({
					url,
					method,
					body: file,
					requestHeaders,
					retryStrategyOptions,
					resolveDataAsync: async (response) => (await response.json()) as TResponseData,
				});
			},
			retryAttempt: 0,
			url,
			retryStrategyOptions,
			requestHeaders,
		});
	},
};

async function executeFetchRequestAsync<TResponseData extends JsonValue | Blob, TBodyData extends JsonValue | Blob>({
	url,
	method,
	body,
	requestHeaders,
	retryStrategyOptions,
	resolveDataAsync,
}: {
	readonly url: string;
	readonly method: HttpMethod;
	readonly body: TBodyData;
	readonly requestHeaders: readonly Header[];
	readonly retryStrategyOptions: Required<RetryStrategyOptions>;
	readonly resolveDataAsync: (response: Response) => Promise<TResponseData>;
}): Promise<HttpResponse<TResponseData, TBodyData>> {
	const response = await fetch(url, {
		headers: toFetchHeaders(requestHeaders),
		method: method,
		body: body ? JSON.stringify(body) : undefined,
	});
	const headers = toSdkHeaders(response.headers);

	if (!response.ok) {
		throw new CoreSdkError(
			getDefaultErrorMessage({
				url,
				retryAttempts: 0,
				status: response.status,
				error: undefined,
			}),
			{
				originalError: undefined,
				url,
				retryAttempt: 0,
				retryStrategyOptions,
				responseHeaders: headers,
				status: response.status,
				requestHeaders,
			},
		);
	}

	return {
		data: await resolveDataAsync(response),
		body: body,
		method: method,
		responseHeaders: headers,
		status: response.status,
		requestHeaders,
	};
}

function getRequestHeaders(headers: readonly Header[] | undefined): readonly Header[] {
	const allHeaders: readonly Header[] = [
		...(headers ?? []),
		// add tracking header if not already present
		...(headers?.find((header) => header.name === 'X-KC-SDKID') ? [] : [getSdkIdHeader(sdkInfo)]),
	];
	return allHeaders;
}
