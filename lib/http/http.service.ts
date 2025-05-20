import {
	type CommonHeaderNames,
	type Header,
	type HttpMethod,
	HttpServiceInvalidResponseError,
	HttpServiceParsingError,
	type KontentErrorResponseData,
	type RetryStrategyOptions,
} from '../models/core.models.js';
import type { JsonValue } from '../models/json.models.js';
import { sdkInfo } from '../sdk-info.js';
import { isNotUndefined } from '../utils/core.utils.js';
import { getSdkIdHeader, toFetchHeaders, toSdkHeaders } from '../utils/header.utils.js';
import { runWithRetryAsync, toRequiredRetryStrategyOptions } from '../utils/retry.utils.js';
import type { DownloadFileRequestOptions, ExecuteRequestOptions, HttpResponse, HttpService, UploadFileRequestOptions } from './http.models.js';

export const defaultHttpService: HttpService = {
	executeAsync: async <TResponseData extends JsonValue, TBodyData extends JsonValue>({
		url,
		method,
		body,
		options,
	}: ExecuteRequestOptions<TBodyData>): Promise<HttpResponse<TResponseData, TBodyData>> => {
		const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(options?.retryStrategy);
		const requestHeaders: readonly Header[] = getRequestHeaders(options?.requestHeaders, body);

		return await runWithRetryAsync<HttpResponse<TResponseData, TBodyData>>({
			funcAsync: async () => {
				return await fetchAsync({
					url,
					method: method,
					body,
					requestHeaders,
					resolveDataAsync: async (response) => {
						const contentTypeResponseHeader = toSdkHeaders(response.headers)
							.find((m) => m.name.toLowerCase() === ('Content-Type' satisfies CommonHeaderNames).toLowerCase())
							?.value?.toLowerCase();

						// Includes instead of equap due to the fact that the header value can be 'application/json; charset=utf-8' or similar
						if (contentTypeResponseHeader?.includes('application/json')) {
							return (await response.json()) as TResponseData;
						}

						return null as TResponseData;
					},
				});
			},
			retryAttempt: 0,
			url,
			retryStrategyOptions,
			requestHeaders,
			method,
		});
	},

	downloadFileAsync: async ({ url, options }: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>> => {
		const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(options?.retryStrategy);
		const requestHeaders: readonly Header[] = getRequestHeaders(options?.requestHeaders, null);
		const method: HttpMethod = 'GET';

		return await runWithRetryAsync<HttpResponse<Blob, null>>({
			funcAsync: async () => {
				return await fetchAsync({
					url,
					method: method,
					body: null,
					requestHeaders,
					resolveDataAsync: async (response) => await response.blob(),
				});
			},
			retryAttempt: 0,
			url,
			retryStrategyOptions,
			requestHeaders,
			method: method,
		});
	},

	uploadFileAsync: async <TResponseData extends JsonValue>({
		url,
		method,
		file,
		options,
	}: UploadFileRequestOptions): Promise<HttpResponse<TResponseData, Blob>> => {
		const retryStrategyOptions: Required<RetryStrategyOptions> = toRequiredRetryStrategyOptions(options?.retryStrategy);
		const requestHeaders: readonly Header[] = getRequestHeaders(options?.requestHeaders, file);

		return await runWithRetryAsync<HttpResponse<TResponseData, Blob>>({
			funcAsync: async () => {
				return await fetchAsync({
					url,
					method,
					body: file,
					requestHeaders,
					resolveDataAsync: async (response) => (await response.json()) as TResponseData,
				});
			},
			retryAttempt: 0,
			url,
			retryStrategyOptions,
			requestHeaders,
			method,
		});
	},
};

async function fetchAsync<TResponseData extends JsonValue | Blob, TBodyData extends JsonValue | Blob>({
	url,
	method,
	body,
	requestHeaders,
	resolveDataAsync,
}: {
	readonly url: string;
	readonly method: HttpMethod;
	readonly body: TBodyData;
	readonly requestHeaders: readonly Header[];
	readonly resolveDataAsync: (response: Response) => Promise<TResponseData>;
}): Promise<HttpResponse<TResponseData, TBodyData>> {
	const getRequestBody = (): string | Blob | null => {
		if (body === null) {
			return null;
		}

		if (body instanceof Blob) {
			return body;
		}

		try {
			return JSON.stringify(body);
		} catch (error) {
			throw new HttpServiceParsingError('Failed to stringify body of request.');
		}
	};

	const getUrl = (): URL => {
		try {
			return new URL(url);
		} catch (error) {
			throw new HttpServiceParsingError(`Failed to parse url '${url}'.`);
		}
	};

	const response = await fetch(getUrl().toString(), {
		headers: toFetchHeaders(requestHeaders),
		method: method,
		body: getRequestBody(),
	});

	const responseHeaders = toSdkHeaders(response.headers);

	if (!response.ok) {
		throw new HttpServiceInvalidResponseError({
			kontentErrorData: await getKontentErrorDataAsync(response),
			statusCode: response.status,
			statusText: response.statusText,
			responseHeaders: responseHeaders,
		});
	}

	return {
		data: await resolveDataAsync(response),
		body: body,
		method: method,
		responseHeaders: responseHeaders,
		status: response.status,
		requestHeaders: requestHeaders,
	};
}

async function getKontentErrorDataAsync(response: Response): Promise<KontentErrorResponseData | undefined> {
	const json = (await response.json()) as Partial<KontentErrorResponseData>;

	// We check the existence of 'message' property which should always be set when the error is a Kontent API error
	if (!json || !json.message) {
		return undefined;
	}

	return {
		...json,
		message: json.message,
	};
}

function getRequestHeaders(headers: readonly Header[] | undefined, body: Blob | JsonValue): readonly Header[] {
	const existingContentTypeHeader = headers?.find((header) => header.name.toLowerCase() === ('Content-Type' satisfies CommonHeaderNames).toLowerCase());
	const existingSdkVersionHeader = headers?.find((header) => header.name.toLowerCase() === ('X-KC-SDKID' satisfies CommonHeaderNames).toLowerCase());

	const contentTypeHeader: Header | undefined = existingContentTypeHeader
		? undefined
		: {
				name: 'Content-Type' satisfies CommonHeaderNames,
				value: body instanceof Blob ? body.type : 'application/json',
			};

	const sdkVersionHeader: Header | undefined = existingSdkVersionHeader
		? undefined
		: getSdkIdHeader({
				host: sdkInfo.host,
				name: sdkInfo.name,
				version: sdkInfo.version,
			});

	const contentLengthHeader: Header | undefined =
		body instanceof Blob
			? {
					name: 'Content-Length' satisfies CommonHeaderNames,
					value: body.size.toString(),
				}
			: undefined;

	return [...(headers ?? []), contentTypeHeader, contentLengthHeader, sdkVersionHeader].filter(isNotUndefined);
}
